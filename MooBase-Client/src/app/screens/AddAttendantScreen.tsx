import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Shield, User } from 'lucide-react';
import { storage, User as StorageUser } from '../utils/storage';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

export function AddAttendantScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [currentUser] = useState(() => storage.getUser());

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'attendant'>('attendant');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only managers can access
    if (!currentUser || currentUser.role !== 'manager') {
      toast.error('Access denied. Managers only.');
      navigate('/login');
      return;
    }

    if (isEditMode && id) {
      const staffUser = storage.getUsers().find((u) => u.id === id);
      if (staffUser) {
        setName(staffUser.name || '');
        setUsername(staffUser.username);
        setRole(staffUser.role);
      }
    }
  }, [currentUser, navigate, id, isEditMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !username) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Password is only required in create mode
    if (!isEditMode && !password) {
      toast.error('Password is required for new accounts');
      return;
    }

    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSaving(true);

    if (isEditMode && id) {
      // Update locally
      storage.updateUser(id, {
        name,
        username,
        role,
        password: password || undefined,
      });

      // Try to send online API request
      const payload: any = { name, email: username, role };
      if (password) payload.password = password;

      fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('moobase_access_token') || ''}`,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error('API server returned error');
          return res.json();
        })
        .then((data) => {
          console.log('User updated on API server:', data);
        })
        .catch((err) => {
          console.warn('Could not sync user update directly with server. Queued for offline sync.', err);
        });

      setTimeout(() => {
        setIsSaving(false);
        toast.success(`Staff member ${name} updated successfully!`);
        navigate('/users', { replace: true });
      }, 800);
    } else {
      // Create mode
      const newUserId = `u_${Date.now()}`;
      const newUser: StorageUser = {
        id: newUserId,
        username,
        name,
        role,
      };

      // Save to local storage
      storage.addUser(newUser);

      // Try to send online API request
      fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('moobase_access_token') || ''}`,
        },
        body: JSON.stringify({
          name,
          email: username,
          password,
          role,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('API server returned error');
          return res.json();
        })
        .then((data) => {
          console.log('User registered on API server:', data);
        })
        .catch((err) => {
          console.warn('Could not sync user creation directly with server. Queued for offline sync.', err);
        });

      setTimeout(() => {
        setIsSaving(false);
        toast.success(`Staff member ${name} registered successfully!`, {
          description: 'Syncing credentials with farm server...',
        });
        navigate('/users', { replace: true });
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 max-w-[1240px] mx-auto w-full">
          <button
            onClick={() => navigate('/users')}
            className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
            title="Back to Staff List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              {isEditMode ? 'Edit Staff Member' : 'Register New Staff Member'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Kayera Farm Staff Account Provisioning
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
          {/* Account Details Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Staff Member Credentials
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mukasa Ronald"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                Username / Email Address <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. attendant@kayerafarm.com"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">
                {isEditMode ? 'New Password (Optional)' : 'Password'} {!isEditMode && <span className="text-destructive">*</span>}
              </label>
              <input
                type="password"
                required={!isEditMode}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditMode ? 'Leave blank to keep existing password' : 'Minimum 6 characters'}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
          </div>

          {/* Role Selection Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Permissions & Access Level
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('attendant')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'attendant'
                    ? 'border-primary bg-primary/8 shadow-xs'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  role === 'attendant' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <User className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Farm Attendant</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Daily cattle logging, health, vaccination, and milk records.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'manager'
                    ? 'border-primary bg-primary/8 shadow-xs'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  role === 'manager' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Farm Manager</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Full administrative control, herd analytics, reports, and staff management.
                </p>
              </button>
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
                <span>Saving User...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Save Staff Changes' : 'Register Staff Account'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
