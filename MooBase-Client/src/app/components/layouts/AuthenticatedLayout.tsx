import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Cloud,
  LogOut,
  UserCog,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { storage } from '../../utils/storage';
import { BottomNav } from '../BottomNav';

const getAuthenticatedUser = () => {
  const user = storage.getUser();
  const token = localStorage.getItem('moobase_access_token');
  return user && token ? user : null;
};

// Cow SVG logo for the sidebar
function CowLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="42" rx="20" ry="12" fill="white" opacity="0.9"/>
      <ellipse cx="20" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
      <ellipse cx="44" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
      <ellipse cx="32" cy="22" rx="11" ry="9" fill="white" opacity="0.9"/>
      <ellipse cx="22" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
      <ellipse cx="42" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
      <circle cx="28" cy="20" r="1.5" fill="#1A5C2A"/>
      <circle cx="36" cy="20" r="1.5" fill="#1A5C2A"/>
      <ellipse cx="32" cy="26" rx="4" ry="2.5" fill="#E8F5E9" opacity="0.5"/>
      <rect x="16" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
      <rect x="24" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
      <rect x="36" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
      <rect x="44" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
      <ellipse cx="30" cy="40" rx="5" ry="4" fill="rgba(255,255,255,0.15)"/>
      <ellipse cx="42" cy="38" rx="4" ry="3" fill="rgba(255,255,255,0.15)"/>
    </svg>
  );
}

export function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getAuthenticatedUser);

  useEffect(() => {
    const authenticatedUser = getAuthenticatedUser();
    if (!authenticatedUser) {
      storage.clearUser();
      setUser(null);
      navigate('/login', { replace: true });
      return;
    }
    setUser(authenticatedUser);
  }, [navigate]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(getAuthenticatedUser());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  if (!user) return null;

  const dashboardPath = user.role === 'manager' ? '/manager/dashboard' : '/attendant/dashboard';

  const navItems = [
    { icon: Home, label: 'Dashboard', path: dashboardPath },
    { icon: Users, label: 'Cattle Records', path: '/cattle' },
    { icon: FileText, label: 'Add Record', path: '/records/add' },
    ...(user.role === 'manager'
      ? [
          { icon: BarChart3, label: 'Reports', path: '/reports' },
          { icon: UserCog, label: 'Staff Management', path: '/users' },
        ]
      : []),
    { icon: Cloud, label: 'Offline Sync', path: '/sync' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    storage.clearUser();
    setUser(null);
    navigate('/login', { replace: true });
  };

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.username?.[0]?.toUpperCase() || 'U');

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Sidebar — Desktop only */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 flex-shrink-0"
             style={{ background: 'linear-gradient(180deg, #0F3D18 0%, #1A5C2A 100%)' }}>
        
        {/* Farm branding header */}
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(255,255,255,0.15)' }}>
              <CowLogo className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm tracking-widest uppercase"
                   style={{ letterSpacing: '0.12em' }}>
                KAYERA FARM
              </div>
              <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                Livestock Management
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== dashboardPath && item.path !== '/records/add' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`}
                style={isActive
                  ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                  : { color: 'rgba(255,255,255,0.65)' }
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {/* Profile row */}
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 transition-all duration-150 hover:text-white"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                 style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name || user.username}</p>
              <p className="text-[10px] truncate capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {user.role === 'manager' ? 'Farm Manager' : 'Farm Attendant'}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer"
            style={{
              background: 'rgba(220,38,38,0.15)',
              color: 'rgba(248,113,113,1)',
              border: '1px solid rgba(220,38,38,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.15)';
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden pb-16 md:pb-0">
        <main className="flex-1 relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav role={user.role} />
    </div>
  );
}
