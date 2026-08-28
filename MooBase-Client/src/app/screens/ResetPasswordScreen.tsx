import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing password reset link');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Password reset token is missing from the link');
      return;
    }

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to reset password');
      }

      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        console.warn('Password reset failed because the server is unreachable.', err);
        toast.error('Unable to connect to the authentication server. Please try again when online.');
      } else {
        toast.error(err.message || 'Failed to reset password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Set New Password</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Enter your new secure password for Kayera Farm.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
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
                  placeholder="Confirm your new password"
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Password Reset Complete</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your Kayera Farm password has been reset successfully. You can now sign in with your new credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md cursor-pointer"
              >
                Sign In to Kayera Farm
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
