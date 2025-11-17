import { ProfileCard } from './ProfileCard';
import { CreateProfileDialog } from './CreateProfileDialog';
import { Alert, AlertDescription } from './ui/alert';
import { InfoIcon } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  description: string;
}

interface DashboardProps {
  profiles: Profile[];
  onCreateProfile: (name: string, avatar: string, description: string) => Promise<void>;
  onOpenProfile: (profile: Profile) => void;
  onDeleteProfile: (profileId: string) => void;
}

export function Dashboard({ profiles, onCreateProfile, onOpenProfile, onDeleteProfile }: DashboardProps) {
  const canCreateMore = profiles.length < 5;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 dark:text-white mb-2">My Profiles</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage up to 5 profiles to organize notes and discover insights
          </p>
        </div>
        <CreateProfileDialog onCreateProfile={onCreateProfile} disabled={!canCreateMore} />
      </div>

      {!canCreateMore && (
        <Alert className="mb-6 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-900">
          <InfoIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <AlertDescription className="text-indigo-700 dark:text-indigo-400">
            You've reached the maximum of 5 profiles. Delete a profile to create a new one.
          </AlertDescription>
        </Alert>
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/30 dark:to-purple-950/30 mb-6">
            <svg
              className="w-10 h-10 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-gray-900 dark:text-white mb-2">No profiles yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Create your first profile to get started with organizing notes and generating vector embeddings
          </p>
          <CreateProfileDialog onCreateProfile={onCreateProfile} disabled={!canCreateMore} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onOpen={onOpenProfile}
              onDelete={onDeleteProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}