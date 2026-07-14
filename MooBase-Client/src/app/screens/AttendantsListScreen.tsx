import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, UserPlus, Trash2, Shield, UserCheck, Pencil } from 'lucide-react';
import { storage, User } from '../utils/storage';
import { toast } from 'sonner';

export function AttendantsListScreen() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => storage.getUser());
  const [attendants, setAttendants] = useState<User[]>([]);

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

    if (confirm(`Are you sure you want to remove ${name} from farm attendants?`)) {
      storage.deleteUser(id);
      setAttendants(storage.getUsers());
      toast.success(`${name} was successfully removed`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-[#E5E7EB] sticky top-0 z-30 transition-colors duration-150 ease-out">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manager/dashboard')}
              className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </button>
            <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">Farm Staff</h1>
          </div>

          <button
            onClick={() => navigate('/users/add')}
            className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-semibold text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out flex items-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
          >
            <UserPlus className="w-[18px] h-[18px]" />
            <span>Add Attendant</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full">
        {attendants.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <div className="w-[48px] h-[48px] bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-[20px] h-[20px] text-muted-foreground" />
            </div>
            <h4 className="text-[18px] font-semibold text-foreground mb-1">No staff registered</h4>
            <p className="text-[14px] text-muted-foreground font-medium mb-6">Add your first farm attendant to get started.</p>
            <button
              onClick={() => navigate('/users/add')}
              className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-semibold text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out inline-flex items-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
            >
              <UserPlus className="w-[18px] h-[18px]" />
              <span>Add First Attendant</span>
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#E5E7EB] bg-muted/40 text-[14px] font-semibold text-muted-foreground">
              <div className="col-span-5">Name</div>
              <div className="col-span-4">Username</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="divide-y divide-[#E5E7EB]">
              {attendants.map((staff, index) => {
                const isSelf = currentUser?.id === staff.id;
                return (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut', delay: 0.02 * index }}
                    className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4 px-6 py-5 hover:bg-muted/30 transition-colors duration-150 ease-out"
                  >
                    {/* Name Column */}
                    <div className="col-span-5 flex items-center gap-4 min-w-0">
                      <div className={`w-[40px] h-[40px] rounded-[10px] flex items-center justify-center font-semibold text-[16px] flex-shrink-0 border transition-colors duration-150 ease-out ${
                        staff.role === 'manager'
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-muted text-foreground border-[#E5E7EB]'
                      }`}>
                        {staff.name?.[0]?.toUpperCase() || staff.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-semibold text-foreground truncate">{staff.name || 'Unnamed staff'}</p>
                          {isSelf && (
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[12px] font-semibold rounded-md border border-[#E5E7EB] flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Username Column */}
                    <div className="col-span-4 hidden md:block min-w-0">
                      <p className="text-[14px] text-muted-foreground truncate font-medium">{staff.username}</p>
                    </div>

                    {/* Role Column */}
                    <div className="col-span-2 flex items-center">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[14px] font-semibold border capitalize ${
                        staff.role === 'manager'
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-muted text-muted-foreground border-[#E5E7EB]'
                      }`}>
                        <Shield className="w-[14px] h-[14px]" />
                        {staff.role}
                      </span>
                    </div>

                    {/* Action Column */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/users/edit/${staff.id}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors duration-150 ease-out"
                        title="Edit Staff"
                      >
                        <Pencil className="w-[16px] h-[16px]" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(staff.id, staff.name || staff.username)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-150 ease-out"
                          title="Remove Staff"
                        >
                          <Trash2 className="w-[16px] h-[16px]" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
