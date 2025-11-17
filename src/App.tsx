import { useState, useEffect } from 'react';
import { createClient } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NotesPage } from './components/NotesPage';
import { SettingsPage } from './components/SettingsPage';
import { VisualizePage } from './components/VisualizePage';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  description: string;
}

type Page = 'dashboard' | 'settings' | 'visualize';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    checkSession();
    
    // Apply dark mode class
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const checkSession = async () => {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token);
        await loadProfiles(session.access_token);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        setUser(data.session.user);
        setAccessToken(data.session.access_token);
        await loadProfiles(data.session.access_token);
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Failed to login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Failed to sign up');
        return;
      }

      // Now login
      await handleLogin(email, password);
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Signup error:', error);
      setAuthError(error.message || 'Failed to sign up');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const supabase = createClient();
      
      // Do not forget to complete setup at https://supabase.com/docs/guides/auth/social-login/auth-google for Google
      // or https://supabase.com/docs/guides/auth/social-login/auth-apple for Apple
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error(`${provider} login error:`, error);
        setAuthError(`Failed to sign in with ${provider}. Make sure the provider is enabled in your Supabase project settings.`);
        toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured yet. Please check the console for setup instructions.`);
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      setAuthError(error.message || `Failed to sign in with ${provider}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken('');
      setProfiles([]);
      setSelectedProfile(null);
      setCurrentPage('dashboard');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const loadProfiles = async (token: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setProfiles(data.profiles || []);
      } else {
        console.error('Failed to load profiles:', data.error);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const handleCreateProfile = async (name: string, avatar: string, description: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, avatar, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }

      setProfiles([...profiles, data.profile]);
      toast.success(`Profile "${name}" created successfully!`);
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      toast.error(error.message || 'Failed to create profile');
      throw error;
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? All notes will be lost.')) {
      return;
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-db41cb13/profiles/${profileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      setProfiles(profiles.filter(p => p.id !== profileId));
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
      }
      toast.success('Profile deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete profile:', error);
      toast.error(error.message || 'Failed to delete profile');
    }
  };

  const handleOpenProfile = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleBackFromNotes = () => {
    setSelectedProfile(null);
    loadProfiles(accessToken); // Reload profiles in case they were updated
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSelectedProfile(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading GiftNote...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage
          onLogin={handleLogin}
          onSignup={handleSignup}
          onSocialLogin={handleSocialLogin}
          loading={authLoading}
          error={authError}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        currentPage={selectedProfile ? 'dashboard' : currentPage}
        onNavigate={handleNavigate}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto">
        {selectedProfile ? (
          <NotesPage
            profile={selectedProfile}
            onBack={handleBackFromNotes}
            accessToken={accessToken}
          />
        ) : currentPage === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            onCreateProfile={handleCreateProfile}
            onOpenProfile={handleOpenProfile}
            onDeleteProfile={handleDeleteProfile}
          />
        ) : currentPage === 'visualize' ? (
          <VisualizePage
            accessToken={accessToken}
            profiles={profiles}
          />
        ) : (
          <SettingsPage
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            userEmail={user?.email}
            userName={user?.user_metadata?.name}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}