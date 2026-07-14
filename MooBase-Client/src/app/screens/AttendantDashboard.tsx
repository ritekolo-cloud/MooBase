import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Plus, CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import { storage } from '../utils/storage';
import { useEffect, useState } from 'react';

export function AttendantDashboard() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState(storage.getCattle());
  const [records, setRecords] = useState(storage.getRecords());
  const [syncQueue, setSyncQueue] = useState(storage.getSyncQueue());
  const [user, setUser] = useState(storage.getUser());

  useEffect(() => {
    if (!user || user.role !== 'attendant') {
      navigate('/login');
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

  const todayRecords = records.filter(
    (r) => new Date(r.date).toDateString() === new Date().toDateString()
  );

  const assignedCattle = cattle.slice(0, 10);

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Main Content Area */}
      <main className="max-w-[1280px] mx-auto w-full px-6 py-8 space-y-8 flex-1">
        
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">
            Good day, {user?.name || user?.username}
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Your assigned tasks and cattle for today.
          </p>
        </section>

        {syncQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-[40px] h-[40px] rounded-[10px] bg-background border border-[#E5E7EB] flex items-center justify-center text-muted-foreground flex-shrink-0 transition-colors duration-150 ease-out">
                <Clock className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-foreground">
                  {syncQueue.length} pending items
                </h4>
                <p className="text-[14px] text-muted-foreground">Waiting for internet connection to sync</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/sync')}
              className="text-[14px] font-medium text-[#1B5E20] hover:underline transition-colors duration-150 ease-out"
            >
              Review
            </button>
          </motion.div>
        )}

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/records/add')}
              className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-medium text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
            >
              <Plus className="w-[18px] h-[18px]" />
              <span>Add Record</span>
            </button>

            <button
              onClick={() => navigate('/cattle')}
              className="h-[48px] px-6 bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] font-medium text-[14px] hover:bg-muted hover:border-[#1B5E20]/30 transition-all duration-150 ease-out flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle className="w-[18px] h-[18px] text-muted-foreground" />
              <span>View Cattle</span>
            </button>
          </div>
        </section>

        {/* Today's Summary */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
            Today's Progress
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out">
              <p className="text-[14px] font-medium text-muted-foreground mb-2">Records Added</p>
              <p className="text-[36px] font-bold text-foreground leading-none">{todayRecords.length}</p>
            </div>
            <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out">
              <p className="text-[14px] font-medium text-muted-foreground mb-2">Assigned Cattle</p>
              <p className="text-[36px] font-bold text-foreground leading-none">{assignedCattle.length}</p>
            </div>
          </div>
        </section>

        {/* Assigned Cattle List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
              Assigned Cattle
            </h2>
            <button
              onClick={() => navigate('/cattle')}
              className="text-[14px] font-medium text-[#1B5E20] hover:underline transition-colors duration-150 ease-out"
            >
              View All
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="divide-y divide-[#E5E7EB]">
              {assignedCattle.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-[22px] h-[22px] text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-medium text-[14px]">No cattle assigned</p>
                </div>
              ) : (
                assignedCattle.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => navigate(`/cattle/profile/${animal.id}`)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-150 ease-out text-left group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[10px] bg-background border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 font-semibold text-[16px] text-foreground transition-colors duration-150 ease-out">
                        {animal.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[16px] font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-150 ease-out">
                          {animal.name}
                        </h4>
                        <p className="text-[14px] text-muted-foreground truncate">
                          {animal.breed} • {animal.age} yrs
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-150 ease-out opacity-0 group-hover:opacity-100" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
