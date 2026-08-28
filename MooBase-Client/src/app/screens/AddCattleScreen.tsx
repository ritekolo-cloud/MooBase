import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Heart, ShieldAlert, CheckCircle2, Droplets } from 'lucide-react';
import { storage, Cattle } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function AddCattleScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState<number>(1);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [status, setStatus] = useState<Cattle['status']>('healthy');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      const animal = storage.getCattleById(id);
      if (animal) {
        setName(animal.name);
        setBreed(animal.breed);
        setAge(animal.age);
        setGender(animal.gender === 'male' ? 'male' : 'female');
        setStatus(animal.status);
      }
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !breed || age <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('moobase_access_token');
    const finalGender = gender === 'male' ? 'male' : 'female';
    const finalStatus = gender === 'male' && status === 'lactating' ? 'healthy' : status;

    if (isEditMode && id) {
      const updates = {
        name,
        breed,
        age,
        gender: finalGender,
        status: finalStatus,
        lastUpdate: new Date().toISOString(),
      };

      let syncedOnline = false;
      if (token && navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE_URL}/cattle/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });
          if (res.ok) syncedOnline = true;
        } catch (netErr) {
          console.warn('Online cattle update failed, queued for offline sync:', netErr);
        }
      }

      storage.updateCattle(id, updates);

      if (!syncedOnline) {
        storage.addToSyncQueue({
          id: `sync_${Date.now()}`,
          type: 'update',
          entity: 'cattle',
          data: { id, ...updates },
          status: 'pending',
          timestamp: new Date().toISOString(),
        });
      }

      // Refresh cache in background
      storage.syncWithBackend();

      setIsSaving(false);
      toast.success('Cattle profile updated successfully!');
      navigate(`/cattle/profile/${id}`, { replace: true });
    } else {
      const allCattle = storage.getCattle();
      
      const nextIdNumber = allCattle.reduce((max, animal) => {
        const num = parseInt(animal.id.replace('C', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 6) + 1;
      const newId = `C${String(nextIdNumber).padStart(3, '0')}`;
      const newTag = `TAG-${String(nextIdNumber).padStart(3, '0')}`;

      const newAnimal: Cattle = {
        id: newId,
        tagNumber: newTag,
        name,
        breed,
        age,
        gender: finalGender,
        status: finalStatus,
        lastUpdate: new Date().toISOString(),
      };

      let syncedOnline = false;
      if (token && navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE_URL}/cattle`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newAnimal),
          });
          if (res.ok) syncedOnline = true;
        } catch (netErr) {
          console.warn('Online cattle creation failed, queued for offline sync:', netErr);
        }
      }

      storage.addCattle(newAnimal);

      if (!syncedOnline) {
        storage.addToSyncQueue({
          id: `sync_${Date.now()}`,
          type: 'create',
          entity: 'cattle',
          data: newAnimal,
          status: 'pending',
          timestamp: new Date().toISOString(),
        });
      }

      // Refresh cache in background
      storage.syncWithBackend();

      setIsSaving(false);
      toast.success('New cattle registered successfully!', {
        description: `Assigned tag ID ${newId} (${finalGender === 'male' ? 'Male ♂' : 'Female ♀'})`,
      });
      navigate('/cattle', { replace: true });
    }
  };

  const statuses: { value: Cattle['status']; label: string; icon: any; colorClass: string }[] = [
    { value: 'healthy', label: 'Healthy', icon: Heart, colorClass: 'text-emerald-700' },
    { value: 'sick', label: 'Sick / Alert', icon: ShieldAlert, colorClass: 'text-rose-700' },
    { value: 'vaccinated', label: 'Vaccinated', icon: CheckCircle2, colorClass: 'text-amber-700' },
    ...(gender === 'female' ? [{ value: 'lactating' as const, label: 'Lactating', icon: Droplets, colorClass: 'text-blue-700' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 max-w-[1240px] mx-auto w-full">
          <button
            onClick={() => {
              if (isEditMode && id) {
                navigate(`/cattle/profile/${id}`);
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
              {isEditMode ? 'Edit Cattle Profile' : 'Register New Cattle'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm Livestock Herd Registry
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
          {/* Basic Information Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Basic Animal Information
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Cattle Name / Identifier <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bella, Bruno, Daisy"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                  Breed <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Friesian, Ankole, Jersey"
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                  Age (years) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={30}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Sex / Gender <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gender === 'female'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">♀</span>
                  <span>Female (Cow / Heifer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGender('male');
                    if (status === 'lactating') {
                      setStatus('healthy');
                    }
                  }}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gender === 'male'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">♂</span>
                  <span>Male (Bull / Steer)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Health Status Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Initial Health Status
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((item) => {
                const Icon = item.icon;
                const isSelected = status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatus(item.value)}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
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
                <span>Saving to Registry...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Save Profile Changes' : 'Register Cattle to Herd'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
