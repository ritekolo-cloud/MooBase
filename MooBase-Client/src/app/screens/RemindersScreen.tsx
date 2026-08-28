import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Syringe,
  HeartPulse,
  HeartHandshake,
  BellRing,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { farmDataService, Reminder, ReminderStatus } from '../services/farmDataService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const diffDays = Math.round(
    (date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `In ${diffDays} days`;
}

function formatBreedingDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReminderStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  Icon: React.ElementType;
}> = {
  overdue: {
    label: 'OVERDUE',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dotColor: 'bg-red-500',
    Icon: AlertTriangle,
  },
  attention: {
    label: 'ATTENTION',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dotColor: 'bg-orange-500',
    Icon: AlertTriangle,
  },
  due_today: {
    label: 'DUE TODAY',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500',
    Icon: Clock,
  },
  upcoming: {
    label: 'UPCOMING',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dotColor: 'bg-blue-500',
    Icon: BellRing,
  },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  vaccination: Syringe,
  sick_cattle: HeartPulse,
  breeding_followup: HeartHandshake,
};

type FilterTab = 'all' | 'overdue' | 'due_today' | 'upcoming' | 'attention';

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ reminder, onView }: { reminder: Reminder; onView: (id: string) => void }) {
  const statusCfg = STATUS_CONFIG[reminder.status];
  const TypeIcon = TYPE_ICONS[reminder.type] || BellRing;
  const StatusIcon = statusCfg.Icon;

  const dateLabel = reminder.type === 'vaccination' && reminder.dueDate
    ? formatRelativeDate(reminder.dueDate)
    : reminder.type === 'breeding_followup' && reminder.breedingDate
    ? `Pending since ${formatBreedingDate(reminder.breedingDate)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-2xl shadow-sm overflow-hidden ${statusCfg.border}`}
    >
      {/* Status stripe at top */}
      <div className={`h-1 w-full ${statusCfg.dotColor}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusCfg.label}
            </span>
          </div>

          {/* Type icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${statusCfg.bg}`}>
            <TypeIcon className={`w-5 h-5 ${statusCfg.text}`} />
          </div>
        </div>

        {/* Title + cattle */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-foreground">{reminder.title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-semibold text-foreground">{reminder.cattleName}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-mono text-muted-foreground">{reminder.cattleTag}</span>
          </div>
        </div>

        {/* Description / date */}
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {reminder.description}
          {dateLabel && <span className="ml-1 font-semibold">{dateLabel}</span>}
        </p>

        {/* Vaccine name chip */}
        {reminder.vaccineName && (
          <div className="mb-3">
            <span className="inline-block px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-md border border-accent/20">
              {reminder.vaccineName}
            </span>
          </div>
        )}

        {/* Footer: View button */}
        <button
          onClick={() => onView(reminder.cattleId)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-muted/60 hover:bg-muted rounded-xl text-xs font-bold text-foreground transition-colors cursor-pointer"
        >
          <span>View Cattle Profile</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due_today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'attention', label: 'Attention' },
];

export function RemindersScreen() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const fetchReminders = useCallback(async () => {
    setError(null);
    const result = await farmDataService.getReminders();

    if (result.ok) {
      setReminders(result.data.reminders);
      setIsOffline(result.fromCache);
      if (!result.fromCache) setLastSynced(new Date());
    } else {
      setError(result.error || 'Unable to load reminders. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReminders();

    const interval = setInterval(fetchReminders, 30_000);
    const handleFocus = () => fetchReminders();
    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchReminders();
    };
    const handleDataUpdate = () => fetchReminders();

    window.addEventListener('farm-data-updated', handleDataUpdate);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('farm-data-updated', handleDataUpdate);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [fetchReminders]);

  const filtered = activeFilter === 'all'
    ? reminders
    : reminders.filter((r) => r.status === activeFilter);

  // Count per filter for badges
  const counts: Record<FilterTab, number> = {
    all: reminders.length,
    overdue: reminders.filter((r) => r.status === 'overdue').length,
    due_today: reminders.filter((r) => r.status === 'due_today').length,
    upcoming: reminders.filter((r) => r.status === 'upcoming').length,
    attention: reminders.filter((r) => r.status === 'attention').length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans pb-16 md:pb-6">
      {/* Header */}
      <header
        className="px-6 pt-6 pb-8 text-white relative overflow-hidden"
        style={{ background: '#0F3D18' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-yellow-300" />
              <h1 className="text-xl font-bold tracking-tight">Tasks & Reminders</h1>
            </div>
            <button
              onClick={() => { setLoading(true); fetchReminders(); }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-white/70">
            Based on real livestock records in the database
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 -mt-3 space-y-4 flex-1">

        {/* Offline banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5"
            >
              <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Offline mode</p>
                <p className="text-xs text-amber-700">
                  Reminder data may be outdated.
                  {lastSynced && ` Last synced ${timeAgo(lastSynced.toISOString())}.`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary bar */}
        {!loading && !error && reminders.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Overdue', count: counts.overdue, color: 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Today', count: counts.due_today, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Upcoming', count: counts.upcoming, color: 'text-blue-600 bg-blue-50 border-blue-100' },
              { label: 'Attention', count: counts.attention, color: 'text-orange-600 bg-orange-50 border-orange-100' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-2 text-center ${s.color}`}>
                <div className="text-lg font-bold">{s.count}</div>
                <div className="text-[10px] font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0F3D18] text-white border-[#0F3D18]'
                  : 'bg-card text-muted-foreground border-border hover:border-[#0F3D18]/40'
              }`}
            >
              <Filter className="w-3 h-3" />
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl h-32 animate-pulse" />
            ))}
            <p className="text-center text-xs text-muted-foreground">Loading today's tasks...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-red-800">Unable to load reminders</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchReminders(); }}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              {reminders.length === 0 ? (
                <>
                  <p className="text-sm font-bold text-foreground">You're all caught up</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    No overdue or upcoming activities require attention right now.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-foreground">Nothing in this category</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different filter to see other reminders.
                  </p>
                </>
              )}
            </div>
            {reminders.length === 0 && (
              <button
                onClick={() => navigate('/cattle')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View cattle records →
              </button>
            )}
          </div>
        )}

        {/* Reminder cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onView={(cattleId) => navigate(`/cattle/profile/${cattleId}`)}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && (
          <p className="text-center text-[10px] text-muted-foreground pb-4">
            All reminders are based on actual records in the PostgreSQL database.
            {lastSynced && ` Last refreshed ${timeAgo(lastSynced.toISOString())}.`}
          </p>
        )}
      </div>
    </div>
  );
}
