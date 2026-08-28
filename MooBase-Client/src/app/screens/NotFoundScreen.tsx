import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-sm"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          404
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">Page Not Found</h1>
        <p className="text-xs text-muted-foreground mb-6">
          The requested screen does not exist or has been relocated in the Kayera Farm system.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground rounded-xl hover:bg-muted transition-colors text-xs font-bold shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-xs font-bold shadow-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
