import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Heart,
  Syringe,
  Droplet,
  Users,
  Calendar,
  Edit,
  Plus,
} from 'lucide-react';
import { storage, Cattle, Record } from '../utils/storage';


export function CattleProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = storage.getUser();
  const [cattle, setCattle] = useState<Cattle | undefined>();
  const [records, setRecords] = useState<Record[]>([]);
  const [activeTab, setActiveTab] = useState<'health' | 'vaccination' | 'milk' | 'breeding'>(
    'health'
  );

  useEffect(() => {
    if (id) {
      const cattleData = storage.getCattleById(id);
      setCattle(cattleData);

      const cattleRecords = storage.getRecordsByCattleId(id);
      setRecords(cattleRecords);
    }
  }, [id]);

  if (!cattle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-medium text-[16px]">Cattle not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'health', label: 'Health', icon: Heart, type: 'health' },
    { id: 'vaccination', label: 'Vaccines', icon: Syringe, type: 'vaccination' },
    { id: 'milk', label: 'Milk', icon: Droplet, type: 'milk' },
    { id: 'breeding', label: 'Breeding', icon: Users, type: 'breeding' },
  ];

  const filteredRecords = records
    .filter((r) => r.type === activeTab)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      healthy: 'bg-success/10 text-success border-success/20',
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      lactating: 'bg-secondary/10 text-secondary border-secondary/20',
      vaccinated: 'bg-accent/10 text-accent border-accent/20',
    };
    return styles[status] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-[#E5E7EB] sticky top-0 z-30 transition-colors duration-150 ease-out">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cattle')}
              className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </button>
            <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">Cattle Profile</h1>
          </div>
          <button
            onClick={() => navigate(`/cattle/edit/${cattle.id}`)}
            className="h-[48px] px-5 bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] font-medium text-[14px] hover:bg-muted hover:border-[#1B5E20]/30 transition-all duration-150 ease-out flex items-center gap-2 active:scale-98"
          >
            <Edit className="w-[18px] h-[18px]" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full space-y-8">

        {/* Identity Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-start gap-5">
            <div className="w-[56px] h-[56px] rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center text-[22px] font-bold text-[#1B5E20] flex-shrink-0">
              {cattle.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight">{cattle.name}</h2>
              <p className="text-[14px] text-muted-foreground mt-1">{cattle.breed} • {cattle.age} years old</p>
              <div className="mt-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold uppercase tracking-wider border ${getStatusBadge(cattle.status)}`}>
                  {cattle.status}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Details Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
          className="space-y-4"
        >
          <h3 className="text-[20px] font-semibold text-foreground tracking-tight">Details</h3>
          <div className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="divide-y divide-[#E5E7EB]">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[14px] font-medium text-muted-foreground">Cattle ID</span>
                <span className="text-[14px] font-semibold text-foreground font-mono">{cattle.id}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[14px] font-medium text-muted-foreground">Breed</span>
                <span className="text-[14px] font-semibold text-foreground">{cattle.breed}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[14px] font-medium text-muted-foreground">Age</span>
                <span className="text-[14px] font-semibold text-foreground">{cattle.age} years</span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[14px] font-medium text-muted-foreground">Last Updated</span>
                <span className="text-[14px] font-semibold text-foreground font-mono">
                  {new Date(cattle.lastUpdate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Records Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[20px] font-semibold text-foreground tracking-tight">Records</h3>
            <button
              onClick={() => navigate('/records/add', { state: { cattleId: id, type: activeTab } })}
              className="text-[14px] font-semibold text-[#1B5E20] hover:underline transition-colors duration-150 ease-out flex items-center gap-1"
            >
              <Plus className="w-[14px] h-[14px]" />
              <span>Add Record</span>
            </button>
          </div>

          {/* Segmented Tab Control */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-[10px]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-[14px] font-semibold transition-all duration-150 ease-out ${
                    activeTab === tab.id
                      ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card border border-border rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
              <Calendar className="w-[22px] h-[22px] text-muted-foreground mx-auto mb-3" />
              <h4 className="text-[18px] font-semibold text-foreground mb-1">No {activeTab} records</h4>
              <p className="text-[14px] text-muted-foreground mb-4 font-medium">Start tracking by adding the first record.</p>
              <button
                onClick={() => navigate('/records/add', { state: { cattleId: id, type: activeTab } })}
                className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-medium text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] mx-auto active:scale-98"
              >
                <Plus className="w-[18px] h-[18px]" />
                <span>Add Record</span>
              </button>
            </div>
          ) : (
            <div className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="divide-y divide-[#E5E7EB]">
                {filteredRecords.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => navigate(`/records/edit/${record.id}`)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-150 ease-out text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[10px] bg-background border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 transition-colors duration-150 ease-out">
                        <Calendar className="w-[18px] h-[18px] text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[16px] font-semibold text-foreground capitalize group-hover:text-primary transition-colors duration-150 ease-out">{record.type}</h4>
                        <p className="text-[14px] text-muted-foreground truncate max-w-[200px] md:max-w-md">{record.notes}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {!record.synced && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[12px] font-semibold rounded-md border border-accent/20">
                          Pending
                        </span>
                      )}
                      <span className="text-[14px] text-muted-foreground font-semibold font-mono">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>


    </div>
  );
}
