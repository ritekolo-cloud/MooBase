import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, Users, BarChart3, Settings, Cloud, UserCog } from 'lucide-react';

interface BottomNavProps {
  role: 'manager' | 'attendant';
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();

  const dashboardPath = role === 'manager' ? '/manager/dashboard' : '/attendant/dashboard';

  const navItems = [
    { icon: Home, label: 'Home', path: dashboardPath },
    { icon: Users, label: 'Cattle', path: '/cattle' },
    ...(role === 'manager'
      ? [
          { icon: BarChart3, label: 'Reports', path: '/reports' },
          { icon: UserCog, label: 'Users', path: '/users' }
        ]
      : []),
    { icon: Cloud, label: 'Sync', path: '/sync' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 md:hidden pb-safe">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-2 relative group"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-b-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 mb-1 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
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
