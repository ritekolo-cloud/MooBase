import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, User, Shield, Phone, Mail } from 'lucide-react';
import { storage } from '../utils/storage';
import { toast } from 'sonner';

export function ProfileScreen() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => storage.getUser());

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Pre-populate fields from the users storage
    const allUsers = storage.getUsers();
    const userDetail = allUsers.find((u) => u.id === currentUser.id) || currentUser;
    
    setName(userDetail.name || '');
    setPhone(userDetail.phone || '');
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Please enter your name');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Update users collection locally
      storage.updateUser(currentUser.id, {
        name,
        phone,
      });

      // 2. Update active session user cache so layout headers refresh instantly
      const updatedSessionUser = {
        ...currentUser,
        name,
        phone,
      };
      storage.setUser(updatedSessionUser);

      // 3. Try to sync online if backend API is running
      const token = localStorage.getItem('moobase_access_token') || '';
      const response = await fetch(`http://localhost:5000/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, role: currentUser.role, email: currentUser.username }),
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.warn('Could not sync profile update directly with server. Queued for offline sync.', err);
      toast.warning('Offline Fallback: Profile updated locally.');
    } finally {
      setIsSaving(false);
      // Dispatch a custom event to notify other layout parts to update instantly
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
