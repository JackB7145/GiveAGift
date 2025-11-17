import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// ---- Gemini embedding client ----
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Embedding generation will fail.");
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
// text-embedding-004 (or embedding-001 depending on your account)
const embeddingModel = genAI
  ? genAI.getGenerativeModel({ model: "text-embedding-004" })
  : null;

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// Health check endpoint
app.get("/make-server-db41cb13/health", (c) => {
  return c.json({
    status: "ok",
  });
});

// Sign up endpoint
app.post("/make-server-db41cb13/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json(
        {
          error: error.message,
        },
        400
      );
    }

    return c.json({
      user: data.user,
    });
  } catch (error) {
    console.log(`Unexpected error in signup endpoint: ${error}`);
    return c.json(
      {
        error: "Failed to sign up user",
      },
      500
    );
  }
});

// Get all profiles for a user
app.get("/make-server-db41cb13/profiles", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const allItems = await kv.getByPrefix(`user:${user.id}:profile:`);

    // Filter to only include actual profile objects (which have 'name' and 'description' fields)
    const profiles = allItems.filter(
      (item: any) =>
        item.name && item.description && !item.categoryName && !item.entry
    );

    return c.json({
      profiles: profiles || [],
    });
  } catch (error) {
    console.log(`Error fetching profiles: ${error}`);
    return c.json(
      {
        error: "Failed to fetch profiles",
      },
      500
    );
  }
});

// Create a new profile
app.post("/make-server-db41cb13/profiles", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    // Check if user already has 5 profiles
    const allItems = await kv.getByPrefix(`user:${user.id}:profile:`);
    const existingProfiles = allItems.filter(
      (item: any) =>
        item.name && item.description && !item.categoryName && !item.entry
    );

    if (existingProfiles && existingProfiles.length >= 5) {
      return c.json(
        {
          error: "Maximum 5 profiles allowed",
        },
        400
      );
    }

    const { name, avatar, description } = await c.req.json();

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return c.json(
        {
          error: "Profile name is required",
        },
        400
      );
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.trim() === ""
    ) {
      return c.json(
        {
          error: "Profile description is required",
        },
        400
      );
    }

    const profileId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const profile = {
      id: profileId,
      name: name.trim(),
      avatar: avatar || "",
      description: description.trim(),
      userId: user.id,
      createdAt,
    };

    // Original KV storage (keeps frontend working as-is)
    await kv.set(`user:${user.id}:profile:${profileId}`, profile);

    // NEW: also store in Postgres "profiles" for ChatGPT to read by name later
    await supabase.from("profiles").upsert({
      id: profileId,
      user_id: user.id,
      name: profile.name,
      avatar: profile.avatar,
      description: profile.description,
      created_at: createdAt,
    });

    return c.json({
      profile,
    });
  } catch (error) {
    console.log(`Error creating profile: ${error}`);
    return c.json(
      {
        error: "Failed to create profile",
      },
      500
    );
  }
});

// Delete a profile
app.delete("/make-server-db41cb13/profiles/:profileId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const profileId = c.req.param("profileId");

    // Delete all notes and categories for this profile from KV
    const notes = await kv.getByPrefix(
      `user:${user.id}:profile:${profileId}:note:`
    );
    const categories = await kv.getByPrefix(
      `user:${user.id}:profile:${profileId}:category:`
    );

    const keysToDelete = [
      `user:${user.id}:profile:${profileId}`,
      ...notes.map(
        (n: any) => `user:${user.id}:profile:${profileId}:note:${n.id}`
      ),
      ...categories.map(
        (cat: any) => `user:${user.id}:profile:${profileId}:category:${cat.id}`
      ),
    ];

    await kv.mdel(keysToDelete);

    // NEW: delete from Postgres as well so ChatGPT memory stays in sync
    await supabase
      .from("memory_items")
      .delete()
      .eq("user_id", user.id)
      .eq("profile_id", profileId);

    await supabase
      .from("profiles")
      .delete()
      .eq("user_id", user.id)
      .eq("id", profileId);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.log(`Error deleting profile: ${error}`);
    return c.json(
      {
        error: "Failed to delete profile",
      },
      500
    );
  }
});

// Get categories for a profile
app.get("/make-server-db41cb13/profiles/:profileId/categories", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const profileId = c.req.param("profileId");
    const categories = await kv.getByPrefix(
      `user:${user.id}:profile:${profileId}:category:`
    );

    return c.json({
      categories: categories || [],
    });
  } catch (error) {
    console.log(`Error fetching categories: ${error}`);
    return c.json(
      {
        error: "Failed to fetch categories",
      },
      500
    );
  }
});

// Get notes for a profile
app.get("/make-server-db41cb13/profiles/:profileId/notes", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const profileId = c.req.param("profileId");
    const notes = await kv.getByPrefix(
      `user:${user.id}:profile:${profileId}:note:`
    );

    return c.json({
      notes: notes || [],
    });
  } catch (error) {
    console.log(`Error fetching notes: ${error}`);
    return c.json(
      {
        error: "Failed to fetch notes",
      },
      500
    );
  }
});

