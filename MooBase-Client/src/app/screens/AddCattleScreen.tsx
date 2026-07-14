import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Heart, ShieldAlert, CheckCircle2, Droplets } from 'lucide-react';
import { storage, Cattle } from '../utils/storage';
import { toast } from 'sonner';

export function AddCattleScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState<number>(1);
  const [status, setStatus] = useState<Cattle['status']>('healthy');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      const animal = storage.getCattleById(id);
      if (animal) {
        setName(animal.name);
        setBreed(animal.breed);
        setAge(animal.age);
        setStatus(animal.status);
      }
    }
  }, [id, isEditMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !breed || age <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setIsSaving(true);

    if (isEditMode && id) {
      storage.updateCattle(id, {
        name,
        breed,
        age,
        status,
        lastUpdate: new Date().toISOString(),
      });

      // Add to sync queue for offline sync
      const updatedCattle = storage.getCattleById(id);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'update',
        entity: 'cattle',
        data: updatedCattle,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        setIsSaving(false);
        toast.success('Cattle profile updated successfully!');
        navigate(`/cattle/profile/${id}`, { replace: true });
      }, 1000);
    } else {
      const allCattle = storage.getCattle();
      
      // Generate next sequential ID
      const nextIdNumber = allCattle.reduce((max, animal) => {
        const num = parseInt(animal.id.replace('C', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 5) + 1;
      const newId = `C${String(nextIdNumber).padStart(3, '0')}`;

      const newAnimal: Cattle = {
        id: newId,
        name,
        breed,
        age,
        status,
        lastUpdate: new Date().toISOString(),
      };

      storage.addCattle(newAnimal);

      // Add to sync queue for offline sync
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'create',
        entity: 'cattle',
        data: newAnimal,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        setIsSaving(false);
        toast.success('New cattle registered successfully!', {
          description: `Assigned tag ID ${newId}`,
        });
        navigate('/cattle', { replace: true });
      }, 1000);
    }
  };

  const statuses: { value: Cattle['status']; label: string; icon: any }[] = [
    { value: 'healthy', label: 'Healthy', icon: Heart },
    { value: 'sick', label: 'Sick / Alert', icon: ShieldAlert },
    { value: 'vaccinated', label: 'Vaccinated', icon: CheckCircle2 },
    { value: 'lactating', label: 'Lactating', icon: Droplets },
  ];

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isEditMode && id) {
                navigate(`/cattle/profile/${id}`);
              } else {
                navigate('/cattle');
              }
            }}
            className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
          >
            <ArrowLeft className="w-[20px] h-[20px]" />
          </button>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {isEditMode ? 'Edit Cattle Profile' : 'Register New Cattle'}
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
          {/* Basic Information Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Basic Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Name / Identifier <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bella"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Breed <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Friesian, Ankole, Jersey"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Age (years) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={30}
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10) || 1)}
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Health Status Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Health Status
            </h2>
            
            <div className="p-1 bg-muted rounded-lg grid grid-cols-2 gap-1">
              {statuses.map((item) => {
                const Icon = item.icon;
                const isSelected = status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatus(item.value)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
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
                <span>{isEditMode ? 'Save Changes' : 'Register Cattle'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
