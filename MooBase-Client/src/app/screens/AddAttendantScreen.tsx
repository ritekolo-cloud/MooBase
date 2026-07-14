import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Shield, User } from 'lucide-react';
import { storage, User as StorageUser } from '../utils/storage';
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
      toast.error('Password is required');
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

      fetch(`http://localhost:5000/api/users/${id}`, {
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
      }, 1000);
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
      fetch('http://localhost:5000/api/users', {
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
        toast.success(`Attendant ${name} registered successfully!`, {
          description: 'Syncing details with server...',
        });
        navigate('/users', { replace: true });
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/users')}
            className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
          >
            <ArrowLeft className="w-[20px] h-[20px]" />
          </button>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}
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
          {/* Account Details Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              Account Details
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username / Email</label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john@farm.com"
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isEditMode ? 'New Password (Optional)' : 'Password'}
              </label>
              <input
                type="password"
                required={!isEditMode}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditMode ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                className="w-full py-2 px-3 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Role Selection Card */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider text-xs">
              System Role
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('attendant')}
                className={`p-4 rounded-lg border text-left transition-all duration-150 ease-out bg-card ${
                  role === 'attendant'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <User className={`w-4 h-4 mb-2.5 ${role === 'attendant' ? 'text-primary' : 'text-muted-foreground'}`} />
                <h4 className="text-sm font-medium text-foreground">Attendant</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Record keeping and daily tasks</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`p-4 rounded-lg border text-left transition-all duration-150 ease-out bg-card ${
                  role === 'manager'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Shield className={`w-4 h-4 mb-2.5 ${role === 'manager' ? 'text-primary' : 'text-muted-foreground'}`} />
                <h4 className="text-sm font-medium text-foreground">Manager</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Full access and admin rights</p>
              </button>
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
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Save Changes' : 'Save Attendant'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
