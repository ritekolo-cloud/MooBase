import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  HeartPulse,
  Syringe,
  Milk,
  HeartHandshake,
  Calendar,
  Edit,
  Plus,
  Wheat,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { storage, Cattle, Record as CattleRecord } from '../utils/storage';
import { API_BASE_URL } from '../config/api';

export function CattleProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = storage.getUser();
  const [cattle, setCattle] = useState<Cattle | undefined>();
  const [records, setRecords] = useState<CattleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'health' | 'vaccination' | 'milk' | 'breeding' | 'feeding'>('health');

  useEffect(() => {
    if (id) {
      // 1. Initial load from local cache
      const cattleData = storage.getCattleById(id);
      setCattle(cattleData);

      const cattleRecords = storage.getRecordsByCattleId(id);
      setRecords(cattleRecords);

      // 2. Fetch fresh detail from backend
      const token = localStorage.getItem('moobase_access_token');
      if (token && navigator.onLine) {
        fetch(`${API_BASE_URL}/cattle/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json?.status === 'success' && json.data) {
              const freshCattle: Cattle = {
                id: json.data.id,
                tagNumber: json.data.tagNumber || `TAG-${json.data.id}`,
                name: json.data.name,
                breed: json.data.breed,
                age: json.data.age,
                gender: json.data.gender,
                status: json.data.status,
                lastUpdate: json.data.lastUpdate || new Date().toISOString(),
              };
              setCattle(freshCattle);
              storage.updateCattle(id, freshCattle);

              if (Array.isArray(json.data.records)) {
                setRecords(json.data.records);
                const otherRecords = storage.getRecords().filter((r) => r.cattleId !== id);
                storage.setRecords([...otherRecords, ...json.data.records]);
              }
            }
          })
          .catch((err) => console.warn('Non-fatal: Could not refresh cattle details:', err));
      }
    }

    const handleUpdate = () => {
      if (id) {
        setCattle(storage.getCattleById(id));
        setRecords(storage.getRecordsByCattleId(id));
      }
    };

    window.addEventListener('farm-data-updated', handleUpdate);
    return () => {
      window.removeEventListener('farm-data-updated', handleUpdate);
    };
  }, [id]);

  if (!cattle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Cattle Not Found</h2>
          <p className="text-xs text-muted-foreground mb-4">
            No animal with ID #{id} was found in the Kayera Farm registry.
          </p>
          <button
            onClick={() => navigate('/cattle')}
            className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl"
          >
            Back to Cattle List
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'health', label: 'Health', icon: HeartPulse, count: records.filter((r) => r.type === 'health').length },
    { id: 'vaccination', label: 'Vaccines', icon: Syringe, count: records.filter((r) => r.type === 'vaccination').length },
    { id: 'milk', label: 'Milk', icon: Milk, count: records.filter((r) => r.type === 'milk').length },
    { id: 'breeding', label: 'Breeding', icon: HeartHandshake, count: records.filter((r) => r.type === 'breeding').length },
    { id: 'feeding', label: 'Feeding', icon: Wheat, count: records.filter((r) => r.type === 'feeding').length },
  ];

  const filteredRecords = records
    .filter((r) => r.type === activeTab)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'sick':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'lactating':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'vaccinated':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getVaccineMedicine = (rec: CattleRecord) => {
    if (rec.data?.vaccineName) return rec.data.vaccineName;
    if (typeof rec.data === 'string') {
      try {
        const parsed = JSON.parse(rec.data);
        if (parsed?.vaccineName) return parsed.vaccineName;
      } catch (e) {}
    }
    if (rec.notes && rec.notes.startsWith('Vaccine administered: ')) {
      return rec.notes.replace('Vaccine administered: ', '').trim();
    }
    return null;
  };

  const getVaccineObservation = (rec: CattleRecord, med: string | null) => {
    if (rec.data?.observation) return rec.data.observation;
    if (typeof rec.data === 'string') {
      try {
        const parsed = JSON.parse(rec.data);
        if (parsed?.observation) return parsed.observation;
      } catch (e) {}
    }
    if (rec.notes) {
      if (med && rec.notes === `Vaccine administered: ${med}`) {
        return 'Administered without adverse reactions noted';
      }
      return rec.notes;
    }
    return 'No specific observation recorded';
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Top Green Banner */}
      <div
        className="px-4 sm:px-6 pt-6 pb-8 text-white relative shadow-sm"
        style={{ background: '#0F3D18' }}
      >
        <div className="max-w-[1240px] mx-auto">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <button
              onClick={() => navigate('/cattle')}
              className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Cattle List</span>
            </button>

            {user?.role === 'manager' && (
              <button
                onClick={() => navigate(`/cattle/edit/${cattle.id}`)}
                className="h-9 px-4 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Cattle Hero Identity Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-inner flex-shrink-0">
                {cattle.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {cattle.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/20 text-white border border-white/20">
                    {cattle.tagNumber || cattle.id}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium flex items-center gap-2">
                  <span>{cattle.breed}</span>
                  <span>•</span>
                  <span>{cattle.age} years old</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold border uppercase tracking-wider ${
                  cattle.status === 'healthy'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : cattle.status === 'sick'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                    : 'bg-white/20 text-white border-white/30'
                }`}
              >
                ● {cattle.status}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/20">
                {cattle.gender === 'male' ? '♂ Male (Bull)' : '♀ Female (Cow)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 -mt-4 space-y-6 flex-1 relative z-20">
        
        {/* Animal Vital Details Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Animal Identification & Specs
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block">Breed</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">{cattle.breed}</span>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block">Age</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">{cattle.age} Years</span>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block">Sex / Gender</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">
                {cattle.gender === 'male' ? 'Male ♂' : 'Female ♀'}
              </span>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block">Total Records</span>
              <span className="text-sm font-bold text-primary mt-0.5 block">{records.length} entries</span>
            </div>
          </div>
        </div>

        {/* Records Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase">
              Activity & Medical History
            </h2>
            <button
              onClick={() => navigate('/records/add', { state: { cattleId: cattle.id, type: activeTab } })}
              className="h-9 px-3.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Record</span>
            </button>
          </div>

          {/* Tab Selection Pills */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border rounded-xl overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtered Records List */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {filteredRecords.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-foreground mb-1">
                  No {activeTab} records for {cattle.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-4 font-medium">
                  Keep this animal's records up to date by adding a new log.
                </p>
                <button
                  onClick={() => navigate('/records/add', { state: { cattleId: cattle.id, type: activeTab } })}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Record</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRecords.map((record) => {
                  const isVaccination = record.type === 'vaccination';
                  const vaccineMedicine = isVaccination ? getVaccineMedicine(record) : null;
                  const vaccineObservation = isVaccination ? getVaccineObservation(record, vaccineMedicine) : null;
                  const formattedDate = new Date(record.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/edit/${record.id}`)}
                      className="w-full px-4 sm:px-5 py-4 flex items-start justify-between hover:bg-muted/30 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isVaccination
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                              : 'bg-muted border-border text-foreground'
                          }`}
                        >
                          {isVaccination ? (
                            <Syringe className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 space-y-1.5 flex-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground capitalize group-hover:text-primary transition-colors">
                              {isVaccination ? 'Vaccination Record' : `${record.type} Log`}
                            </h4>
                            {!record.synced && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                Local / Unsynced
                              </span>
                            )}
                          </div>

                          {isVaccination ? (
                            <div className="space-y-1.5">
                              {/* Medicine Vaccinated */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 rounded-lg text-xs font-bold shadow-2xs">
                                  <Syringe className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Medicine: {vaccineMedicine || 'Vaccine Administered'}</span>
                                </span>
                              </div>

                              {/* Observation */}
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">Observation:</span>{' '}
                                {vaccineObservation}
                              </p>

                              {/* Date of Vaccination */}
                              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold text-foreground">Date of Vaccination:</span>{' '}
                                <span className="font-mono font-semibold text-foreground/90">{formattedDate}</span>
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {record.notes}
                              </p>
                              {record.data && typeof record.data === 'object' && record.data.liters && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold border border-blue-200">
                                  🥛 {record.data.liters} Liters
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-3 pt-1">
                        <div className="text-right">
                          {isVaccination && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Vaccinated
                            </span>
                          )}
                          <span className="text-xs font-mono font-semibold text-muted-foreground">
                            {formattedDate}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
