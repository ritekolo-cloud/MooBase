import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = storage.getUser();
      if (user) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'manager') {
          navigate('/manager/dashboard');
        } else {
          navigate('/attendant/dashboard');
        }
      } else {
        navigate('/login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center max-w-[400px]"
      >
        <div className="mb-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-[64px] h-[64px] mx-auto mb-5 bg-[#1B5E20] rounded-[10px] flex items-center justify-center shadow-[0_6px_18px_rgba(27,94,32,0.15)]"
          >
            <svg
              viewBox="0 0 100 100"
              className="w-9 h-9"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 60C20 55 22 50 30 45C35 42 38 40 40 35C42 30 45 25 50 25C55 25 58 30 60 35C62 40 65 42 70 45C78 50 80 55 80 60V70H20V60Z"
                fill="white"
              />
              <circle cx="38" cy="40" r="3" fill="#1B5E20" />
              <circle cx="62" cy="40" r="3" fill="#1B5E20" />
              <path
                d="M35 48C35 48 40 52 50 52C60 52 65 48 65 48"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect x="45" y="60" width="10" height="15" rx="2" fill="white" opacity="0.5" />
            </svg>
          </motion.div>
          <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight mb-2">MooBase</h1>
          <p className="text-[16px] text-muted-foreground">Smart Cattle Records for Smart Farming</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="w-48 h-[6px] bg-muted rounded-full overflow-hidden mx-auto border border-[#E5E7EB]"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-[#1B5E20] rounded-full"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute bottom-8 text-muted-foreground text-[14px] font-medium"
      >
        v1.0.0 • Made for Uganda Farms
      </motion.div>
    </div>
  );
}
