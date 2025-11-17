import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
}

interface Note {
  id: string;
  entry: string;
  categoryId: string;
}

interface NotesPageProps {
  profile: Profile;
  onBack: () => void;
  accessToken: string;
}

export function NotesPage({ profile, onBack, accessToken }: NotesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, notesRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profile.id}/categories`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profile.id}/notes`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const categoriesData = await categoriesRes.json();
      const notesData = await notesRes.json();

      setCategories(categoriesData.categories || []);
      setNotes(notesData.notes || []);

      if (categoriesData.categories?.length > 0 && !activeCategory) {
        setActiveCategory(categoriesData.categories[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load notes and categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory = {
      id: crypto.randomUUID(),
      name: newCategoryName,
    };
    
    setCategories([...categories, newCategory]);
    setActiveCategory(newCategory.id);
    setNewCategoryName('');
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(categories.filter(c => c.id !== categoryId));
    setNotes(notes.filter(n => n.categoryId !== categoryId));
    if (activeCategory === categoryId && categories.length > 0) {
      setActiveCategory(categories[0].id);
    }
  };

  const addNote = () => {
    if (!activeCategory) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      entry: '',
      categoryId: activeCategory,
    };
    
    setNotes([...notes, newNote]);
  };

  const updateNote = (noteId: string, field: 'entry', value: string) => {
    setNotes(notes.map(note => 
      note.id === noteId ? { ...note, [field]: value } : note
    ));
  };

  const deleteNote = async (noteId: string) => {
    try {
      // Try to delete from server if it exists
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profile.id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.log('Note may not exist on server yet:', error);
    }
    
    setNotes(notes.filter(n => n.id !== noteId));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profile.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ categories, notes }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Submit error response:', data);
        throw new Error(data.error || 'Failed to save');
      }

      toast.success('Notes saved and converted to vector embeddings!');
    } catch (error: any) {
      console.error('Failed to submit:', error);
      toast.error(error.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const categoryNotes = notes.filter(n => n.categoryId === activeCategory);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-500"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-800 px-8 py-5 flex items-center justify-between bg-white dark:bg-slate-950 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
          <div>
            <h1 className="text-gray-900 dark:text-white">{profile.name}'s Notes</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.description}</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={saving} 
          className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Submit & Generate Embeddings'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 p-6 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <Label className="mb-3 block text-gray-700 dark:text-gray-300">Create New Category</Label>
            <div className="flex gap-3">
              <Input
                placeholder="Enter category name (e.g., Favorite Colors, Hobbies)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                className="flex-1"
              />
              <Button onClick={addCategory} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/30 dark:to-purple-950/30 mb-4">
                <Plus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No categories yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Create a category above to start organizing your notes
              </p>
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <div className="mb-6">
                <TabsList className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 p-1">
                  {categories.map((category) => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id} 
                      className="relative group data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-950/30 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400"
                    >
                      {category.name}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCategory(category.id);
                        }}
                        className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id} className="space-y-4">
                  <div className="flex justify-between items-center mb-4 p-4 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-gray-900 dark:text-white">{category.name} Entries</h3>
                    <Button onClick={addNote} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4" />
                      Add Entry
                    </Button>
                  </div>

                  {categoryNotes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-950">
                      <p className="text-gray-600 dark:text-gray-400">
                        No entries yet. Click "Add Entry" to create one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryNotes.map((note) => (
                        <Card key={note.id} className="shadow-sm border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                          <CardHeader className="flex flex-row items-start justify-between space-y-0">
                            <div className="flex-1 space-y-4">
                              <div className="space-y-2">
                                <Label>Entry</Label>
                                <Textarea
                                  placeholder="Add details... (e.g., Blue, Red, Green)"
                                  value={note.entry}
                                  onChange={(e) => updateNote(note.id, 'entry', e.target.value)}
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(note.id)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 ml-4"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}