import { LayoutDashboard, Settings, Moon, Sun, LogOut, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  currentPage: 'dashboard' | 'settings' | 'visualize';
  onNavigate: (page: 'dashboard' | 'settings' | 'visualize') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, darkMode, onToggleDarkMode, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'visualize', icon: BarChart3, label: 'Visualize Data' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <div className="h-screen w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-gray-900 dark:text-white">GiftNote</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={currentPage === item.id ? 'secondary' : 'ghost'}
            className={`w-full justify-start h-11 ${
              currentPage === item.id 
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-900'
            }`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start h-11 hover:bg-gray-100 dark:hover:bg-slate-900"
          onClick={onToggleDarkMode}
        >
          {darkMode ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-11 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={onLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}