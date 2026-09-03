import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Download,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  FileText,
  Syringe,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

interface ReportSummary {
  totalCattle: number;
  healthyCount: number;
  sickCount: number;
  lactatingCount: number;
  vaccinatedCount: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  totalRecords: number;
  healthCount: number;
  vaccinationCount: number;
  milkCount: number;
  breedingCount: number;
  feedingCount: number;
  recordsByType: Array<{ name: string; count: number }>;
  todayRecords: number;
  averageDailyMilk: number;
  totalMilkIn30Days: number;
  totalMilkAllTime: number;
}

interface MilkTrendPoint {
  date: string;
  rawDate: string;
  production: number;
  recordCount?: number;
}

interface VaccinationStatusItem {
  id: string;
  cattleId: string;
  cattleName: string;
  vaccineName: string;
  lastAdministered: string;
  dueDate: string;
  status: 'upcoming' | 'overdue';
}

interface SickCattleItem {
  cattleId: string;
  name: string;
  breed: string;
  description: string;
  treatment: string;
  vetName: string;
  dateDetected: string;
}

export function ReportsScreen() {
  const navigate = useNavigate();
  const [user] = useState(() => storage.getUser());

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [milkTrend, setMilkTrend] = useState<MilkTrendPoint[]>([]);
  const [vaccinationStatus, setVaccinationStatus] = useState<{
    overdue: VaccinationStatusItem[];
    upcoming: VaccinationStatusItem[];
  }>({ overdue: [], upcoming: [] });
  const [sickCattleList, setSickCattleList] = useState<SickCattleItem[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      toast.error('Only managers can access reports');
      navigate('/login');
    }
  }, [user, navigate]);

  const computeLocalAnalytics = useMemo(() => {
    return () => {
      const localCattle = storage.getCattle();
      const localRecords = storage.getRecords();

      const healthy = localCattle.filter((c) => c.status === 'healthy').length;
      const sick = localCattle.filter((c) => c.status === 'sick').length;
      const lactating = localCattle.filter((c) => c.status === 'lactating').length;
      const vaccinated = localCattle.filter((c) => c.status === 'vaccinated').length;

      const healthCount = localRecords.filter((r) => r.type === 'health').length;
      const vaccinationCount = localRecords.filter((r) => r.type === 'vaccination').length;
      const feedingCount = localRecords.filter((r) => r.type === 'feeding').length;
      const milkCount = localRecords.filter((r) => r.type === 'milk').length;
      const breedingCount = localRecords.filter((r) => r.type === 'breeding').length;

      const milkDays: MilkTrendPoint[] = [];
      let totalMilk7Days = 0;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const dayMilkRecords = localRecords.filter(
          (r) => r.type === 'milk' && r.date && r.date.startsWith(dateKey)
        );

        let dayTotal = 0;
        dayMilkRecords.forEach((r) => {
          const liters =
            Number(r.data?.liters) ||
            Number(r.data?.quantity) ||
            parseFloat(r.notes?.match(/(\d+(\.\d+)?)/)?.[1] || '0');
          dayTotal += isNaN(liters) ? 0 : liters;
        });

        totalMilk7Days += dayTotal;
        milkDays.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: dateKey,
          production: parseFloat(dayTotal.toFixed(1)),
          recordCount: dayMilkRecords.length,
        });
      }

      let allTimeMilk = 0;
      localRecords
        .filter((r) => r.type === 'milk')
        .forEach((r) => {
          const liters =
            Number(r.data?.liters) ||
            Number(r.data?.quantity) ||
            parseFloat(r.notes?.match(/(\d+(\.\d+)?)/)?.[1] || '0');
          allTimeMilk += isNaN(liters) ? 0 : liters;
        });

      const avgDaily = parseFloat((totalMilk7Days / 7).toFixed(1));

      const localSummaryData: ReportSummary = {
        totalCattle: localCattle.length,
        healthyCount: healthy,
        sickCount: sick,
        lactatingCount: lactating,
        vaccinatedCount: vaccinated,
        statusDistribution: [
          { name: 'Healthy', value: healthy, color: '#16A34A' },
          { name: 'Sick', value: sick, color: '#DC2626' },
          { name: 'Lactating', value: lactating, color: '#1E40AF' },
          { name: 'Vaccinated', value: vaccinated, color: '#D97706' },
        ],
        totalRecords: localRecords.length,
        healthCount,
        vaccinationCount,
        milkCount,
        breedingCount,
        feedingCount,
        recordsByType: [
          { name: 'Health', count: healthCount },
          { name: 'Vaccination', count: vaccinationCount },
          { name: 'Feeding', count: feedingCount },
          { name: 'Milk', count: milkCount },
          { name: 'Breeding', count: breedingCount },
        ],
        todayRecords: localRecords.filter(
          (r) => new Date(r.date).toDateString() === new Date().toDateString()
        ).length,
        averageDailyMilk: avgDaily,
        totalMilkIn30Days: totalMilk7Days,
        totalMilkAllTime: allTimeMilk,
      };

      return { localSummaryData, milkDays };
    };
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    setApiError(null);

    const token = localStorage.getItem('moobase_access_token') || '';

    try {
      const [summaryRes, milkRes, healthRes, vaccRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/reports/milk-production?days=7`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/reports/health-status`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/reports/vaccination-status`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!summaryRes.ok || !milkRes.ok) throw new Error(`API error ${summaryRes.status}`);

      const summaryData = await summaryRes.json();
      const milkData = await milkRes.json();
      const healthData = healthRes.ok ? await healthRes.json() : { data: [] };
      const vaccData = vaccRes.ok ? await vaccRes.json() : { data: { overdue: [], upcoming: [] } };

      const { unavailableMetrics: _dropped, ...cleanSummary } = summaryData.data || {};
      setSummary(cleanSummary);
      setMilkTrend(milkData.data);
      setSickCattleList(healthData.data || []);
      setVaccinationStatus(vaccData.data || { overdue: [], upcoming: [] });
      setIsUsingLocalData(false);
    } catch (err: any) {
      console.warn('Using local cache for reportsâ€¦', err);
      const { localSummaryData, milkDays } = computeLocalAnalytics();
      setSummary(localSummaryData);
      setMilkTrend(milkDays);
      setIsUsingLocalData(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCSV = () => {
    if (!summary) { toast.error('No data available to export'); return; }

    const rows: string[] = [];
    rows.push('KAYERA FARM - LIVESTOCK REPORTS & ANALYTICS');
    rows.push(`Generated,${new Date().toLocaleString()}`);
    rows.push('');
    rows.push('--- FARM OVERVIEW ---');
    rows.push('Metric,Value');
    rows.push(`Total Cattle,${summary.totalCattle}`);
    rows.push(`Healthy Cattle,${summary.healthyCount}`);
    rows.push(`Cattle Requiring Attention,${summary.sickCount}`);
    rows.push(`Lactating Cattle,${summary.lactatingCount}`);
    rows.push(`Vaccinated Cattle,${summary.vaccinatedCount}`);
    rows.push(`Total Records,${summary.totalRecords}`);
    rows.push(`Records Today,${summary.todayRecords}`);
    rows.push(`Average Daily Milk (L),${summary.averageDailyMilk}`);
    rows.push(`Total Milk Production (L),${summary.totalMilkAllTime}`);
    rows.push('');
    rows.push('--- MILK PRODUCTION (7 DAYS) ---');
    rows.push('Date,Litres,Records');
    milkTrend.forEach((m) => rows.push(`${m.rawDate || m.date},${m.production},${m.recordCount || 0}`));
    rows.push('');
    rows.push('--- RECORDS BY CATEGORY ---');
    rows.push('Category,Count');
    summary.recordsByType.forEach((r) => rows.push(`${r.name},${r.count}`));

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `kayera-farm-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  // Recent activity and per-category lists from local cache
  const { recentActivity, localRecordsByType } = useMemo(() => {
    if (!summary) return {
      recentActivity: [],
      localRecordsByType: { health: [], vaccination: [], milk: [], breeding: [], feeding: [] },
    };
    const cattle = storage.getCattle();
    const records = storage.getRecords();
    const cattleMap = Object.fromEntries(cattle.map((c) => [c.id, c]));

    const enrich = (r: any) => ({
      id: r.id,
      cattleName: cattleMap[r.cattleId]?.name || r.cattleId,
      tagNumber: cattleMap[r.cattleId]?.tagNumber || '',
      type: r.type,
      date: r.date,
      notes: r.notes,
      data: r.data,
    });

    const sorted = records
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const byType = (type: string) =>
      sorted.filter((r) => r.type === type).slice(0, 5).map(enrich);

    return {
      recentActivity: sorted.slice(0, 10).map(enrich),
      localRecordsByType: {
        health: byType('health'),
        vaccination: byType('vaccination'),
        milk: byType('milk'),
        breeding: byType('breeding'),
        feeding: byType('feeding'),
      },
    };
  }, [summary]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const recordTypeBadge: Record<string, string> = {
    health: 'bg-red-100 text-red-700',
    vaccination: 'bg-amber-100 text-amber-700',
    milk: 'bg-blue-100 text-blue-700',
    breeding: 'bg-purple-100 text-purple-700',
    feeding: 'bg-green-100 text-green-700',
  };

  const recordTypeLabel: Record<string, string> = {
    health: 'Health',
    vaccination: 'Vaccination',
    milk: 'Milk',
    breeding: 'Breeding',
    feeding: 'Feeding',
  };

  const RecordList = ({ items }: { items: any[] }) => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="divide-y divide-border">
        {items.map((r) => (
          <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {r.cattleName}
                {r.tagNumber && <span className="text-muted-foreground font-normal ml-1 text-xs">({r.tagNumber})</span>}
              </p>
              {r.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.notes}</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{fmtDate(r.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const EmptyCard = ({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) => (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
      <Icon className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col font-sans">

      {/* Page Header */}
      <div className="px-5 pt-6 pb-7 text-white" style={{ background: '#0F3D18' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/60 text-[11px] font-semibold tracking-widest uppercase mb-1">Kayera Farm</p>
              <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight">Reports &amp; Analytics</h1>
              <p className="text-white/65 text-sm mt-1">Monitor cattle records, health, production and farm activities.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <button
                onClick={loadReportData}
                disabled={isLoading}
                title="Refresh"
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isLoading || !summary}
                className="h-9 px-4 flex items-center gap-2 rounded-lg bg-white text-[#0F3D18] font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${isUsingLocalData ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'bg-green-400/20 text-green-200 border border-green-400/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUsingLocalData ? 'bg-amber-300' : 'bg-green-300'}`} />
              {isUsingLocalData ? 'Local records' : 'Live database'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 sm:px-6 py-6 max-w-[1280px] mx-auto w-full space-y-6">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full mb-4"
            />
            <p className="text-muted-foreground text-sm font-medium">Loading farm reports...</p>
          </div>
        ) : apiError ? (
          <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <h3 className="text-base font-semibold text-destructive">Could not load report data</h3>
            <p className="text-sm text-muted-foreground mt-1">{apiError}</p>
            <button onClick={loadReportData} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Try Again
            </button>
          </div>
        ) : summary ? (
          <>
            {/* 1. Farm Overview */}
            <section>
              <h2 className="text-[15px] font-bold text-foreground mb-3">Farm Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Cattle', value: summary.totalCattle, icon: Users, iconColor: 'text-[#1A5C2A]', bg: 'bg-green-50', alert: false },
                  { label: 'Healthy', value: summary.healthyCount, icon: CheckCircle2, iconColor: 'text-[#16A34A]', bg: 'bg-green-50', alert: false },
                  { label: 'Need Attention', value: summary.sickCount, icon: AlertCircle, iconColor: 'text-destructive', bg: 'bg-red-50', alert: summary.sickCount > 0 },
                  { label: 'Records Today', value: summary.todayRecords, icon: Clock, iconColor: 'text-[#1E40AF]', bg: 'bg-blue-50', alert: false },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-card border rounded-2xl p-4 shadow-sm ${kpi.alert ? 'border-red-200' : 'border-border'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${kpi.bg}`}>
                        <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                      </div>
                      <p className="text-[28px] font-bold text-foreground leading-none">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{kpi.label}</p>
                    </motion.div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Health Records', value: summary.healthCount },
                  { label: 'Vaccination Records', value: summary.vaccinationCount },
                  { label: 'Milk Records', value: summary.milkCount },
                  { label: 'Feeding Records', value: summary.feedingCount },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Charts */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Milk trend */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#1E40AF]" />
                  <h3 className="text-sm font-bold text-foreground">Milk Production - 7 Days</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Avg/day: <span className="font-semibold text-foreground">{summary.averageDailyMilk} L</span>
                  &nbsp;&middot;&nbsp; All-time: <span className="font-semibold text-foreground">{summary.totalMilkAllTime} L</span>
                </p>
                <div className="h-[200px]">
                  {milkTrend.length === 0 || milkTrend.every((m) => m.production === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="w-7 h-7 mb-2 opacity-30" />
                      <p className="text-sm">No milk records in the last 7 days</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={milkTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }} formatter={(val: any) => [`${val} L`, 'Milk']} />
                        <Line type="monotone" dataKey="production" stroke="#1E40AF" strokeWidth={2.5} dot={{ fill: '#1E40AF', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Herd status pie */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-[#16A34A]" />
                  <h3 className="text-sm font-bold text-foreground">Herd Health Status</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Current herd distribution by status</p>
                <div className="h-[200px]">
                  {summary.totalCattle === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-7 h-7 mb-2 opacity-30" />
                      <p className="text-sm">No cattle records yet</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={summary.statusDistribution.filter((d) => d.value > 0)} cx="50%" cy="50%" labelLine={false} outerRadius={80} innerRadius={48} dataKey="value" stroke="none">
                          {summary.statusDistribution.filter((d) => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }} formatter={(val: any) => [`${val} cattle`, '']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Records by category bar - full width */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Records by Category</h3>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{summary.totalRecords} total</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Breakdown of all logged farm activity</p>
                <div className="h-[200px]">
                  {summary.totalRecords === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="w-7 h-7 mb-2 opacity-30" />
                      <p className="text-sm">No records logged yet</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.recordsByType} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }} formatter={(val: any) => [`${val}`, 'Records']} />
                        <Bar dataKey="count" fill="#1A5C2A" radius={[6, 6, 0, 0]} maxBarSize={56} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            {/* 3. Health & Treatment */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Health &amp; Treatment</h2>
                <span className="text-xs text-muted-foreground font-semibold">{summary.healthCount} record{summary.healthCount !== 1 ? 's' : ''}</span>
              </div>
              {sickCattleList.length > 0 && (
                <div className="space-y-2 mb-3">
                  {sickCattleList.map((item) => (
                    <div key={item.cattleId} className="bg-card border border-red-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{item.name} &middot; <span className="font-normal text-muted-foreground">{item.breed}</span></span>
                        <span className="text-xs text-destructive font-medium">{fmtDate(item.dateDetected)}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      {item.treatment && <p className="text-xs mt-1"><span className="font-medium">Treatment:</span> {item.treatment}</p>}
                      {item.vetName && <p className="text-xs text-muted-foreground">Vet: {item.vetName}</p>}
                    </div>
                  ))}
                </div>
              )}
              {localRecordsByType.health.length > 0
                ? <RecordList items={localRecordsByType.health} />
                : sickCattleList.length === 0 && (
                  <EmptyCard icon={CheckCircle2} message="No health records available" sub="Health records logged by attendants will appear here." />
                )
              }
            </section>

            {/* 4. Vaccination Records */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Vaccination Records</h2>
                <span className="text-xs text-muted-foreground font-semibold">{summary.vaccinationCount} record{summary.vaccinationCount !== 1 ? 's' : ''}</span>
              </div>
              {(vaccinationStatus.overdue.length > 0 || vaccinationStatus.upcoming.length > 0) && (
                <div className="space-y-2 mb-3">
                  {vaccinationStatus.overdue.map((item) => (
                    <div key={item.id} className="bg-card border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                      <div><p className="text-sm font-semibold text-foreground">{item.cattleName}</p><p className="text-xs text-muted-foreground">{item.vaccineName}</p></div>
                      <span className="text-xs font-semibold text-destructive bg-red-50 px-2 py-1 rounded-lg">Overdue</span>
                    </div>
                  ))}
                  {vaccinationStatus.upcoming.map((item) => (
                    <div key={item.id} className="bg-card border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                      <div><p className="text-sm font-semibold text-foreground">{item.cattleName}</p><p className="text-xs text-muted-foreground">{item.vaccineName}</p></div>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Due {fmtDate(item.dueDate)}</span>
                    </div>
                  ))}
                </div>
              )}
              {localRecordsByType.vaccination.length > 0 ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-border">
                    {localRecordsByType.vaccination.map((r: any) => {
                      const vaccineMedicine =
                        r.data?.vaccineName ||
                        (typeof r.data === 'string'
                          ? (() => {
                              try {
                                return JSON.parse(r.data)?.vaccineName;
                              } catch (e) {
                                return null;
                              }
                            })()
                          : null) ||
                        (r.notes?.startsWith('Vaccine administered: ')
                          ? r.notes.replace('Vaccine administered: ', '').trim()
                          : null);
                      const observation =
                        r.data?.observation ||
                        (typeof r.data === 'string'
                          ? (() => {
                              try {
                                return JSON.parse(r.data)?.observation;
                              } catch (e) {
                                return null;
                              }
                            })()
                          : null) ||
                        (vaccineMedicine && r.notes === `Vaccine administered: ${vaccineMedicine}`
                          ? 'Standard administration logged'
                          : r.notes || 'No observation recorded');

                      return (
                        <div key={r.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {r.cattleName}
                                {r.tagNumber && (
                                  <span className="text-muted-foreground font-normal ml-1 text-xs">
                                    ({r.tagNumber})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-md text-xs font-bold border border-amber-500/25">
                                <Syringe className="w-3 h-3 text-amber-600" />
                                <span>Medicine: {vaccineMedicine || 'Vaccine Administered'}</span>
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">Observation:</span> {observation}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary" />
                              <span className="font-semibold text-foreground">Date of Vaccination:</span>{' '}
                              <span className="font-mono font-semibold text-foreground/90">{fmtDate(r.date)}</span>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 pt-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">
                              Vaccinated
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap font-mono font-semibold">
                              {fmtDate(r.date)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                vaccinationStatus.overdue.length === 0 &&
                vaccinationStatus.upcoming.length === 0 && (
                  <EmptyCard
                    icon={Syringe}
                    message="No vaccination records available"
                    sub="Vaccination records logged by attendants will appear here."
                  />
                )
              )}
            </section>

            {/* 5. Milk Production */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Milk Production</h2>
                <span className="text-xs text-muted-foreground font-semibold">{summary.milkCount} record{summary.milkCount !== 1 ? 's' : ''}</span>
              </div>
              {localRecordsByType.milk.length > 0 ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-border">
                    {localRecordsByType.milk.map((r) => {
                      const liters = r.data?.liters || r.data?.quantity || parseFloat(r.notes?.match(/(\d+(\.\d+)?)/)?.[1] || '0') || null;
                      return (
                        <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {r.cattleName}
                              {r.tagNumber && <span className="text-muted-foreground font-normal ml-1 text-xs">({r.tagNumber})</span>}
                            </p>
                            {liters ? (
                              <p className="text-xs text-[#1E40AF] font-semibold mt-0.5">{liters} L</p>
                            ) : r.notes ? (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.notes}</p>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{fmtDate(r.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyCard icon={TrendingUp} message="No milk production records available" sub="Milk production entries logged by attendants will appear here." />
              )}
            </section>

            {/* 6. Breeding Records */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Breeding Records</h2>
                <span className="text-xs text-muted-foreground font-semibold">{summary.breedingCount} record{summary.breedingCount !== 1 ? 's' : ''}</span>
              </div>
              {localRecordsByType.breeding.length > 0
                ? <RecordList items={localRecordsByType.breeding} />
                : <EmptyCard icon={Calendar} message="No breeding records available" sub="Breeding records logged by attendants will appear here." />
              }
            </section>

            {/* 7. Feeding Records */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Feeding Records</h2>
                <span className="text-xs text-muted-foreground font-semibold">{summary.feedingCount} record{summary.feedingCount !== 1 ? 's' : ''}</span>
              </div>
              {localRecordsByType.feeding.length > 0
                ? <RecordList items={localRecordsByType.feeding} />
                : <EmptyCard icon={FileText} message="No feeding records available" sub="Feeding records logged by attendants will appear here." />
              }
            </section>

            {/* 8. Recent Activity */}
            <section>
              <h2 className="text-[15px] font-bold text-foreground mb-3">Recent Activity</h2>
              {recentActivity.length > 0 ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-border">
                    {recentActivity.map((r) => (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${recordTypeBadge[r.type] || 'bg-muted text-foreground'}`}>
                          {recordTypeLabel[r.type] || r.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {r.cattleName}
                            {r.tagNumber && <span className="text-muted-foreground font-normal ml-1 text-xs">({r.tagNumber})</span>}
                          </p>
                          {r.notes && <p className="text-xs text-muted-foreground truncate">{r.notes}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{fmtDate(r.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyCard icon={Activity} message="No recent activity" sub="Farm activity logged by attendants will appear here." />
              )}
            </section>

          </>
        ) : null}
      </div>
    </div>
  );
}
