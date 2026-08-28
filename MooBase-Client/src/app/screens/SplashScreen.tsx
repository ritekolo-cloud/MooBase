import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans"
         style={{ background: 'linear-gradient(160deg, #0F3D18 0%, #1A5C2A 55%, #2E7D44 100%)' }}>
      
      {/* Background texture elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #4ADE80 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #4ADE80 0%, transparent 70%)' }} />
        {/* Subtle field lines */}
        <svg className="absolute bottom-0 left-0 right-0 w-full opacity-5" viewBox="0 0 400 80" fill="none">
          <path d="M0 80 Q100 40 200 60 Q300 80 400 50 L400 80 Z" fill="white"/>
          <path d="M0 80 Q120 55 240 70 Q320 80 400 65 L400 80 Z" fill="white" opacity="0.5"/>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center z-10 px-8"
      >
        {/* Logo Mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="mb-8 flex flex-col items-center"
        >
          {/* Cow icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
               style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
              {/* Cow silhouette */}
              <ellipse cx="32" cy="42" rx="20" ry="12" fill="white" opacity="0.9"/>
              <ellipse cx="20" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              <ellipse cx="44" cy="32" rx="8" ry="10" fill="white" opacity="0.9"/>
              {/* Cow head */}
              <ellipse cx="32" cy="22" rx="11" ry="9" fill="white" opacity="0.9"/>
              {/* Ears */}
              <ellipse cx="22" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              <ellipse cx="42" cy="17" rx="4" ry="5" fill="white" opacity="0.9"/>
              {/* Eyes */}
              <circle cx="28" cy="20" r="1.5" fill="#1A5C2A"/>
              <circle cx="36" cy="20" r="1.5" fill="#1A5C2A"/>
              {/* Nose */}
              <ellipse cx="32" cy="26" rx="4" ry="2.5" fill="#E8F5E9" opacity="0.6"/>
              {/* Legs */}
              <rect x="16" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="24" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="36" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              <rect x="44" y="52" width="4" height="8" rx="2" fill="white" opacity="0.7"/>
              {/* Spots */}
              <ellipse cx="30" cy="40" rx="5" ry="4" fill="#2E7D44" opacity="0.3"/>
              <ellipse cx="42" cy="38" rx="4" ry="3" fill="#2E7D44" opacity="0.3"/>
            </svg>
          </div>

          {/* Farm Name */}
          <h1 className="text-4xl font-bold tracking-widest text-white uppercase mb-1"
              style={{ letterSpacing: '0.15em', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            KAYERA FARM
          </h1>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-12 bg-white opacity-30" />
            <p className="text-sm font-medium text-white opacity-70 tracking-widest uppercase">
              Livestock Records Management
            </p>
            <div className="h-px w-12 bg-white opacity-30" />
          </div>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-white"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-white/60 text-sm font-medium hover:text-white/90 transition-colors underline-offset-4 hover:underline"
          >
            Sign in now
          </button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-8 text-white/40 text-xs font-medium tracking-wider z-10">
        KAYERA FARM © {new Date().getFullYear()}
      </div>
    </div>
  );
}
