import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';
import { farmDataService } from '../services/farmDataService';

export function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        storage.clearUser();
        const errorMsg = resData.message || 'Invalid email/username or password';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Save authoritative user details & tokens from backend response
      storage.setUser(resData.user);
      localStorage.setItem('moobase_access_token', resData.accessToken);
      localStorage.setItem('moobase_refresh_token', resData.refreshToken);
      storage.setOfflineMode(false);

      // IMPORTANT: Clear any stale mock/previous-session data from localStorage
      // so a fresh server fetch overwrites it rather than mixing with cached phantom data.
      localStorage.removeItem('moobase_cattle');
      localStorage.removeItem('moobase_records');

      // Pull authoritative farm data from PostgreSQL after login
      try {
        await farmDataService.revalidate();
      } catch (syncErr) {
        console.warn('Non-blocking: Initial server revalidation deferred:', syncErr);
      }

      toast.success('Logged in successfully!');

      // Redirect based strictly on backend-returned role
      if (resData.user.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/attendant/dashboard');
      }
    } catch (err: any) {
      console.error('Authentication request error:', err);
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError');

      if (isNetworkError) {
        storage.clearUser();
        const netMsg =
          'Unable to connect to the authentication server. Please sign in when the server is reachable.';
        setError(netMsg);
        toast.error(netMsg);
      } else {
        storage.clearUser();
        const errorMsg = err.message || 'Invalid email/username or password';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left panel — Farm branding (desktop only) */}
      <div className="hidden md:flex md:w-[45%] relative flex-col items-center justify-center p-12 overflow-hidden"
           style={{ background: '#0F3D18' }}>

        <div className="relative z-10 text-center max-w-sm">
          {/* Cow logo */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
               style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
              <ellipse cx="32" cy="42" rx="20" ry="12" fill="white" opacity="0.9"/>
              <ellipse cx="20" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              <ellipse cx="44" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              <ellipse cx="32" cy="22" rx="11" ry="9" fill="white" opacity="0.9"/>
              <ellipse cx="22" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              <ellipse cx="42" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              <circle cx="28" cy="20" r="1.5" fill="#1A5C2A"/>
              <circle cx="36" cy="20" r="1.5" fill="#1A5C2A"/>
              <ellipse cx="32" cy="26" rx="4" ry="2.5" fill="#E8F5E9" opacity="0.6"/>
              <rect x="16" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="24" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="36" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="44" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <ellipse cx="30" cy="40" rx="5" ry="4" fill="#2E7D44" opacity="0.3"/>
              <ellipse cx="42" cy="38" rx="4" ry="3" fill="#2E7D44" opacity="0.3"/>
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-widest uppercase mb-3"
              style={{ letterSpacing: '0.15em', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            KAYERA FARM
          </h1>
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="h-px w-10 bg-white opacity-30" />
            <p className="text-xs font-medium text-white/70 tracking-widest uppercase">
              Livestock Records Management
            </p>
            <div className="h-px w-10 bg-white opacity-30" />
          </div>

          {/* Feature highlights */}
          <div className="space-y-3 text-left">
            {[
              'Complete cattle health tracking',
              'Vaccination & breeding records',
              'Milk production monitoring',
              'Offline-first with auto sync',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Leaf className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-white/80 font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile: Farm branding at top */}
        <div className="md:hidden text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
               style={{ background: '#1A5C2A' }}>
            <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
              <ellipse cx="32" cy="42" rx="20" ry="12" fill="white" opacity="0.9"/>
              <ellipse cx="20" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              <ellipse cx="44" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              <ellipse cx="32" cy="22" rx="11" ry="9" fill="white" opacity="0.9"/>
              <ellipse cx="22" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              <ellipse cx="42" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              <circle cx="28" cy="20" r="1.5" fill="#1A5C2A"/>
              <circle cx="36" cy="20" r="1.5" fill="#1A5C2A"/>
              <rect x="16" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="24" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="36" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="44" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-widest uppercase text-foreground" style={{ letterSpacing: '0.1em' }}>
            KAYERA FARM
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Livestock Records Management</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your farm account to continue</p>
          </div>

          {/* Login Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-foreground">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-11 px-4 pr-11 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    required
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm bg-destructive/8 rounded-xl p-3 border border-destructive/20"
                >
                  {error}
                </motion.div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                style={{ background: '#1A5C2A' }}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Sign In to Kayera Farm'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Kayera Farm Livestock Records Management System
          </p>
        </motion.div>
      </div>
    </div>
  );
}
