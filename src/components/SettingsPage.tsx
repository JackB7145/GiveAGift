import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userEmail?: string;
  userName?: string;
}

export function SettingsPage({ darkMode, onToggleDarkMode, userEmail, userName }: SettingsPageProps) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account preferences and application settings
        </p>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">Name</Label>
              <p className="mt-1 text-gray-900 dark:text-white">{userName || 'Not set'}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">Email</Label>
              <p className="mt-1 text-gray-900 dark:text-white">{userEmail || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Dark Mode</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use dark theme across the application
                </p>
              </div>
              <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">Version</Label>
              <p className="mt-1 text-gray-900 dark:text-white">1.0.0</p>
            </div>
            <Separator />
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">Features</Label>
              <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Manage up to 5 profiles
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Organize notes with categories
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Automatic vector embeddings
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  ChatGPT API integration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Dark mode support
                </li>
              </ul>
            </div>
            <Separator />
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">ChatGPT Integration</Label>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                This app exposes your notes via API so ChatGPT can query them and provide personalized recommendations.
                See the CHATGPT_INTEGRATION.md documentation for details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}