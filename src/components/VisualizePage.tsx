import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { RefreshCw } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { Label } from './ui/label';

interface Profile {
  id: string;
  name: string;
  description: string;
}

interface Note {
  id: string;
  entry: string;
  embedding: number[];
  categoryId: string;
  profileId: string;
}

interface Category {
  id: string;
  name: string;
}

interface VisualizePageProps {
  accessToken: string;
  profiles: Profile[];
}

export function VisualizePage({ accessToken, profiles }: VisualizePageProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProfile) {
      loadProfileData(selectedProfile);
    }
  }, [selectedProfile]);

  const loadProfileData = async (profileId: string) => {
    try {
      setLoading(true);
      const [notesRes, catsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profileId}/notes`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profileId}/categories`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const notesData = await notesRes.json();
      const catsData = await catsRes.json();

      setNotes(notesData.notes || []);
      setCategories(catsData.categories || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  // Calculate embedding statistics
  const getEmbeddingStats = (embedding: number[]) => {
    const sum = embedding.reduce((a, b) => a + b, 0);
    const mean = sum / embedding.length;
    const variance = embedding.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / embedding.length;
    const stdDev = Math.sqrt(variance);
    const max = Math.max(...embedding);
    const min = Math.min(...embedding);
    
    return { mean, stdDev, max, min, sparsity: (embedding.filter(v => v === 0).length / embedding.length * 100).toFixed(1) };
  };

  // Visualize embedding as a bar chart
  const renderEmbeddingVisualization = (embedding: number[], noteEntry: string) => {
    const maxVal = Math.max(...embedding.map(Math.abs));
    const step = Math.ceil(embedding.length / 64); // Show every Nth value for readability
    const sampledEmbedding = embedding.filter((_, idx) => idx % step === 0);

    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{noteEntry}</p>
        <div className="flex items-end gap-0.5 h-20">
          {sampledEmbedding.map((val, idx) => {
            const height = Math.abs(val) / maxVal * 100;
            const color = val >= 0 ? 'bg-blue-500' : 'bg-red-500';
            return (
              <div
                key={idx}
                className={`flex-1 ${color} rounded-t`}
                style={{ height: `${height}%` }}
                title={`Dimension ${idx * step}: ${val.toFixed(4)}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Calculate similarity matrix between all notes
  const calculateSimilarityMatrix = () => {
    const matrix: number[][] = [];
    notes.forEach((note1, i) => {
      matrix[i] = [];
      notes.forEach((note2, j) => {
        if (note1.embedding && note2.embedding) {
          matrix[i][j] = cosineSimilarity(note1.embedding, note2.embedding);
        } else {
          matrix[i][j] = 0;
        }
      });
    });
    return matrix;
  };

  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
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
  };

  const similarityMatrix = notes.length > 0 ? calculateSimilarityMatrix() : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-gray-900 dark:text-white mb-2">Vector Embeddings Visualization</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore and visualize the vector embeddings of your notes
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center p-6 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex-1">
          <Label className="mb-2 block text-gray-700 dark:text-gray-300">Select Profile</Label>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select a profile to visualize" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProfileData(selectedProfile)}
            disabled={loading}
            className="gap-2 h-11 mt-7"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {!selectedProfile && (
        <div className="text-center py-20 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/30 dark:to-purple-950/30 mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Select a profile to view vector embeddings visualization
          </p>
        </div>
      )}

      {selectedProfile && notes.length === 0 && !loading && (
        <div className="text-center py-20 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            No notes found for this profile. Add some notes first!
          </p>
        </div>
      )}

      {selectedProfile && notes.length > 0 && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>Overall statistics for all embeddings in this profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Notes</p>
                  <p className="text-3xl text-indigo-600 dark:text-indigo-400">{notes.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Embedding Dimensions</p>
                  <p className="text-3xl text-blue-600 dark:text-blue-400">{notes[0]?.embedding?.length || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Categories</p>
                  <p className="text-3xl text-purple-600 dark:text-purple-400">{categories.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Sparsity</p>
                  <p className="text-3xl text-emerald-600 dark:text-emerald-400">
                    {(notes.reduce((sum, note) => {
                      if (!note.embedding) return sum;
                      return sum + (note.embedding.filter(v => v === 0).length / note.embedding.length);
                    }, 0) / notes.length * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Note Embeddings */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Individual Note Embeddings</CardTitle>
              <CardDescription>Visual representation of each note's vector embedding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notes.map((note) => {
                if (!note.embedding || note.embedding.length === 0) return null;
                const stats = getEmbeddingStats(note.embedding);
                
                return (
                  <div key={note.id} className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950">
                    <div className="mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                            Category: {getCategoryName(note.categoryId)}
                          </p>
                          {renderEmbeddingVisualization(note.embedding, note.entry)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 text-xs text-gray-600 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="p-2 rounded bg-gray-100 dark:bg-slate-900">
                        <span className="opacity-70 block mb-1">Mean</span>
                        <span className="text-gray-900 dark:text-white">{stats.mean.toFixed(4)}</span>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-slate-900">
                        <span className="opacity-70 block mb-1">Std Dev</span>
                        <span className="text-gray-900 dark:text-white">{stats.stdDev.toFixed(4)}</span>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-slate-900">
                        <span className="opacity-70 block mb-1">Max</span>
                        <span className="text-gray-900 dark:text-white">{stats.max.toFixed(4)}</span>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-slate-900">
                        <span className="opacity-70 block mb-1">Min</span>
                        <span className="text-gray-900 dark:text-white">{stats.min.toFixed(4)}</span>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-slate-900">
                        <span className="opacity-70 block mb-1">Sparsity</span>
                        <span className="text-gray-900 dark:text-white">{stats.sparsity}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Similarity Matrix */}
          {notes.length > 1 && (
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle>Note Similarity Matrix</CardTitle>
                <CardDescription>
                  Cosine similarity between all pairs of notes (1.0 = identical, 0.0 = completely different)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="flex gap-1">
                      <div className="w-32 flex-shrink-0"></div>
                      {notes.map((note, idx) => (
                        <div key={idx} className="w-20 text-xs text-center truncate flex-shrink-0 text-gray-600 dark:text-gray-400">
                          Note {idx + 1}
                        </div>
                      ))}
                    </div>
                    {notes.map((note1, i) => (
                      <div key={i} className="flex gap-1 mt-1">
                        <div className="w-32 text-xs truncate flex-shrink-0 pr-2 text-gray-600 dark:text-gray-400" title={note1.entry}>
                          Note {i + 1}
                        </div>
                        {notes.map((note2, j) => {
                          const similarity = similarityMatrix[i][j];
                          const intensity = Math.round(similarity * 255);
                          const bgColor = i === j 
                            ? 'bg-gray-300 dark:bg-gray-700' 
                            : `rgb(${255 - intensity}, ${255 - intensity / 2}, 255)`;
                          
                          return (
                            <div
                              key={j}
                              className="w-20 h-12 flex items-center justify-center text-xs rounded-lg flex-shrink-0 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
                              style={{ backgroundColor: i === j ? undefined : bgColor }}
                              title={`Similarity: ${similarity.toFixed(3)}`}
                            >
                              {similarity.toFixed(2)}
                            </div>
                          );
                        })}</div>
                    ))}</div>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900">
                  <p className="text-sm text-indigo-700 dark:text-indigo-400">
                    💡 Darker blue indicates higher similarity. Diagonal cells show each note compared to itself (always 1.0).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}