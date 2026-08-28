import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
  HeartPulse,
  Syringe,
  Milk,
  PlusCircle,
  HeartHandshake,
  Calendar,
  ChevronRight,
  ArrowRight,
  AlertOctagon,
  Sparkles,
  Wheat,
} from 'lucide-react';
import { storage, Cattle, Record as CattleRecord } from '../utils/storage';
import { useEffect, useState } from 'react';

// Custom Cow Silhouette Icon for the branding
function CowBrandIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="42" rx="20" ry="12" fill="#E8B349"/>
      <ellipse cx="20" cy="32" rx="8" ry="10" fill="#E8B349"/>
      <ellipse cx="44" cy="32" rx="8" ry="10" fill="#E8B349"/>
      <ellipse cx="32" cy="22" rx="11" ry="9" fill="#E8B349"/>
      <ellipse cx="22" cy="17" rx="4" ry="5" fill="#E8B349"/>
      <ellipse cx="42" cy="17" rx="4" ry="5" fill="#E8B349"/>
      <circle cx="28" cy="20" r="1.5" fill="#0F3D18"/>
      <circle cx="36" cy="20" r="1.5" fill="#0F3D18"/>
      <rect x="16" y="52" width="4" height="8" rx="2" fill="#E8B349"/>
      <rect x="24" y="52" width="4" height="8" rx="2" fill="#E8B349"/>
      <rect x="36" y="52" width="4" height="8" rx="2" fill="#E8B349"/>
      <rect x="44" y="52" width="4" height="8" rx="2" fill="#E8B349"/>
    </svg>
  );
}

