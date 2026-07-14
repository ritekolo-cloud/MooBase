import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  BellRing,
  Plus,
  Settings,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { useEffect, useState } from 'react';

export function ManagerDashboard() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState(storage.getCattle());
  const [records, setRecords] = useState(storage.getRecords());
  const [user, setUser] = useState(storage.getUser());

  useEffect(() => {
    if (!user || user.role !== 'manager') {
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

  const stats = {
    totalCattle: cattle.length,
    healthyCount: cattle.filter((c) => c.status === 'healthy').length,
    sickCount: cattle.filter((c) => c.status === 'sick').length,
    todayRecords: records.filter(
      (r) => new Date(r.date).toDateString() === new Date().toDateString()
    ).length,
  };

  const recentActivity = records
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);


  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Main Content Area */}
      <main className="max-w-[1280px] mx-auto w-full px-6 py-8 space-y-8 flex-1">
        
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">
            Good morning, {user?.name || user?.username}
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Here is a summary of what's happening on your farm today.
          </p>
        </section>

        {/* Farm Summary */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
            Farm Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] font-medium text-muted-foreground">Total Cattle</span>
                <Users className="w-[22px] h-[22px] text-muted-foreground" />
              </div>
              <p className="text-[36px] font-bold text-foreground leading-none">{stats.totalCattle}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
              className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] font-medium text-muted-foreground">Today's Records</span>
                <FileText className="w-[22px] h-[22px] text-muted-foreground" />
              </div>
              <p className="text-[36px] font-bold text-foreground leading-none">{stats.todayRecords}</p>
            </motion.div>
          </div>
        </section>

        {/* Health Status */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
            Health Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
              className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] text-left hover:bg-muted/30 hover:border-[#1B5E20]/30 transition-all duration-150 ease-out flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-[10px] ${stats.sickCount > 0 ? 'bg-destructive/10' : 'bg-muted'} transition-colors duration-150 ease-out`}>
                  {stats.sickCount > 0 ? (
                    <BellRing className="w-[22px] h-[22px] text-destructive" />
                  ) : (
                    <ShieldCheck className="w-[22px] h-[22px] text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4 className="text-[18px] font-semibold text-foreground">
                    {stats.sickCount > 0 ? `${stats.sickCount} Require Attention` : 'No Active Alerts'}
                  </h4>
                  <p className="text-[14px] text-muted-foreground">Sick or isolated cattle records</p>
                </div>
              </div>
              <ArrowRight className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-150 ease-out" />
            </motion.button>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/records/add')}
              className="h-[48px] px-6 bg-primary text-primary-foreground rounded-[10px] font-medium text-[14px] hover:bg-primary/90 transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
            >
              <Plus className="w-[18px] h-[18px]" />
              <span>Add Record</span>
            </button>

            <button
              onClick={() => navigate('/cattle')}
              className="h-[48px] px-6 bg-card border border-border text-foreground rounded-[10px] font-medium text-[14px] hover:bg-muted hover:border-primary/30 transition-all duration-150 ease-out flex items-center justify-center gap-2 active:scale-98"
            >
              <Users className="w-[18px] h-[18px] text-muted-foreground" />
              <span>View Cattle</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="h-[48px] px-6 bg-card border border-border text-foreground rounded-[10px] font-medium text-[14px] hover:bg-muted hover:border-primary/30 transition-all duration-150 ease-out flex items-center justify-center gap-2 active:scale-98"
            >
              <BarChart3 className="w-[18px] h-[18px] text-muted-foreground" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="h-[48px] px-6 bg-card border border-border text-foreground rounded-[10px] font-medium text-[14px] hover:bg-muted hover:border-primary/30 transition-all duration-150 ease-out flex items-center justify-center gap-2 active:scale-98"
            >
              <Settings className="w-[18px] h-[18px] text-muted-foreground" />
              <span>Settings</span>
            </button>
          </div>
        </section>

        {/* Recent Records */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
              Recent Records
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
            transition={{ duration: 0.15, ease: 'easeOut', delay: 0.15 }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="divide-y divide-[#E5E7EB]">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-[22px] h-[22px] text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-medium text-[14px]">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((record) => {
                  const cattleInfo = storage.getCattleById(record.cattleId);
                  return (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/edit/${record.id}`)}
                      className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-150 ease-out text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-[40px] h-[40px] rounded-[10px] bg-background border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 transition-colors duration-150 ease-out">
                          <FileText className="w-[18px] h-[18px] text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[16px] font-semibold text-foreground truncate">
                            {cattleInfo?.name || record.cattleId}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[14px] font-medium text-[#1B5E20] capitalize">
                              {record.type}
                            </span>
                            <span className="text-muted-foreground text-[14px]">•</span>
                            <span className="text-[14px] text-muted-foreground truncate max-w-[200px] md:max-w-md">
                              {record.notes}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[14px] text-muted-foreground flex-shrink-0 ml-4 font-medium">
                        {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </section>

      </main>
    </div>
  );
}
