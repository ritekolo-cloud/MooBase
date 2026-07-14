import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, User, Smartphone, Lock } from 'lucide-react';
import { storage } from '../utils/storage';
import { toast } from 'sonner';

export function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'username' | 'phone'>('username');
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
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          loginMethod,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Login failed');
      }

      // Save user details & tokens in local storage
      storage.setUser(resData.user);
      localStorage.setItem('moobase_access_token', resData.accessToken);
      localStorage.setItem('moobase_refresh_token', resData.refreshToken);

      // Fetch all cattle and records from backend to seed local cache
      try {
        const cattleRes = await fetch('http://localhost:5000/api/cattle', {
          headers: {
            'Authorization': `Bearer ${resData.accessToken}`,
          },
        });
        if (cattleRes.ok) {
          const cattleData = await cattleRes.json();
          if (cattleData.status === 'success' && Array.isArray(cattleData.data)) {
            storage.setCattle(cattleData.data);

            const allRecords: any[] = [];
            for (const animal of cattleData.data) {
              const detailRes = await fetch(`http://localhost:5000/api/cattle/${animal.id}`, {
                headers: {
                  'Authorization': `Bearer ${resData.accessToken}`,
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
        console.warn('Failed to seed local storage cache on login:', fetchErr);
      }

      toast.success('Logged in successfully!');

      // Redirect directly based on backend-returned role
      if (resData.user.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/attendant/dashboard');
      }
    } catch (err: any) {
      // Graceful fallback for offline demo testing when backend is not running
      console.warn('Backend server connection failed. Performing offline mock login fallback...', err);
      
      const allUsers = storage.getUsers();
      const matchedUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      const role = matchedUser ? matchedUser.role : (username.toLowerCase().includes('attendant') ? 'attendant' : 'manager');
      const name = matchedUser ? matchedUser.name : (role === 'manager' ? 'Kabaka Ronald' : 'Mukasa John');
      
      const user = {
        id: matchedUser ? matchedUser.id : `mock_${Date.now()}`,
        username,
        role,
        name,
      };

      storage.setUser(user);
      localStorage.setItem('moobase_access_token', 'mock_token_' + Date.now());
      toast.warning(`Server offline. Logged in locally as ${name} (${role})`);
      
      if (role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/attendant/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineLogin = () => {
    const existingUser = storage.getUser();
    if (existingUser) {
      toast.success('Logged in offline');
      if (existingUser.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/attendant/dashboard');
      }
    } else {
      toast.error('No offline credentials found');
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
          <div className="w-[48px] h-[48px] mx-auto mb-4 bg-[#1B5E20] rounded-[10px] flex items-center justify-center">
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
          {/* Method Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-[10px]">
            <button
              type="button"
              onClick={() => setLoginMethod('username')}
              className={`flex-1 py-2.5 rounded-[8px] flex items-center justify-center gap-2 text-[14px] font-semibold transition-all duration-150 ease-out ${
                loginMethod === 'username'
                  ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-[18px] h-[18px]" />
              <span>Username</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-2.5 rounded-[8px] flex items-center justify-center gap-2 text-[14px] font-semibold transition-all duration-150 ease-out ${
                loginMethod === 'phone'
                  ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-[18px] h-[18px]" />
              <span>Phone</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-foreground mb-1.5">
                {loginMethod === 'username' ? 'Username' : 'Phone Number'}
              </label>
              <input
                type={loginMethod === 'username' ? 'text' : 'tel'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={loginMethod === 'username' ? 'Enter username' : '+256 700 000 000'}
                className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[10px] text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-all duration-150 ease-out"
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
                  className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm pr-10"
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

              <button
                type="button"
                onClick={handleOfflineLogin}
                className="w-full h-[48px] bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] font-medium text-[14px] hover:bg-muted transition-colors duration-150 ease-out active:scale-98"
              >
                Login Offline Mode
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-[14px] mt-6 font-medium">
          Demo: Use any credentials to proceed
        </p>
      </motion.div>
    </div>
  );
}
