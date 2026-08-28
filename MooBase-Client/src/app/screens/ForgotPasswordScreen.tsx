import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config/api';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to request password reset');
      }

      setIsSent(true);
      toast.success('Password reset instructions sent!');
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        console.warn('Password reset request failed because the server is unreachable.', err);
        toast.error('Unable to connect to the authentication server. Please try again when online.');
      } else {
        toast.error(err.message || 'Failed to request password reset');
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
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Forgot Password?</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Enter your registered Kayera Farm email to reset your account password.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                  Account Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@kayerafarm.com"
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
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
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Check your email inbox</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We've sent a password reset link to <strong>{email}</strong>. Please follow the instructions to set a new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="text-xs text-primary hover:underline font-bold pt-2 cursor-pointer"
              >
                Didn't get the email? Try again
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>
      </motion.div>
    </div>
  );
}
