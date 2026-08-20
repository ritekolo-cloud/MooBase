import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, User, Shield, Phone, Mail } from 'lucide-react';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function ProfileScreen() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => storage.getUser());

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Pre-populate fields from the users storage or currentUser
    const allUsers = storage.getUsers();
    const userDetail = allUsers.find((u) => u.id === currentUser.id) || currentUser;
    
    setName(userDetail.name || currentUser.name || '');
    setPhone(userDetail.phone || currentUser.phone || '');
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast.error('Please enter your name');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('moobase_access_token') || '';
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone || undefined,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.message || `Server returned error (${response.status})`);
      }

      if (resData.data?.user) {
        const persistedUser = {
          ...currentUser,
          ...resData.data.user,
        };
        // 1. Authoritative sync: Update local state and cache from backend response
        storage.setUser(persistedUser);
        setCurrentUser(persistedUser);
        setName(persistedUser.name || '');
        setPhone(persistedUser.phone || '');
      }

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        // Offline Fallback: update locally and queue for sync
        console.warn('Could not sync profile update directly with server. Queued for offline sync.', err);
        const offlineUser = {
          ...currentUser,
          name: trimmedName,
          phone: trimmedPhone,
        };
        storage.setUser(offlineUser);
        storage.updateUser(currentUser.id, {
          name: trimmedName,
          phone: trimmedPhone,
        });
        setCurrentUser(offlineUser);
        toast.warning('Offline: Profile updated locally and queued for sync.');
      } else {
        // Explicit API error (e.g. 400, 401, 403, 500) - NEVER report false success
        console.error('Profile update failed:', err);
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
      // Dispatch a custom event to notify all layout components (sidebar, header, settings)
      window.dispatchEvent(new Event('profile-updated'));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
          >
            <ArrowLeft className="w-[20px] h-[20px]" />
          </button>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Edit Profile</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 px-6 py-8 max-w-lg mx-auto w-full space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            {/* Identity Info (Read-Only) */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-[56px] h-[56px] rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
                {name?.[0]?.toUpperCase() || currentUser.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{name || 'Guest User'}</h3>
                <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded border border-border capitalize mt-1">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mukasa John"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Username / Email</span>
              </label>
              <input
                type="text"
                disabled
                value={currentUser.username}
                className="w-full py-2 px-3 bg-muted border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed opacity-80"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Username/Email cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Phone Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +256 700 000 000"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span>System Role</span>
              </label>
              <input
                type="text"
                disabled
                value={currentUser.role === 'manager' ? 'Farm Manager (Administrator)' : 'Farm Attendant'}
                className="w-full py-2 px-3 bg-muted border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
