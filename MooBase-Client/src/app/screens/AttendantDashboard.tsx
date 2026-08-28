import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
  HeartPulse,
  Syringe,
  Milk,
  PlusCircle,
  Cloud,
  ChevronRight,
  ArrowRight,
  AlertOctagon,
  Sparkles,
  Wheat,
  Clock,
  HeartHandshake,
} from 'lucide-react';
import { storage, Cattle, Record as CattleRecord } from '../utils/storage';
import { useEffect, useState } from 'react';
import { farmDataService, DashboardSummary } from '../services/farmDataService';

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

export function AttendantDashboard() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState<Cattle[]>(storage.getCattle());
  const [records, setRecords] = useState<CattleRecord[]>(storage.getRecords());
  const [syncQueue, setSyncQueue] = useState(storage.getSyncQueue());
  const [user, setUser] = useState(storage.getUser());
  const [serverStats, setServerStats] = useState<DashboardSummary | null>(null);

  const fetchServerData = async () => {
    const result = await farmDataService.getDashboardSummary();
    if (result.ok) {
      setServerStats(result.data);
      setCattle(storage.getCattle());
      setRecords(storage.getRecords());
    }
    setSyncQueue(storage.getSyncQueue());
    setUser(storage.getUser());
  };

  useEffect(() => {
    if (!user || user.role !== 'attendant') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchServerData();
    const interval = setInterval(fetchServerData, 30_000);

    const handleFocus = () => fetchServerData();
    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchServerData();
    };
    const handleDataUpdate = () => {
      setCattle(storage.getCattle());
      setRecords(storage.getRecords());
      setSyncQueue(storage.getSyncQueue());
      setUser(storage.getUser());
      fetchServerData();
    };

    window.addEventListener('profile-updated', handleDataUpdate);
    window.addEventListener('farm-data-updated', handleDataUpdate);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('profile-updated', handleDataUpdate);
      window.removeEventListener('farm-data-updated', handleDataUpdate);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  // Use authoritative server stats when available
  const sickCattle = serverStats?.sickCattleList || cattle.filter((c) => c.status === 'sick');
  const requireAttentionCount = serverStats?.requireAttention ?? sickCattle.length;

  const todayDateStr = new Date().toDateString();
  const todayRecords = records.filter(
    (r) => new Date(r.date).toDateString() === todayDateStr
  );

  const assignedCattle = serverStats?.assignedCattle || cattle.slice(0, 8);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.username?.charAt(0).toUpperCase() || 'A';

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
                Attendant Portal
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sync Status Button */}
              <button
                onClick={() => navigate('/sync')}
                className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer text-white"
                title={syncQueue.length > 0 ? `${syncQueue.length} pending sync items` : 'All records synced'}
              >
                <Cloud className="w-5 h-5" />
                {syncQueue.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0F3D18]">
                    {syncQueue.length}
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
              <span>{greetingTime}, {user?.name || 'Attendant'}</span>
              <span className="inline-block animate-pulse">👋</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 mt-1 font-normal">
              Your daily farm records and animal management dashboard.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 -mt-6 space-y-6 flex-1 relative z-20">
        
        {/* Offline Sync Alert if pending items */}
        {syncQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {syncQueue.length} Pending Local Record{syncQueue.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-amber-700 font-medium">
                  Stored securely on device. Will auto-sync when online.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/sync')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Sync Now
            </button>
          </motion.div>
        )}

        {/* 4 Task Summary Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Records Added Today */}
          <div
            onClick={() => navigate('/records/add')}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Today's Records
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                  {todayRecords.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[#1B5E20] group-hover:translate-x-0.5 transition-transform mt-3">
              <span>+ Add record</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Total Cattle */}
          <div
            onClick={() => navigate('/cattle')}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Total Herd
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                  {cattle.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                <CowOutlineIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-3">
              <span>View cattle</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Require Attention */}
          <div
            onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-destructive/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Sick / Alert
                </span>
                <span className={`text-2xl sm:text-3xl font-bold mt-1 block ${requireAttentionCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {requireAttentionCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-destructive group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View sick</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Healthy Animals */}
          <div
            onClick={() => navigate('/cattle', { state: { filter: 'healthy' } })}
            className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md hover:border-emerald-600/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground block">
                  Healthy Herd
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1 block">
                  {cattle.filter((c) => c.status === 'healthy').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform mt-3">
              <span>View healthy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </section>

        {/* Attention Alert Banner if sick animals exist */}
        {requireAttentionCount > 0 && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive text-white flex items-center justify-center flex-shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-destructive uppercase">
                  {requireAttentionCount} Cattle Need Treatment / Attention
                </h3>
                <p className="text-xs text-destructive/80 font-medium">
                  Review sick animals and record treatments promptly.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cattle', { state: { filter: 'sick' } })}
              className="px-3.5 py-1.5 bg-destructive text-white text-xs font-bold rounded-xl hover:bg-destructive/90 transition-colors flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Task Actions Grid (Task oriented for attendant) */}
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
            Record Daily Farm Activities
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Health Record */}
            <button
              onClick={() => navigate('/records/add', { state: { type: 'health' } })}
              className="bg-card border border-border hover:border-destructive/40 hover:bg-destructive/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-destructive">
                Health Record
              </span>
            </button>

            {/* 2. Vaccination */}
            <button
              onClick={() => navigate('/records/add', { state: { type: 'vaccination' } })}
              className="bg-card border border-border hover:border-accent/40 hover:bg-accent/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Syringe className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-accent">
                Vaccination
              </span>
            </button>

            {/* 3. Milk Production */}
            <button
              onClick={() => navigate('/records/add', { state: { type: 'milk' } })}
              className="bg-card border border-border hover:border-secondary/40 hover:bg-secondary/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Milk className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-secondary">
                Milk Record
              </span>
            </button>

            {/* 4. Feeding */}
            <button
              onClick={() => navigate('/records/add', { state: { type: 'feeding' } })}
              className="bg-card border border-border hover:border-emerald-600/40 hover:bg-emerald-600/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Wheat className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-700">
                Feeding
              </span>
            </button>
          </div>
        </section>

        {/* Assigned Cattle Herd Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
              Farm Herd Quick Access
            </h2>
            <button
              onClick={() => navigate('/cattle')}
              className="text-xs font-bold text-[#1B5E20] hover:underline"
            >
              View All ({cattle.length})
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
            {assignedCattle.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">No cattle records found</p>
              </div>
            ) : (
              assignedCattle.map((animal) => {
                let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (animal.status === 'sick') badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
                else if (animal.status === 'lactating') badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                else if (animal.status === 'vaccinated') badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <button
                    key={animal.id}
                    onClick={() => navigate(`/cattle/profile/${animal.id}`)}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-sm text-foreground flex-shrink-0 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                        {animal.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {animal.name}
                          </h4>
                          <span className="text-xs font-mono text-muted-foreground">
                            ({animal.id})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span>{animal.breed}</span>
                          <span>•</span>
                          <span>{animal.age} yrs</span>
                          <span>•</span>
                          <span>{animal.gender === 'male' ? '♂ Male' : '♀ Female'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${badgeBg}`}>
                        {animal.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
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
