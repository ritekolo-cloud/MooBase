import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Info,
  HeartPulse,
  Syringe,
  Milk,
  HeartHandshake,
  Wheat,
} from 'lucide-react';
import { storage, Record as CattleRecord } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function AddRecordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const user = storage.getUser();
  const isEditMode = !!id;

  const [cattleId, setCattleId] = useState(location.state?.cattleId || '');
  const [recordType, setRecordType] = useState<CattleRecord['type']>(
    location.state?.type || 'health'
  );
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalData, setAdditionalData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const cattle = storage.getCattle();

  const recordTypes: { value: CattleRecord['type']; label: string; icon: any; colorClass: string }[] = [
    { value: 'health', label: 'Health & Illness', icon: HeartPulse, colorClass: 'text-destructive' },
    { value: 'vaccination', label: 'Vaccination', icon: Syringe, colorClass: 'text-accent' },
    { value: 'milk', label: 'Milk Production', icon: Milk, colorClass: 'text-secondary' },
    { value: 'breeding', label: 'Breeding & AI', icon: HeartHandshake, colorClass: 'text-primary' },
    { value: 'feeding', label: 'Feeding Log', icon: Wheat, colorClass: 'text-emerald-700' },
  ];

  useEffect(() => {
    if (isEditMode && id) {
      const record = storage.getRecords().find((r) => r.id === id);
      if (record) {
        setCattleId(record.cattleId);
        setRecordType(record.type);
        setNotes(record.notes);
        setDate(record.date.split('T')[0]);
        if (record.data) {
          setAdditionalData(JSON.stringify(record.data));
        }
      }
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cattleId || !notes) {
      toast.error('Please select an animal and enter notes');
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('moobase_access_token');
    const dataPayload = additionalData ? JSON.parse(additionalData) : undefined;
    const recordDate = new Date(date).toISOString();

    if (isEditMode && id) {
      const updates = {
        cattleId,
        type: recordType,
        date: recordDate,
        notes,
        data: dataPayload,
      };

      let syncedOnline = false;
      if (token && navigator.onLine) {
        try {
          const endpoint = `${API_BASE_URL}/records/${recordType}/${id}`;
          const bodyPayload: any = { cattleId, date: recordDate };
          if (recordType === 'health') {
            bodyPayload.description = notes;
            bodyPayload.treatment = dataPayload?.treatment || 'General Checkup';
            bodyPayload.vetName = dataPayload?.vetName || user?.name || 'Attendant';
          } else if (recordType === 'vaccination') {
            bodyPayload.vaccineName = dataPayload?.vaccineName || notes;
            bodyPayload.dateAdministered = recordDate;
            bodyPayload.nextDueDate = dataPayload?.nextDueDate || new Date(Date.now() + 180 * 86400000).toISOString();
          } else if (recordType === 'milk') {
            bodyPayload.quantity = Number(dataPayload?.liters || parseFloat(notes) || 10);
          } else if (recordType === 'breeding') {
            bodyPayload.status = dataPayload?.status || notes;
            bodyPayload.partnerCattleId = dataPayload?.partnerCattleId || null;
          } else if (recordType === 'feeding') {
            bodyPayload.notes = notes;
          }

          const res = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyPayload),
          });
          if (res.ok) syncedOnline = true;
        } catch (err) {
          console.warn('Online record update failed, queued for sync:', err);
        }
      }

      storage.updateRecord(id, updates);

      if (!syncedOnline) {
        storage.addToSyncQueue({
          id: `sync_${Date.now()}`,
          type: 'update',
          entity: 'record',
          data: { id, ...updates },
          status: 'pending',
          timestamp: new Date().toISOString(),
        });
      }

      // Refresh cache from server
      await storage.syncWithBackend();
      setIsSaving(false);
      toast.success('Record updated successfully!');
      navigate(`/cattle/profile/${cattleId}`, { replace: true });
    } else {
      const newRecordId = `R${Date.now()}`;
      const newRecord: CattleRecord = {
        id: newRecordId,
        cattleId,
        type: recordType,
        date: recordDate,
        notes,
        synced: false,
        createdBy: user?.id || 'unknown',
        data: dataPayload,
      };

      let syncedOnline = false;
      if (token && navigator.onLine) {
        try {
          const endpoint = `${API_BASE_URL}/records/${recordType}`;
          const bodyPayload: any = {
            id: newRecordId,
            cattleId,
            date: recordDate,
          };
          if (recordType === 'health') {
            bodyPayload.description = notes;
            bodyPayload.treatment = dataPayload?.treatment || 'General Checkup';
            bodyPayload.vetName = dataPayload?.vetName || user?.name || 'Attendant';
          } else if (recordType === 'vaccination') {
            bodyPayload.vaccineName = dataPayload?.vaccineName || notes;
            bodyPayload.dateAdministered = recordDate;
            bodyPayload.nextDueDate = dataPayload?.nextDueDate || new Date(Date.now() + 180 * 86400000).toISOString();
          } else if (recordType === 'milk') {
            bodyPayload.quantity = Number(dataPayload?.liters || parseFloat(notes) || 10);
          } else if (recordType === 'breeding') {
            bodyPayload.status = dataPayload?.status || notes;
            bodyPayload.partnerCattleId = dataPayload?.partnerCattleId || null;
          } else if (recordType === 'feeding') {
            bodyPayload.notes = notes;
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyPayload),
          });
          if (res.ok) {
            syncedOnline = true;
            newRecord.synced = true;
          }
        } catch (err) {
          console.warn('Online record creation failed, queued for sync:', err);
        }
      }

      storage.addRecord(newRecord);

      // Update cattle status locally
      if (recordType === 'health') {
        storage.updateCattle(cattleId, { status: 'sick', lastUpdate: new Date().toISOString() });
      } else if (recordType === 'vaccination') {
        storage.updateCattle(cattleId, { status: 'vaccinated', lastUpdate: new Date().toISOString() });
      } else if (recordType === 'milk') {
        storage.updateCattle(cattleId, { status: 'lactating', lastUpdate: new Date().toISOString() });
      } else {
        storage.updateCattle(cattleId, { lastUpdate: new Date().toISOString() });
      }

      if (!syncedOnline) {
        storage.addToSyncQueue({
          id: `sync_${Date.now()}`,
          type: 'create',
          entity: 'record',
          data: newRecord,
          status: 'pending',
          timestamp: new Date().toISOString(),
        });
      }

      // Refresh cache from server
      await storage.syncWithBackend();
      setIsSaving(false);
      toast.success('Activity record saved successfully!');
      navigate(`/cattle/profile/${cattleId}`, { replace: true });
    }
  };

  const getMilkLiters = () => {
    try {
      if (additionalData) {
        const parsed = JSON.parse(additionalData);
        return parsed.liters || '';
      }
    } catch (e) {}
    return '';
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 max-w-[1240px] mx-auto w-full">
          <button
            onClick={() => {
              if (cattleId) {
                navigate(`/cattle/profile/${cattleId}`);
              } else {
                navigate('/cattle');
              }
            }}
            className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              {isEditMode ? 'Edit Farm Record' : 'Record Farm Activity'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm Activity & Health Logging
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cattle Selection Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              1. Select Animal
            </h2>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Target Cattle <span className="text-destructive">*</span>
              </label>
              <select
                value={cattleId}
                onChange={(e) => setCattleId(e.target.value)}
                required
                disabled={isEditMode}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="">Select an animal from herd...</option>
                {cattle.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name} ({animal.id}) — {animal.breed} ({animal.gender === 'male' ? '♂ Male' : '♀ Female'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Record Type Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              2. Activity / Record Type
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recordTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = recordType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRecordType(type.value)}
                    disabled={isEditMode}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-center">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Record Details Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              3. Activity Details & Date
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Activity Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            {recordType === 'milk' && (
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                  Milk Production Yield (Liters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 14.5"
                  value={getMilkLiters()}
                  onChange={(e) =>
                    setAdditionalData(JSON.stringify({ liters: parseFloat(e.target.value) || '' }))
                  }
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Notes & Clinical Observations <span className="text-destructive">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={4}
                placeholder="Enter detailed observations, dosage, follow-up recommendations, or feed type..."
                className="w-full p-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Saving Record...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update Farm Record' : 'Save Record to System'}</span>
              </>
            )}
          </button>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
            <Info className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold mb-0.5">Offline-Ready Data Capture</p>
              <p className="text-emerald-800 leading-relaxed font-medium">
                This record will be saved securely on your device immediately and synchronized with the farm server when connected.
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
