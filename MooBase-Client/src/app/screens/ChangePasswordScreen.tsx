import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Eye, EyeOff, Lock } from 'lucide-react';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => storage.getUser());

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('moobase_access_token') || '';
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to change password');
      }

      toast.success('Password updated successfully!');
      navigate('/settings');
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        console.warn('Password change failed because the server is unreachable.', err);
        toast.error('Unable to connect to the authentication server. Please try again when online.');
      } else {
        toast.error(err.message || 'Failed to change password');
      }
    } finally {
      setIsSaving(false);
    }
  };

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
              Change Account Password
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm Security Credentials
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 px-4 sm:px-6 py-6 max-w-xl mx-auto w-full space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Password Update</h2>
                <p className="text-xs text-muted-foreground">Keep your account secure with a strong password</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Current Password <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                New Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full h-11 px-4 pr-11 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Confirm New Password <span className="text-destructive">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
