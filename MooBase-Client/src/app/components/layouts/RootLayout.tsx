import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { storage } from '../../utils/storage';

export function RootLayout() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    storage.init();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card border-b border-border text-foreground px-4 py-2 flex items-center justify-center gap-2 z-50 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-destructive"></div>
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-xs font-medium">Offline Mode - Changes will sync when connected</span>
          </motion.div>
        )}
      </AnimatePresence>
      <Outlet />
    </div>
  );
}
