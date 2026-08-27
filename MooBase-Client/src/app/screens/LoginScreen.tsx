import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

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

      // Seed local cache with cattle and records from server
      try {
        const cattleRes = await fetch(`${API_BASE_URL}/cattle`, {
          headers: {
            Authorization: `Bearer ${resData.accessToken}`,
          },
        });
        if (cattleRes.ok) {
          const cattleData = await cattleRes.json();
          if (cattleData.status === 'success' && Array.isArray(cattleData.data)) {
            storage.setCattle(cattleData.data);

            const allRecords: any[] = [];
            for (const animal of cattleData.data) {
              const detailRes = await fetch(`${API_BASE_URL}/cattle/${animal.id}`, {
                headers: {
                  Authorization: `Bearer ${resData.accessToken}`,
                },
              });
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if (detailData.status === 'success' && detailData.data.records) {
                  allRecords.push(...detailData.data.records);
                }
              }
            }
            storage.setRecords(allRecords);
          }
        }
      } catch (fetchErr) {
        console.warn('Non-blocking: Failed to seed cattle cache on login:', fetchErr);
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-[48px] h-[48px] mx-auto mb-4 bg-[#1B5E20] rounded-[10px] flex items-center justify-center shadow-[0_6px_18px_rgba(27,94,32,0.15)]">
            <svg
              viewBox="0 0 100 100"
              className="w-7 h-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 60C20 55 22 50 30 45C35 42 38 40 40 35C42 30 45 25 50 25C55 25 58 30 60 35C62 40 65 42 70 45C78 50 80 55 80 60V70H20V60Z"
                fill="white"
              />
              <circle cx="38" cy="40" r="3" fill="#1B5E20" />
              <circle cx="62" cy="40" r="3" fill="#1B5E20" />
            </svg>
          </div>
          <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">MooBase</h1>
          <p className="text-[16px] text-muted-foreground mt-2">Sign in to manage your cattle records</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-foreground mb-1.5">
                Username / Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin@moobase.com"
                className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[10px] text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-all duration-150 ease-out"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-[48px] px-4 bg-card border border-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-[14px] bg-destructive/10 rounded-[10px] p-3 border border-destructive/20"
              >
                {error}
              </motion.div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[48px] bg-[#1B5E20] text-white rounded-[10px] font-semibold text-[14px] hover:bg-[#1B5E20]/90 transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                  />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
