import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, BarChart3, ClipboardList, MoreHorizontal, Cloud } from 'lucide-react';

interface BottomNavProps {
  role: 'manager' | 'attendant';
}

function CowNavIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2H7V5z"/>
      <path d="M4 11a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="15" cy="12" r="1" fill="currentColor"/>
      <path d="M6 19v3"/>
      <path d="M18 19v3"/>
      <path d="M3 8l3 2"/>
      <path d="M21 8l-3 2"/>
    </svg>
  );
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const dashboardPath = role === 'manager' ? '/manager/dashboard' : '/attendant/dashboard';

  const navItems = role === 'manager'
    ? [
        { icon: Home, label: 'Home', path: dashboardPath },
        { icon: CowNavIcon, label: 'Cattle', path: '/cattle' },
        { icon: ClipboardList, label: 'Records', path: '/records/add' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: MoreHorizontal, label: 'More', path: '/settings' },
      ]
    : [
        { icon: Home, label: 'Home', path: dashboardPath },
        { icon: CowNavIcon, label: 'Cattle', path: '/cattle' },
        { icon: ClipboardList, label: 'Add Record', path: '/records/add' },
        { icon: Cloud, label: 'Sync', path: '/sync' },
        { icon: MoreHorizontal, label: 'More', path: '/settings' },
      ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe border-t shadow-lg"
      style={{
        background: '#09260E',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== dashboardPath && item.path !== '/records/add' && item.path !== '/settings' && location.pathname.startsWith(item.path)) ||
            (item.path === '/settings' && (location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/users')));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 relative group cursor-pointer"
            >
              <div
                className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive ? 'bg-white/20 text-white shadow-inner' : 'text-white/60 group-hover:text-white/90'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-white/60 group-hover:text-white/90'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
