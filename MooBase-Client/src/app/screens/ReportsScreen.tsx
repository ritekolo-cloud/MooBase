import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
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
  Info,
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
  soldCount?: number;
  deadCount?: number;
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
  unavailableMetrics?: Array<{ id: string; name: string; reason: string }>;
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

  // Live Analytical State
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

  // Compute read-only operational analytics from local storage cache
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

      // 7-day continuous milk production from operational milk records
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

      // Total milk across all operational records
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
          { name: 'Lactating', value: lactating, color: '#1E3A8A' },
          { name: 'Vaccinated', value: vaccinated, color: '#F59E0B' },
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
        unavailableMetrics: [
          {
            id: 'financial_revenue',
            name: 'Milk Sales & Financial Revenue',
            reason: 'Missing pricePerLiter or sales transaction table in database schema',
          },
          {
            id: 'feed_conversion_ratio',
            name: 'Feed Weight & Cost Analysis',
            reason: 'FeedingRecord stores unstructured notes; lacks weightKg and costPerKg fields',
          },
          {
            id: 'calving_projections',
            name: 'Expected Calving Projections',
            reason: 'BreedingRecord lacks expectedCalvingDate and inseminationType fields',
          },
        ],
      };

      return { localSummaryData, milkDays };
    };
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    setApiError(null);

    const token = localStorage.getItem('moobase_access_token') || '';

    try {
      // 1. Fetch live analytical summary from backend
      const [summaryRes, milkRes, healthRes, vaccRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/milk-production?days=7`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/health-status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/vaccination-status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!summaryRes.ok || !milkRes.ok) {
        throw new Error(`Analytics API returned status ${summaryRes.status}`);
      }

      const summaryData = await summaryRes.json();
      const milkData = await milkRes.json();
      const healthData = healthRes.ok ? await healthRes.json() : { data: [] };
      const vaccData = vaccRes.ok ? await vaccRes.json() : { data: { overdue: [], upcoming: [] } };

      setSummary(summaryData.data);
      setMilkTrend(milkData.data);
      setSickCattleList(healthData.data || []);
      setVaccinationStatus(vaccData.data || { overdue: [], upcoming: [] });
      setIsUsingLocalData(false);
    } catch (err: any) {
      console.warn('Could not fetch online analytics. Analyzing local operational records...', err);
      // Operational offline fallback: calculate exact metrics from locally cached operational records
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

  // CSV Export generated directly from actual analytical dataset
  const handleExportCSV = () => {
    if (!summary) {
      toast.error('No analytical data available to export');
      return;
    }

    const rows: string[] = [];
    rows.push('KAYERA FARM ANALYTICAL REPORT');
    rows.push(`Generated On,${new Date().toISOString()}`);
    rows.push(`Data Source,${isUsingLocalData ? 'Local Operational Cache' : 'Authoritative Backend Database'}`);
    rows.push('');

    // Summary Section
    rows.push('--- EXECUTIVE SUMMARY ---');
    rows.push('Metric,Value');
    rows.push(`Total Cattle,${summary.totalCattle}`);
    rows.push(`Healthy Cattle,${summary.healthyCount}`);
    rows.push(`Sick Cattle (Alerts),${summary.sickCount}`);
    rows.push(`Lactating Cattle,${summary.lactatingCount}`);
    rows.push(`Vaccinated Cattle,${summary.vaccinatedCount}`);
    rows.push(`Total Records Logged,${summary.totalRecords}`);
    rows.push(`Average Daily Milk (Liters),${summary.averageDailyMilk}`);
    rows.push(`Total Milk Production (Liters),${summary.totalMilkAllTime}`);
    rows.push('');

    // Milk Production Table
    rows.push('--- 7-DAY MILK PRODUCTION ---');
    rows.push('Date,Liters Produced,Records Count');
    milkTrend.forEach((m) => {
      rows.push(`${m.rawDate || m.date},${m.production},${m.recordCount || 0}`);
    });
    rows.push('');

    // Records by Category Table
    rows.push('--- RECORDS BY CATEGORY ---');
    rows.push('Category,Record Count');
    summary.recordsByType.forEach((r) => {
      rows.push(`${r.name},${r.count}`);
    });
    rows.push('');

    // Data Dependency Gaps Section
    if (summary.unavailableMetrics && summary.unavailableMetrics.length > 0) {
      rows.push('--- IDENTIFIED SCHEMA DATA DEPENDENCY GAPS ---');
      rows.push('Metric,Status,Reason');
      summary.unavailableMetrics.forEach((g) => {
        rows.push(`"${g.name}",Unavailable,"${g.reason}"`);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `kayera-farm-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Kayera Farm analytical report exported as CSV!');
  };

  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total Cattle',
        value: summary.totalCattle,
        icon: Users,
        onClick: () => navigate('/cattle'),
      },
      {
        label: 'Total Records',
        value: summary.totalRecords,
        icon: FileText,
        onClick: () => navigate('/cattle'),
      },
      {
        label: 'Vaccinations',
        value: summary.vaccinationCount,
        icon: Syringe,
        onClick: () => navigate('/cattle', { state: { filter: 'vaccinated' } }),
      },
      {
        label: 'Health Alerts',
        value: summary.sickCount,
        icon: AlertCircle,
        danger: summary.sickCount > 0,
        onClick: () => navigate('/cattle', { state: { filter: 'sick' } }),
      },
    ];
  }, [summary, navigate]);

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-[#E5E7EB] sticky top-0 z-20 transition-colors duration-150 ease-out">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manager/dashboard')}
              className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </button>
            <div>
              <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">
                Farm Reports
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${
                    isUsingLocalData
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isUsingLocalData ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  />
                  {isUsingLocalData ? 'Local Operational Analytics' : 'Authoritative Database Analytics'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadReportData}
              disabled={isLoading}
              className="h-[44px] px-3.5 bg-card border border-border text-foreground rounded-[10px] text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              title="Refresh analytical queries"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={isLoading || !summary}
              className="h-[44px] px-6 bg-primary text-primary-foreground rounded-[10px] font-semibold text-[14px] hover:bg-primary/90 transition-all duration-150 ease-out flex items-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98 disabled:opacity-50"
            >
              <Download className="w-[18px] h-[18px]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full mb-4"
            />
            <p className="text-muted-foreground text-sm font-medium">
              Aggregating operational database records...
            </p>
          </div>
        ) : apiError ? (
          <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <h3 className="text-base font-semibold text-destructive">Analytics Query Error</h3>
            <p className="text-sm text-muted-foreground mt-1">{apiError}</p>
            <button
              onClick={loadReportData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Retry Database Queries
            </button>
          </div>
        ) : summary ? (
          <>
            {/* KPI Overview */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
                  Overview KPIs
                </h2>
                <span className="text-xs text-muted-foreground">
                  Today's Activity: {summary.todayRecords} logs
                </span>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <button
                      key={kpi.label}
                      onClick={kpi.onClick}
                      className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 hover:bg-muted/30 transition-all duration-150 ease-out text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon
                          className={`w-[22px] h-[22px] ${
                            kpi.danger ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        />
                        <span className="text-[14px] font-medium text-muted-foreground">
                          {kpi.label}
                        </span>
                      </div>
                      <p className="text-[36px] font-bold text-foreground leading-none">
                        {kpi.value}
                      </p>
                    </button>
                  );
                })}
              </motion.div>
            </section>

            {/* Charts Grid */}
            <section className="space-y-4">
              <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
                Operational Analytics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Real Milk Production Line Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
                  className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-[22px] h-[22px] text-secondary" />
                      <div>
                        <h3 className="text-[18px] font-semibold text-foreground">
                          Milk Production Trend
                        </h3>
                        <p className="text-[14px] text-muted-foreground">
                          Continuous 7-day output (liters)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground font-medium block">Avg/Day</span>
                      <span className="text-sm font-bold text-foreground">
                        {summary.averageDailyMilk} L
                      </span>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    {milkTrend.length === 0 || milkTrend.every((m) => m.production === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Calendar className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm font-medium">No milk production logs in past 7 days</p>
                        <p className="text-xs mt-0.5">Recorded daily yields will display here</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={milkTrend}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '10px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                              fontSize: '14px',
                            }}
                            labelStyle={{
                              fontWeight: 'bold',
                              color: '#111827',
                              marginBottom: '4px',
                            }}
                            formatter={(val: any) => [`${val} Liters`, 'Yield']}
                          />
                          <Line
                            type="monotone"
                            dataKey="production"
                            stroke="#1E3A8A"
                            strokeWidth={2.5}
                            dot={{ fill: '#1E3A8A', r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </motion.div>

                {/* Health Status Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
                  className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-[22px] h-[22px] text-success" />
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">Herd Health Status</h3>
                      <p className="text-[14px] text-muted-foreground">Current herd distribution</p>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    {summary.totalCattle === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Users className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm font-medium">No cattle records in database</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={summary.statusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={90}
                            innerRadius={55}
                            dataKey="value"
                            stroke="none"
                          >
                            {summary.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: '10px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                              fontSize: '14px',
                            }}
                            formatter={(val: any) => [`${val} Animals`, 'Count']}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </motion.div>

                {/* Records by Type Bar Chart - full width */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: 0.15 }}
                  className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] md:col-span-2"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-[22px] h-[22px] text-primary" />
                      <div>
                        <h3 className="text-[18px] font-semibold text-foreground">
                          Logged Operational Records by Entity
                        </h3>
                        <p className="text-[14px] text-muted-foreground">
                          Breakdown across health, vaccination, feeding, milk, breeding tables
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {summary.totalRecords} Total Logs
                    </span>
                  </div>
                  <div className="h-[250px] w-full">
                    {summary.totalRecords === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm font-medium">No operational records logged yet</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={summary.recordsByType}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: '#F9FAFB' }}
                            contentStyle={{
                              borderRadius: '10px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                              fontSize: '14px',
                            }}
                            itemStyle={{ color: '#1B5E20' }}
                            labelStyle={{
                              fontWeight: 'bold',
                              color: '#111827',
                              marginBottom: '4px',
                            }}
                            formatter={(val: any) => [`${val} Entries`, 'Logged']}
                          />
                          <Bar dataKey="count" fill="#1B5E20" radius={[6, 6, 0, 0]} maxBarSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Vaccination & Health Schedules Breakdown */}
            {(vaccinationStatus.overdue.length > 0 ||
              vaccinationStatus.upcoming.length > 0 ||
              sickCattleList.length > 0) && (
              <section className="space-y-4">
                <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
                  Medical & Veterinary Logs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vaccination Schedule Table */}
                  <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                      <Syringe className="w-5 h-5 text-primary" />
                      <h3 className="text-base font-semibold text-foreground">
                        Vaccination Status Tracking
                      </h3>
                    </div>
                    {vaccinationStatus.overdue.length === 0 &&
                    vaccinationStatus.upcoming.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No upcoming or overdue vaccinations.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 divide-y divide-border">
                        {vaccinationStatus.overdue.map((item) => (
                          <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{item.cattleName}</p>
                              <p className="text-muted-foreground">{item.vaccineName}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                              Overdue ({new Date(item.dueDate).toLocaleDateString()})
                            </span>
                          </div>
                        ))}
                        {vaccinationStatus.upcoming.map((item) => (
                          <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{item.cattleName}</p>
                              <p className="text-muted-foreground">{item.vaccineName}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border font-medium">
                              Due: {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sick Cattle Treatments Table */}
                  <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <h3 className="text-base font-semibold text-foreground">
                        Active Health Treatments
                      </h3>
                    </div>
                    {sickCattleList.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-success gap-2 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All herd members currently healthy. No active treatments.</span>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {sickCattleList.map((item) => (
                          <div
                            key={item.cattleId}
                            className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs"
                          >
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span>
                                {item.name} ({item.breed})
                              </span>
                              <span className="text-destructive font-medium">
                                {new Date(item.dateDetected).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1">{item.description}</p>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Rx: {item.treatment}</span>
                              <span>Vet: {item.vetName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Identified Data Dependency Gaps Section */}
            <section className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">
                  Identified Schema Data Dependencies & Gaps
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                The following analytical dimensions cannot currently be calculated because the
                underlying operational database schema does not capture these attributes. They are
                explicitly documented here rather than fabricated.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.unavailableMetrics?.map((gap) => (
                  <div
                    key={gap.id}
                    className="p-4 bg-muted/40 border border-border rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{gap.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-semibold border border-border">
                        Unavailable
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{gap.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
