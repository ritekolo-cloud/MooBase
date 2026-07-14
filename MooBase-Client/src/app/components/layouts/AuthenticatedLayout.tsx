import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { Home, Users, BarChart3, Settings, Cloud, LogOut, Shield, UserCog } from 'lucide-react';
import { storage } from '../../utils/storage';
import { BottomNav } from '../BottomNav';

export function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(storage.getUser());

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(storage.getUser());
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
    ...(user.role === 'manager'
      ? [
          { icon: BarChart3, label: 'Reports', path: '/reports' },
          { icon: UserCog, label: 'User Management', path: '/users' }
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

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:flex flex-col w-[260px] bg-card border-r border-border h-screen sticky top-0 flex-shrink-0">
        {/* Logo Section */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-[32px] h-[32px] bg-primary rounded-[8px] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 60C20 55 22 50 30 45C35 42 38 40 40 35C42 30 45 25 50 25C55 25 58 30 60 35C62 40 65 42 70 45C78 50 80 55 80 60V70H20V60Z" fill="white" />
              <circle cx="38" cy="40" r="3" fill="#1B5E20" />
              <circle cx="62" cy="40" r="3" fill="#1B5E20" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-foreground text-base tracking-tight block">MooBase</span>
            <span className="text-[10px] text-muted-foreground font-medium block">Cattle Management</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            // Active check
            const isActive =
              location.pathname === item.path ||
              (item.path !== dashboardPath && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-[36px] h-[36px] bg-muted border border-border rounded-md flex items-center justify-center font-bold text-foreground text-sm flex-shrink-0">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.username}</p>
            </div>
            <span className="px-1.5 py-0.5 bg-muted text-[10px] font-semibold rounded border border-border capitalize">
              {user.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-md text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
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
