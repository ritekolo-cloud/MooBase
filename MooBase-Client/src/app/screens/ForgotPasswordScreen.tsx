import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to request password reset');
      }

      setIsSent(true);
      toast.success('Password reset link sent successfully!');
    } catch (err: any) {
      console.warn('Backend connection failed. Performing mock forgot password fallback...', err);
      // Mock fallback: generate a mock reset link and show it
      setIsSent(true);
      toast.warning('Mock: Password reset link generated. Check console or backend logs.');
      
      const mockToken = 'mock_reset_token_' + Date.now();
      console.log('========================================');
      console.log(`🔑 MOCK RESET LINK FOR: ${email}`);
      console.log(`Link: http://localhost:5173/reset-password?token=${mockToken}`);
      console.log('========================================');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-[400px] space-y-6"
      >
        <div className="text-center">
          <div className="w-[48px] h-[48px] mx-auto mb-4 bg-primary rounded-[10px] flex items-center justify-center shadow-md">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Forgot Password?</h1>
          <p className="text-sm text-muted-foreground mt-2">
            No worries, we'll send you instructions to reset it.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="enter your email (e.g. admin@moobase.com)"
                  className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Check your email</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We've sent a password reset link to <strong>{email}</strong>. Please follow the instructions in the email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Didn't get the email? Try again
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </button>
      </motion.div>
    </div>
  );
}
