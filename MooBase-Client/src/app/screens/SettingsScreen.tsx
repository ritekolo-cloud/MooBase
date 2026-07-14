import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Database,
  Globe,
  Download,
  Trash2,
  LogOut,
  Shield,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { toast } from 'sonner';

export function SettingsScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState(storage.getUser());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(storage.getUser());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleBackup = () => {
    const data = {
      cattle: storage.getCattle(),
      records: storage.getRecords(),
      syncQueue: storage.getSyncQueue(),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moobase-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Backup created successfully!');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      toast.success('All data cleared');
      navigate('/login');
    }
  };

  const handleLogout = () => {
    storage.clearUser();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const storageUsed = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile',
          value: user?.name || user?.username || 'Guest',
          onClick: () => navigate('/profile'),
        },
        {
          icon: Shield,
          label: 'Role',
          value: user?.role === 'manager' ? 'Administrator' : 'Farm Attendant',
          badge: user?.role === 'manager' ? 'Admin' : 'User',
          onClick: null as any,
        },
        {
          icon: KeyRound,
          label: 'Change Password',
          value: 'Update your account password',
          onClick: () => navigate('/settings/change-password'),
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Database,
          label: 'Sync Status',
          value: `${storageUsed()} KB used`,
          onClick: () => navigate('/sync'),
        },
        {
          icon: Download,
          label: 'Backup Data',
          value: 'Export all data as JSON',
          onClick: handleBackup,
        },
        {
          icon: Trash2,
          label: 'Clear Local Data',
          value: 'Delete all local records',
          onClick: handleClearData,
          danger: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Globe,
          label: 'Language',
          value: 'English (Coming Soon)',
          onClick: null as any,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => {
            if (user?.role === 'manager') {
              navigate('/manager/dashboard');
            } else {
              navigate('/attendant/dashboard');
            }
          }}
          className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out md:hidden"
        >
          <ArrowLeft className="w-[20px] h-[20px]" />
        </button>
        <h1 className="text-lg font-bold text-foreground tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full space-y-6">
        {/* User Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-card border border-border rounded-lg p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-[44px] h-[44px] bg-muted border border-border rounded-lg flex items-center justify-center text-base font-bold text-foreground flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{user?.name || user?.username || 'Guest User'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.username || 'No email set'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded capitalize">
                {user?.role || 'unknown'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Settings Groups */}
        <div className="space-y-6">
          {settingsGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 * (groupIndex + 1) }}
              className="space-y-2"
            >
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {group.title}
              </h2>
              <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden divide-y divide-border">
                {group.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={itemIndex}
                      onClick={item.onClick || undefined}
                      disabled={!item.onClick}
                      className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors duration-150 ease-out disabled:cursor-default ${
                        item.onClick ? 'hover:bg-muted/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${(item as any).danger ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${(item as any).danger ? 'text-destructive' : 'text-foreground'}`}>
                            {item.label}
                          </p>
                          {item.value && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.value}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(item as any).badge && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded border border-border">
                            {(item as any).badge}
                          </span>
                        )}
                        {item.onClick && !(item as any).danger && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut', delay: 0.25 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors duration-150 ease-out"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </motion.button>

        {/* App Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut', delay: 0.3 }}
          className="text-center pb-4"
        >
          <p className="text-xs text-muted-foreground font-medium">MooBase v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Made with care for Uganda Farms</p>
        </motion.div>
      </div>
    </div>
  );
}