function CowOutlineIcon({ className = 'w-6 h-6' }: { className?: string }) {
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

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ManagerDashboard() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState<Cattle[]>(storage.getCattle());
  const [records, setRecords] = useState<CattleRecord[]>(storage.getRecords());
  const [user, setUser] = useState(storage.getUser());

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(storage.getUser());
      setCattle(storage.getCattle());
      setRecords(storage.getRecords());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const sickCattle = cattle.filter((c) => c.status === 'sick');
  const requireAttentionCount = sickCattle.length;

  const todayDateStr = new Date().toDateString();
  const todayRecords = records.filter(
    (r) => new Date(r.date).toDateString() === todayDateStr
  );

  const todayMilkRecords = records.filter(
    (r) => r.type === 'milk' && new Date(r.date).toDateString() === todayDateStr
  );

  const dueTodayCount = todayRecords.length;

  const stats = {
    totalCattle: cattle.length,
    requireAttention: requireAttentionCount,
    milkToday: todayMilkRecords.length,
    dueToday: dueTodayCount,
  };

  // Build Today's activities list dynamically from existing data
  const dynamicActivities: Array<{
    id: string;
    type: 'vaccination' | 'breeding' | 'health' | 'milk' | 'feeding';
    tag: string;
    label: string;
    statusBadge: { text: string; bg: string; textCol: string; borderCol: string };
    recordId?: string;
    cattleId?: string;
  }> = [];

  // 1. Add sick cattle as active Health Check attention items
  sickCattle.forEach((c) => {
    dynamicActivities.push({
      id: `sick-${c.id}`,
      type: 'health',
      tag: c.id,
      cattleId: c.id,
      label: `Health Check — ${c.name}`,
      statusBadge: {
        text: 'Attention',
        bg: '#FEE2E2',
        textCol: '#DC2626',
        borderCol: '#FECACA',
      },
    });
  });

  // 2. Add today's records as completed/active items
  todayRecords.forEach((r) => {
    const c = cattle.find((item) => item.id === r.cattleId);
    let label = 'Activity';
    if (r.type === 'vaccination') label = 'Vaccination';
    else if (r.type === 'breeding') label = 'Breeding Follow-up';
    else if (r.type === 'health') label = 'Health Check';
    else if (r.type === 'milk') label = 'Milk Record';
    else if (r.type === 'feeding') label = 'Feeding Schedule';

    dynamicActivities.push({
      id: `rec-${r.id}`,
      type: r.type,
      tag: c?.id || r.cattleId,
      cattleId: r.cattleId,
      recordId: r.id,
      label: `${label} ${c?.name ? `(${c.name})` : ''}`,
      statusBadge: {
        text: 'Recorded today',
        bg: '#E0F2FE',
        textCol: '#0369A1',
        borderCol: '#BAE6FD',
      },
    });
  });

  // If no today-specific items, take top 4 most recent records to provide valuable visibility
  if (dynamicActivities.length === 0) {
    const recentSample = records
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    recentSample.forEach((r) => {
      const c = cattle.find((item) => item.id === r.cattleId);
      let label = 'Activity';
      if (r.type === 'vaccination') label = 'Vaccination';
      else if (r.type === 'breeding') label = 'Breeding Follow-up';
      else if (r.type === 'health') label = 'Health Check';
      else if (r.type === 'milk') label = 'Milk Record';
      else if (r.type === 'feeding') label = 'Feeding';

      dynamicActivities.push({
        id: `recent-${r.id}`,
        type: r.type,
        tag: c?.id || r.cattleId,
        cattleId: r.cattleId,
        recordId: r.id,
        label: `${label} ${c?.name ? `(${c.name})` : ''}`,
        statusBadge: {
          text: 'Recent record',
          bg: '#FEF3C7',
          textCol: '#D97706',
          borderCol: '#FDE68A',
        },
      });
    });
  }

  // Recent activity list
  const recentActivityList = records
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.username?.charAt(0).toUpperCase() || 'M';

  // Greeting based on time of day
  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Top Hero Section */}
      <header
        className="relative px-6 pt-6 pb-10 text-white overflow-hidden shadow-md"
        style={{ background: '#0F3D18' }}
      >

        <div className="max-w-[1240px] mx-auto relative z-10">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-bold tracking-widest uppercase font-serif text-white">
                  KAYERA FARM
                </span>
                <CowBrandIcon className="w-6 h-6 inline-block" />
              </div>
              <div className="hidden sm:block h-4 w-px bg-white/20" />
              <p className="hidden sm:block text-xs font-medium text-white/70 tracking-wider uppercase">
                Livestock Records Management
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
                className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer text-white"
                title={requireAttentionCount > 0 ? `${requireAttentionCount} alerts` : 'No active alerts'}
              >
                <Bell className="w-5 h-5" />
                {requireAttentionCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0F3D18]">
                    {requireAttentionCount}
                  </span>
                )}
              </button>

              {/* User Avatar Circle */}
              <button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white text-[#0F3D18] font-bold text-sm flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer"
                title="View Profile"
              >
                {userInitial}
              </button>
            </div>
          </div>

          {/* Greeting */}
          <div className="pt-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{greetingTime}, {user?.name || 'Manager'}</span>
              <span className="inline-block animate-pulse">👋</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 mt-1 font-normal">
              Here's what needs your attention today.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 -mt-6 space-y-6 flex-1 relative z-20">
        
        {/* 2x2 Farm Overview Stats Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Total Cattle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate('/cattle')}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Total Cattle
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                  {stats.totalCattle}
                </span>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center flex-shrink-0">
                <CowOutlineIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[#1B5E20] group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View all cattle</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* 2. Require Attention */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-destructive/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Require Attention
                </span>
                <span className={`text-2xl sm:text-3xl font-bold mt-1 block ${stats.requireAttention > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.requireAttention}
                </span>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-destructive group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* 3. Milk Today */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            onClick={() => navigate('/cattle', { state: { filter: 'lactating' } })}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-secondary/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Milk Today
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-secondary mt-1 block">
                  {stats.milkToday}
                </span>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
                <Milk className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-secondary group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* 4. Due / Recorded Today */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            onClick={() => navigate('/records/add')}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-accent/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Due Today
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-accent mt-1 block">
                  {stats.dueToday}
                </span>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                <Syringe className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View due items</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

        </section>

        {/* Attention Alert Banner */}
        {stats.requireAttention > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-destructive text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-destructive tracking-tight uppercase">
                  {stats.requireAttention} CATTLE REQUIRE{stats.requireAttention === 1 ? 'S' : ''} ATTENTION
                </h2>
                <p className="text-xs sm:text-sm text-destructive/80 font-medium mt-0.5">
                  Sick or isolated cattle needs immediate veterinary follow-up.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-destructive text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
            >
              <span>View Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                  ALL HERD HEALTHY
                </h2>
                <p className="text-xs text-emerald-700 font-medium">
                  No cattle currently marked as sick or isolated.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cattle')}
              className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1"
            >
              View herd →
            </button>
          </div>
        )}

        {/* 2-Column Section: Today's Activities + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Today's Activities */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
                  Today's Activities
                </h2>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
              {dynamicActivities.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">No activities scheduled for today</p>
                  <button
                    onClick={() => navigate('/records/add')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                  >
                    + Record an activity now
                  </button>
                </div>
              ) : (
                dynamicActivities.slice(0, 5).map((act) => {
                  let Icon = Syringe;
                  let iconBg = 'bg-accent/10 text-accent';
                  if (act.type === 'breeding') {
                    Icon = HeartHandshake;
                    iconBg = 'bg-[#1B5E20]/10 text-[#1B5E20]';
                  } else if (act.type === 'health') {
                    Icon = HeartPulse;
                    iconBg = 'bg-destructive/10 text-destructive';
                  } else if (act.type === 'milk') {
                    Icon = Milk;
                    iconBg = 'bg-secondary/10 text-secondary';
                  } else if (act.type === 'feeding') {
                    Icon = Wheat;
                    iconBg = 'bg-emerald-600/10 text-emerald-700';
                  }

                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        if (act.cattleId) {
                          navigate(`/cattle/profile/${act.cattleId}`);
                        } else if (act.recordId) {
                          navigate(`/records/edit/${act.recordId}`);
                        } else {
                          navigate('/cattle');
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {act.label}
                          </h3>
                          <p className="text-xs font-mono font-medium text-muted-foreground mt-0.5">
                            {act.tag}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                          style={{
                            backgroundColor: act.statusBadge.bg,
                            color: act.statusBadge.textCol,
                            borderColor: act.statusBadge.borderCol,
                          }}
                        >
                          {act.statusBadge.text}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })
              )}

              {dynamicActivities.length > 0 && (
                <button
                  onClick={() => navigate('/cattle')}
                  className="w-full py-3 px-4 text-xs font-bold text-[#1B5E20] hover:bg-[#1B5E20]/5 text-center flex items-center justify-center gap-1 transition-colors"
                >
                  <span>View all activities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </section>

          {/* Right: Quick Actions */}
          <section className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
              Quick Actions
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
              {/* 1. Add Cattle */}
              <button
                onClick={() => navigate('/cattle/add')}
                className="bg-card border border-border hover:border-primary/50 hover:bg-[#1B5E20]/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary">
                  Add Cattle
                </span>
              </button>

              {/* 2. Health Record */}
              <button
                onClick={() => navigate('/records/add', { state: { type: 'health' } })}
                className="bg-card border border-border hover:border-destructive/50 hover:bg-destructive/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-destructive">
                  Health Record
                </span>
              </button>

              {/* 3. Vaccination */}
              <button
                onClick={() => navigate('/records/add', { state: { type: 'vaccination' } })}
                className="bg-card border border-border hover:border-accent/50 hover:bg-accent/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Syringe className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-accent">
                  Vaccination
                </span>
              </button>

              {/* 4. Milk Record */}
              <button
                onClick={() => navigate('/records/add', { state: { type: 'milk' } })}
                className="bg-card border border-border hover:border-secondary/50 hover:bg-secondary/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Milk className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-secondary">
                  Milk Record
                </span>
              </button>

              {/* 5. Feeding */}
              <button
                onClick={() => navigate('/records/add', { state: { type: 'feeding' } })}
                className="bg-card border border-border hover:border-emerald-600/50 hover:bg-emerald-600/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Wheat className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-700">
                  Feeding
                </span>
              </button>

              {/* 6. Breeding */}
              <button
                onClick={() => navigate('/records/add', { state: { type: 'breeding' } })}
                className="bg-card border border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <CowOutlineIcon className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary">
                  Breeding
                </span>
              </button>
            </div>
          </section>

        </div>

        {/* Bottom: Recent Activity Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">⚡</span>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
                Recent Activity
              </h2>
            </div>
            <button
              onClick={() => navigate('/cattle')}
              className="text-xs font-bold text-[#1B5E20] hover:underline"
            >
              View all
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
            {recentActivityList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <p className="text-sm font-medium">No recent activity recorded</p>
                <button
                  onClick={() => navigate('/records/add')}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Add your first record
                </button>
              </div>
            ) : (
              recentActivityList.map((rec) => {
                const c = cattle.find((animal) => animal.id === rec.cattleId);
                let Icon = Syringe;
                let iconColor = 'text-accent bg-accent/10';
                let labelText = `${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} record`;

                if (rec.type === 'health') {
                  Icon = HeartPulse;
                  iconColor = 'text-destructive bg-destructive/10';
                  labelText = 'Health record added';
                } else if (rec.type === 'vaccination') {
                  Icon = Syringe;
                  iconColor = 'text-accent bg-accent/10';
                  labelText = 'Vaccination updated';
                } else if (rec.type === 'milk') {
                  Icon = Milk;
                  iconColor = 'text-secondary bg-secondary/10';
                  labelText = 'Milk record added';
                } else if (rec.type === 'breeding') {
                  Icon = HeartHandshake;
                  iconColor = 'text-primary bg-primary/10';
                  labelText = 'Breeding record added';
                } else if (rec.type === 'feeding') {
                  Icon = Wheat;
                  iconColor = 'text-emerald-700 bg-emerald-100';
                  labelText = 'Feeding record added';
                }

                return (
                  <button
                    key={rec.id}
                    onClick={() => navigate(`/records/edit/${rec.id}`)}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                            {c?.id || rec.cattleId}
                          </span>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                            {labelText}
                          </span>
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-muted-foreground/80 truncate max-w-xs sm:max-w-md mt-0.5">
                            {rec.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 ml-3">
                      {formatRelativeTime(rec.date)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