// Submit notes and categories (batch save with vector generation)
app.post("/make-server-db41cb13/profiles/:profileId/submit", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const profileId = c.req.param("profileId");
    const { categories, notes } = await c.req.json();

    // ---- NEW: look up profile.name from Postgres for ChatGPT memory rows ----
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .eq("id", profileId)
      .maybeSingle();

    const profileNameForMemory: string | null = profileRow?.name ?? null;

    // Save categories in KV (same as before)
    const categoryPromises = (categories || []).map((category: any) => {
      const categoryId = category.id || crypto.randomUUID();

      return kv.set(
        `user:${user.id}:profile:${profileId}:category:${categoryId}`,
        {
          id: categoryId,
          name: category.name,
          profileId,
          userId: user.id,
          createdAt: category.createdAt || new Date().toISOString(),
        }
      );
    });

    // Save notes in KV + Postgres (with embeddings + profile_name)
    const notePromises = (notes || []).map(async (note: any) => {
      const noteId = note.id || crypto.randomUUID();
      const textContent = note.entry || "";

      // Generate embedding with Gemini
      const embedding = await generateSimpleEmbedding(textContent);

      const createdAt = note.createdAt || new Date().toISOString();
      const updatedAt = new Date().toISOString();

      // Original KV storage (keeps app behaviour)
      await kv.set(
        `user:${user.id}:profile:${profileId}:note:${noteId}`,
        {
          id: noteId,
          entry: note.entry,
          categoryId: note.categoryId,
          profileId,
          userId: user.id,
          embedding,
          createdAt,
          updatedAt,
        }
      );

      // NEW: also write row into memory_items for ChatGPT RAG by profile.name
      await supabase.from("memory_items").upsert({
        id: noteId,
        user_id: user.id,
        profile_id: profileId,
        profile_name: profileNameForMemory, // <-- this is profile.name
        entry: note.entry,
        embedding, // pgvector column
        created_at: createdAt,
        updated_at: updatedAt,
      });
    });

    await Promise.all([...categoryPromises, ...notePromises]);

    return c.json({
      success: true,
      message: "Notes and categories saved with vector embeddings",
    });
  } catch (error) {
    console.log(`Error submitting notes: ${error}`);
    console.log(
      `Error stack: ${error instanceof Error ? error.stack : "No stack trace"}`
    );
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit notes",
      },
      500
    );
  }
});

// Delete a note
app.delete(
  "/make-server-db41cb13/profiles/:profileId/notes/:noteId",
  async (c) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (!user || authError) {
        return c.json(
          {
            error: "Unauthorized",
          },
          401
        );
      }

      const profileId = c.req.param("profileId");
      const noteId = c.req.param("noteId");

      // Delete from KV
      await kv.del(`user:${user.id}:profile:${profileId}:note:${noteId}`);

      // Delete from memory_items so ChatGPT doesn't see stale rows
      await supabase
        .from("memory_items")
        .delete()
        .eq("user_id", user.id)
        .eq("profile_id", profileId)
        .eq("id", noteId);

      return c.json({
        success: true,
      });
    } catch (error) {
      console.log(`Error deleting note: ${error}`);
      return c.json(
        {
          error: "Failed to delete note",
        },
        500
      );
    }
  }
);

// Search for gift ideas using vector similarity (ChatGPT accessible endpoint)
app.post("/make-server-db41cb13/search-gifts", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Accept BOTH:
    // - profileId (UUID)
    // - profileName (string)
    const { query, profileId, profileName } = await c.req.json();

    if (!query || typeof query !== "string") {
      return c.json({ error: "Query string is required" }, 400);
    }

    // If profileName is provided, resolve it to a UUID
    let resolvedProfileId = profileId;

    if (!resolvedProfileId && profileName) {
      const allProfiles = await kv.getByPrefix(`user:${user.id}:profile:`);
      const profiles = allProfiles.filter(
        (item: any) =>
          item.name &&
          item.name.toLowerCase().trim() === profileName.toLowerCase().trim()
      );

      if (profiles.length === 0) {
        return c.json(
          { error: `No profile found with name '${profileName}'` },
          404
        );
      }

      // If multiple match (shouldn't happen), use first
      resolvedProfileId = profiles[0].id;
    }

    // Generate embedding for the query
    const queryEmbedding = await generateSimpleEmbedding(query);

    // Determine KV prefix based on resolved profile
    let prefix = `user:${user.id}:profile:`;

    if (resolvedProfileId) {
      prefix = `user:${user.id}:profile:${resolvedProfileId}:note:`;
    }

    // Load notes
    const allNotes = await kv.getByPrefix(prefix);
    const notes = allNotes.filter((item: any) => item.entry !== undefined);

    if (notes.length === 0) {
      return c.json({
        gifts: [],
        matchedNotes: [],
        message: "No notes found. Please add notes to profiles first.",
      });
    }

    // Calculate similarity
    const scoredNotes = notes
      .map((note: any) => ({
        ...note,
        similarity: cosineSimilarity(queryEmbedding, note.embedding || []),
      }))
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 10);

    const relevantData = scoredNotes.map((note: any) => ({
      noteId: note.id,
      entry: note.entry,
      profileId: note.profileId,
      relevanceScore: (note.similarity * 100).toFixed(2) + "%",
      amazonSearchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(
        note.entry
      )}`,
    }));

    return c.json({
      query,
      usedProfile: resolvedProfileId ?? "all-profiles",
      totalNotesSearched: notes.length,
      relevantNotes: relevantData,
      message:
        "Use the matched notes to suggest relevant gift products to the user.",
    });
  } catch (error) {
    console.log(`Error searching for gifts: ${error}`);
    return c.json({ error: "Failed to search for gifts" }, 500);
  }
});

// Helper function to generate embeddings using Gemini
async function generateSimpleEmbedding(text: string) {
  if (!embeddingModel) {
    throw new Error("Gemini embedding model is not initialized.");
  }

  const clean = (text ?? "").toString();
  if (!clean.trim()) {
    // Return a zero vector if text is empty
    // This keeps cosineSimilarity from blowing up on empty input
    return new Array(768).fill(0);
  }

  const result = await embeddingModel.embedContent(clean);
  // result.embedding.values is an array<number>
  return result.embedding.values || [];
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

Deno.serve(app.fetch);
