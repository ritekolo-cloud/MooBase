import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Download, TrendingUp, Activity, Calendar, Users, FileText, Syringe, AlertCircle } from 'lucide-react';
import { storage } from '../utils/storage';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function ReportsScreen() {
  const navigate = useNavigate();
  const [user] = useState(() => storage.getUser());

  useEffect(() => {
    if (user?.role !== 'manager') {
      toast.error('Only managers can access reports');
      navigate('/login');
    }
  }, [user, navigate]);

  const cattle = storage.getCattle();
  const records = storage.getRecords();

  // Health status distribution
  const statusData = [
    { name: 'Healthy', value: cattle.filter((c) => c.status === 'healthy').length, color: '#16A34A' },
    { name: 'Sick', value: cattle.filter((c) => c.status === 'sick').length, color: '#DC2626' },
    { name: 'Lactating', value: cattle.filter((c) => c.status === 'lactating').length, color: '#1E3A8A' },
    { name: 'Vaccinated', value: cattle.filter((c) => c.status === 'vaccinated').length, color: '#F59E0B' },
  ];

  // Records by type
  const recordsByType = [
    { name: 'Health', count: records.filter((r) => r.type === 'health').length },
    { name: 'Vaccination', count: records.filter((r) => r.type === 'vaccination').length },
    { name: 'Feeding', count: records.filter((r) => r.type === 'feeding').length },
    { name: 'Milk', count: records.filter((r) => r.type === 'milk').length },
    { name: 'Breeding', count: records.filter((r) => r.type === 'breeding').length },
  ];

  // Mock milk production trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      production: Math.floor(Math.random() * 50) + 100,
    };
  });

  const handleExport = () => {
    toast.success('Report exported successfully!', {
      description: 'PDF saved to Downloads folder',
    });
  };

  const kpis = [
    { label: 'Total Cattle', value: cattle.length, icon: Users },
    { label: 'Total Records', value: records.length, icon: FileText },
    { label: 'Vaccinations', value: records.filter((r) => r.type === 'vaccination').length, icon: Syringe },
    { label: 'Health Alerts', value: cattle.filter((c) => c.status === 'sick').length, icon: AlertCircle, danger: true },
  ];

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
            <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">Reports</h1>
          </div>
          <button
            onClick={handleExport}
            className="h-[48px] px-6 bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] font-semibold text-[14px] hover:bg-muted hover:border-[#1B5E20]/30 transition-all duration-150 ease-out flex items-center gap-2 active:scale-98"
          >
            <Download className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full space-y-8">

        {/* KPI Overview */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">Overview</h2>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[#1B5E20]/30 transition-all duration-150 ease-out"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-[22px] h-[22px] ${kpi.danger ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className="text-[14px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-[36px] font-bold text-foreground leading-none">{kpi.value}</p>
                </div>
              );
            })}
          </motion.div>
        </section>

        {/* Charts Grid */}
        <section className="space-y-4">
          <h2 className="text-[20px] font-semibold text-foreground tracking-tight">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Milk Production Line Chart */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
              className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-[22px] h-[22px] text-secondary" />
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">Milk Production</h3>
                  <p className="text-[14px] text-muted-foreground">Last 7 days (liters)</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', fontSize: '14px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="production"
                      stroke="#1E3A8A"
                      strokeWidth={2}
                      dot={{ fill: '#1E3A8A', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                  <h3 className="text-[18px] font-semibold text-foreground">Health Status</h3>
                  <p className="text-[14px] text-muted-foreground">Current distribution</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      innerRadius={55}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', fontSize: '14px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Records by Type Bar Chart - full width */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.15 }}
              className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)] md:col-span-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-[22px] h-[22px] text-primary" />
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">Records by Type</h3>
                  <p className="text-[14px] text-muted-foreground">Total records per category</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recordsByType} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F9FAFB' }}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', fontSize: '14px' }}
                      itemStyle={{ color: '#1B5E20' }}
                      labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                    />
                    <Bar dataKey="count" fill="#1B5E20" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

      </div>


    </div>
  );
}
