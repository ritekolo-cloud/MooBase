import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { storage, Record } from '../utils/storage';
import { toast } from 'sonner';

export function AddRecordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const user = storage.getUser();
  const isEditMode = !!id;

  const [cattleId, setCattleId] = useState(location.state?.cattleId || '');
  const [recordType, setRecordType] = useState<Record['type']>(
    location.state?.type || 'health'
  );
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalData, setAdditionalData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const cattle = storage.getCattle();

  const recordTypes: { value: Record['type']; label: string }[] = [
    { value: 'health', label: 'Health' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'feeding', label: 'Feeding' },
    { value: 'milk', label: 'Milk Production' },
    { value: 'breeding', label: 'Breeding' },
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
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    const dataPayload = additionalData ? JSON.parse(additionalData) : undefined;

    if (isEditMode && id) {
      storage.updateRecord(id, {
        cattleId,
        type: recordType,
        date: new Date(date).toISOString(),
        notes,
        data: dataPayload,
      });

      setTimeout(() => {
        setIsSaving(false);
        toast.success('Record updated successfully!');
        navigate(`/cattle/profile/${cattleId}`, { replace: true });
      }, 1000);
    } else {
      const newRecord: Record = {
        id: `R${Date.now()}`,
        cattleId,
        type: recordType,
        date: new Date(date).toISOString(),
        notes,
        synced: false,
        createdBy: user?.id || 'unknown',
        data: dataPayload,
      };

      storage.addRecord(newRecord);

      // Update cattle last update time
      storage.updateCattle(cattleId, {
        lastUpdate: new Date().toISOString(),
      });

      setTimeout(() => {
        setIsSaving(false);
        toast.success('Record saved successfully!', {
          description: 'Will sync when online',
        });

        navigate(`/cattle/profile/${cattleId}`, { replace: true });
      }, 1000);
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
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (cattleId) {
                navigate(`/cattle/profile/${cattleId}`);
              } else {
                navigate('/cattle');
              }
            }}
            className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
          >
            <ArrowLeft className="w-[20px] h-[20px]" />
          </button>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {isEditMode ? 'Edit Record' : 'Add New Record'}
          </h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cattle Selection Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Select Cattle
            </h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Cattle</label>
              <select
                value={cattleId}
                onChange={(e) => setCattleId(e.target.value)}
                required
                disabled={isEditMode}
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Select cattle...</option>
                {cattle.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name} ({animal.id}) - {animal.breed}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Record Type Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Record Type
            </h2>
            <div className="p-1 bg-muted rounded-lg flex flex-wrap gap-1">
              {recordTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setRecordType(type.value)}
                  disabled={isEditMode}
                  className={`flex-1 min-w-[calc(33.33%-4px)] py-2 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    recordType === type.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Details
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes <span className="text-destructive">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={4}
                placeholder="Enter detailed notes about this record..."
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
              />
            </div>

            {recordType === 'milk' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Milk Quantity (liters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="12.5"
                  value={getMilkLiters()}
                  onChange={(e) =>
                    setAdditionalData(JSON.stringify({ liters: parseFloat(e.target.value) || '' }))
                  }
                  className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update Record' : 'Save Record'}</span>
              </>
            )}
          </button>

          <div className="bg-muted border border-border rounded-lg p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-0.5">Offline-first saving</p>
              <p className="leading-relaxed">
                This record will be saved locally and automatically synced when you're back online.
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
