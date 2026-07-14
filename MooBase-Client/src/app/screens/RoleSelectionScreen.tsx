import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Shield, ClipboardList, Check } from 'lucide-react';
import { storage } from '../utils/storage';
import { toast } from 'sonner';

export function RoleSelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'User';

  const handleRoleSelect = (role: 'manager' | 'attendant') => {
    const user = {
      id: `user_${Date.now()}`,
      username,
      role,
    };

    storage.setUser(user);
    toast.success(`Welcome, ${username}!`);

    if (role === 'manager') {
      navigate('/manager/dashboard');
    } else {
      navigate('/attendant/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-[640px]"
      >
        <div className="text-center mb-8">
          <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight mb-2">Select Your Role</h1>
          <p className="text-[16px] text-muted-foreground">Choose how you'll be using MooBase</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
            onClick={() => handleRoleSelect('manager')}
            className="w-full bg-card border border-[#E5E7EB] rounded-[12px] p-6 text-left hover:border-[#1B5E20]/50 hover:bg-muted/30 transition-all duration-150 ease-out group shadow-[0_6px_18px_rgba(0,0,0,0.06)] active:scale-98"
          >
            <div className="flex flex-col items-start">
              <div className="w-[48px] h-[48px] rounded-[10px] bg-secondary/10 flex items-center justify-center mb-4 transition-colors duration-150 ease-out">
                <Shield className="w-[20px] h-[20px] text-secondary" />
              </div>
              <h2 className="text-[20px] font-semibold text-foreground mb-2">Farm Manager</h2>
              <p className="text-[14px] text-muted-foreground mb-4">
                Full system access, reports, records, and farm oversight
              </p>
              <div className="space-y-2 mt-auto w-full border-t border-[#E5E7EB] pt-4">
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Admin Dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Analytics & Reports</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Full Record Access</span>
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
            onClick={() => handleRoleSelect('attendant')}
            className="w-full bg-card border border-[#E5E7EB] rounded-[12px] p-6 text-left hover:border-[#1B5E20]/50 hover:bg-muted/30 transition-all duration-150 ease-out group shadow-[0_6px_18px_rgba(0,0,0,0.06)] active:scale-98"
          >
            <div className="flex flex-col items-start">
              <div className="w-[48px] h-[48px] rounded-[10px] bg-primary/10 flex items-center justify-center mb-4 transition-colors duration-150 ease-out">
                <ClipboardList className="w-[20px] h-[20px] text-primary" />
              </div>
              <h2 className="text-[20px] font-semibold text-foreground mb-2">Attendant</h2>
              <p className="text-[14px] text-muted-foreground mb-4">
                Record daily activities and manage routine farm tasks
              </p>
              <div className="space-y-2 mt-auto w-full border-t border-[#E5E7EB] pt-4">
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Quick Record Entry</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Daily Tasks View</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Check className="w-[14px] h-[14px] text-success flex-shrink-0" />
                  <span>Offline Support</span>
                </div>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
