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
        console.error('Profile update failed:', err);
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
      window.dispatchEvent(new Event('profile-updated'));
    }
  };

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser.username?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 max-w-[1240px] mx-auto w-full">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Edit Profile
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm User Account
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            {/* Identity Info Card */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
                {initials}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{name || 'Farm User'}</h3>
                <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20 capitalize mt-1">
                  {currentUser.role === 'manager' ? 'Farm Manager' : 'Farm Attendant'}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Full Name <span className="text-destructive">*</span></span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mukasa John"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Username / Email</span>
              </label>
              <input
                type="text"
                disabled
                value={currentUser.username}
                className="w-full h-11 px-4 bg-muted/70 border border-border rounded-xl text-sm font-medium text-muted-foreground cursor-not-allowed opacity-80"
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">Username and email are authoritative and managed by administrators.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +256 700 000 000"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span>System Role</span>
              </label>
              <input
                type="text"
                disabled
                value={currentUser.role === 'manager' ? 'Farm Manager (Full Admin Access)' : 'Farm Attendant (Operational Access)'}
                className="w-full h-11 px-4 bg-muted/70 border border-border rounded-xl text-sm font-medium text-muted-foreground cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Updating Profile...</span>
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
