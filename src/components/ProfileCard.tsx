import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  description: string;
}

interface ProfileCardProps {
  profile: Profile;
  onOpen: (profile: Profile) => void;
  onDelete: (profileId: string) => void;
}

export function ProfileCard({ profile, onOpen, onDelete }: ProfileCardProps) {
  // Safely generate initials with fallback for undefined/null name
  const initials = profile.name
    ? profile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';
  
  // Provide fallback values
  const displayName = profile.name || 'Unnamed Profile';
  const displayDescription = profile.description || 'No description';

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-14 w-14 border-2 border-gray-100 dark:border-gray-800 shadow-sm">
              <AvatarImage src={profile.avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{displayName}</CardTitle>
              <CardDescription className="text-sm mt-1 line-clamp-2">{displayDescription}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(profile.id);
            }}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={() => onOpen(profile)} 
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
        >
          Open Profile
        </Button>
      </CardContent>
    </Card>
  );
}