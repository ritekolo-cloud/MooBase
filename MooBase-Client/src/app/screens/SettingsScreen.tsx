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
      farm: 'KAYERA FARM',
      exportDate: new Date().toISOString(),
      cattle: storage.getCattle(),
      records: storage.getRecords(),
      users: storage.getUsers(),
      syncQueue: storage.getSyncQueue(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kayera-farm-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Kayera Farm data backup exported successfully!');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all local records? This cannot be undone.')) {
      localStorage.clear();
      toast.success('Local cache cleared');
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

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.charAt(0).toUpperCase() || 'U';

  const settingsGroups = [
    {
      title: 'Account Settings',
      items: [
        {
          icon: User,
          label: 'My Profile',
          value: user?.name || user?.username || 'Guest',
          onClick: () => navigate('/profile'),
        },
        {
          icon: Shield,
          label: 'System Access Role',
          value: user?.role === 'manager' ? 'Farm Manager (Administrator)' : 'Farm Attendant',
          badge: user?.role === 'manager' ? 'Manager' : 'Attendant',
          onClick: null as any,
        },
        {
          icon: KeyRound,
          label: 'Security & Password',
          value: 'Update your account login password',
          onClick: () => navigate('/settings/change-password'),
        },
      ],
    },
    {
      title: 'Data & Offline Management',
      items: [
        {
          icon: Database,
          label: 'Offline Sync Status',
          value: `${storageUsed()} KB cached locally`,
          onClick: () => navigate('/sync'),
        },
        {
          icon: Download,
          label: 'Export Farm Backup',
          value: 'Export all cattle, health & milk logs (JSON)',
          onClick: handleBackup,
        },
        {
          icon: Trash2,
          label: 'Clear Local Cache',
          value: 'Purge offline device records',
          onClick: handleClearData,
          danger: true,
        },
      ],
    },
    {
      title: 'System Preferences',
      items: [
        {
          icon: Globe,
          label: 'System Language',
          value: 'English (Default)',
          onClick: null as any,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 max-w-[1240px] mx-auto w-full">
          <button
            onClick={() => {
              if (user?.role === 'manager') {
                navigate('/manager/dashboard');
              } else {
                navigate('/attendant/dashboard');
              }
            }}
            className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm System Configuration
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-xl mx-auto w-full space-y-6">
        {/* User Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground truncate">
                {user?.name || user?.username || 'Farm User'}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{user?.username || 'No email configured'}</p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20 capitalize">
                {user?.role === 'manager' ? 'Farm Manager' : 'Farm Attendant'}
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
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                {group.title}
              </h2>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
                {group.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={itemIndex}
                      onClick={item.onClick || undefined}
                      disabled={!item.onClick}
                      className={`w-full px-4 py-4 flex items-center justify-between transition-colors text-left ${
                        item.onClick ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            (item as any).danger
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold truncate ${
                              (item as any).danger ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {item.label}
                          </p>
                          {item.value && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.value}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {(item as any).badge && (
                          <span className="px-2 py-0.5 bg-muted text-foreground text-[11px] font-bold rounded-lg border border-border">
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
          className="w-full h-12 flex items-center justify-center gap-2 bg-destructive/8 hover:bg-destructive/15 text-destructive border border-destructive/20 rounded-2xl text-sm font-bold transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Kayera Farm</span>
        </motion.button>

        {/* App Version & Farm Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut', delay: 0.3 }}
          className="text-center pt-2 pb-4 text-muted-foreground"
        >
          <p className="text-xs font-bold text-foreground">KAYERA FARM</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Livestock Records Management System</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">v1.0.0 • Offline-First Agricultural Platform</p>
        </motion.div>
      </div>
    </div>
  );
}
