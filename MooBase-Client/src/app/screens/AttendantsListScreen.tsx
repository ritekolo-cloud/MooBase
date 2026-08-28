import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, UserPlus, Trash2, Shield, UserCheck, Pencil, User } from 'lucide-react';
import { storage, User as StorageUser } from '../utils/storage';
import { toast } from 'sonner';

export function AttendantsListScreen() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => storage.getUser());
  const [attendants, setAttendants] = useState<StorageUser[]>([]);

  useEffect(() => {
    // Only managers can access staff list
    if (!currentUser || currentUser.role !== 'manager') {
      toast.error('Access denied. Managers only.');
      navigate('/login');
      return;
    }
    setAttendants(storage.getUsers());
  }, [currentUser, navigate]);

  const handleDelete = (id: string, name: string) => {
    if (currentUser && currentUser.id === id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to remove ${name} from Kayera Farm staff?`)) {
      storage.deleteUser(id);
      setAttendants(storage.getUsers());
      toast.success(`${name} was successfully removed`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="max-w-[1240px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manager/dashboard')}
              className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Farm Staff & Attendants
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Kayera Farm User Access Management ({attendants.length} registered)
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/users/add')}
            className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-[1240px] mx-auto w-full">
        {attendants.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Staff Registered</h3>
            <p className="text-xs text-muted-foreground font-medium mb-5">
              Add your first farm attendant or manager to get started.
            </p>
            <button
              onClick={() => navigate('/users/add')}
              className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Name & Initials</div>
              <div className="col-span-4">Email / Username</div>
              <div className="col-span-2">System Role</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border">
              {attendants.map((staff, index) => {
                const isSelf = currentUser?.id === staff.id;
                const initials = staff.name
                  ? staff.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                  : staff.username.charAt(0).toUpperCase();

                return (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, delay: index * 0.02 }}
                    className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Name */}
                    <div className="col-span-5 flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 border ${
                          staff.role === 'manager'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                            {staff.name || 'Unnamed staff'}
                          </h3>
                          {isSelf && (
                            <span className="px-2 py-0.2 bg-primary/10 text-primary text-[11px] font-bold rounded-md border border-primary/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium md:hidden mt-0.5 truncate">
                          {staff.username}
                        </p>
                      </div>
                    </div>

                    {/* Username / Email */}
                    <div className="col-span-4 hidden md:block min-w-0">
                      <p className="text-sm text-muted-foreground truncate font-medium">{staff.username}</p>
                    </div>

                    {/* Role */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border capitalize ${
                          staff.role === 'manager'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {staff.role === 'manager' ? (
                          <>
                            <Shield className="w-3.5 h-3.5" /> Farm Manager
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5" /> Farm Attendant
                          </>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1 mt-1 md:mt-0">
                      <button
                        onClick={() => navigate(`/users/edit/${staff.id}`)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(staff.id, staff.name || staff.username)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
