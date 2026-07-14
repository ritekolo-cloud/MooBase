import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { storage, SyncQueueItem } from '../utils/storage';

import { toast } from 'sonner';

export function OfflineSyncScreen() {
  const navigate = useNavigate();
  const user = storage.getUser();
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(storage.getSyncQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    const pendingItems = syncQueue.filter((item) => item.status === 'pending' || item.status === 'failed');
    if (pendingItems.length === 0) return;

    setIsSyncing(true);

    // Update status to syncing for all pending items
    for (const item of pendingItems) {
      storage.updateSyncQueueItem(item.id, { status: 'syncing' });
    }
    setSyncQueue([...storage.getSyncQueue()]);

    try {
      const token = localStorage.getItem('moobase_access_token') || '';
      const response = await fetch('http://localhost:5000/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(
          pendingItems.map((item) => ({
            id: item.id,
            type: item.type,
            entity: item.entity,
            data: item.data,
            timestamp: item.timestamp,
          }))
        ),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Sync failed');
      }

      const { data } = resData;
      
      let hasFailures = false;
      for (const detail of data.details) {
        if (detail.status === 'completed') {
          storage.updateSyncQueueItem(detail.id, { status: 'completed' });
        } else {
          storage.updateSyncQueueItem(detail.id, { status: 'failed' });
          hasFailures = true;
        }
      }

      setSyncQueue([...storage.getSyncQueue()]);

      if (hasFailures) {
        toast.warning('Sync completed with some failures. Check queue details.');
      } else {
        toast.success('All items synced successfully!');
      }

      // Clear completed items after a delay
      setTimeout(() => {
        storage.clearCompletedSyncItems();
        setSyncQueue(storage.getSyncQueue());
      }, 2000);
    } catch (err: any) {
      toast.error(`Sync error: ${err.message}`);
      // Revert syncing status back to pending
      for (const item of pendingItems) {
        storage.updateSyncQueueItem(item.id, { status: 'pending' });
      }
      setSyncQueue([...storage.getSyncQueue()]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCompleted = () => {
    storage.clearCompletedSyncItems();
    setSyncQueue(storage.getSyncQueue());
    toast.success('Cleared completed items');
  };

  const handleDeleteItem = (id: string) => {
    const queue = storage.getSyncQueue().filter((item) => item.id !== id);
    storage.setSyncQueue(queue);
    setSyncQueue(queue);
    toast.success('Item removed from sync queue');
  };

  const getStatusIcon = (status: SyncQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-[18px] h-[18px] text-accent" />;
      case 'syncing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-[18px] h-[18px] text-secondary" />
          </motion.div>
        );
      case 'completed':
        return <CheckCircle className="w-[18px] h-[18px] text-success" />;
      case 'failed':
        return <AlertCircle className="w-[18px] h-[18px] text-destructive" />;
    }
  };

  const getStatusBadge = (status: SyncQueueItem['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-accent/10 text-accent border-accent/20',
      syncing: 'bg-secondary/10 text-secondary border-secondary/20',
      completed: 'bg-success/10 text-success border-success/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[status] || '';
  };

  const pendingCount = syncQueue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
  const completedCount = syncQueue.filter((item) => item.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-[#E5E7EB] sticky top-0 z-20 transition-colors duration-150 ease-out">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (user?.role === 'manager') {
                  navigate('/manager/dashboard');
                } else {
                  navigate('/attendant/dashboard');
                }
              }}
              className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </button>
            <div>
              <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">Offline Sync</h1>
              <div className="flex items-center gap-2 mt-1">
                {isOnline ? (
                  <>
                    <Wifi className="w-[14px] h-[14px] text-success" />
                    <span className="text-[14px] text-success font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-[14px] h-[14px] text-accent" />
                    <span className="text-[14px] text-accent font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || !isOnline}
              className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-semibold text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
            >
              <RefreshCw className={`w-[18px] h-[18px] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync All</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full space-y-8">
        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Clock className="w-[18px] h-[18px]" />
              <span className="text-[14px] font-semibold uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-[36px] font-bold text-foreground leading-none">{pendingCount}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-[#E5E7EB] rounded-[12px] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <CheckCircle className="w-[18px] h-[18px]" />
              <span className="text-[14px] font-semibold uppercase tracking-wider">Completed</span>
            </div>
            <p className="text-[36px] font-bold text-foreground leading-none">{completedCount}</p>
          </motion.div>
        </div>

        {syncQueue.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <div className="w-[48px] h-[48px] bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-[20px] h-[20px] text-success" />
            </div>
            <h4 className="text-[18px] font-semibold text-foreground mb-1">All Synced!</h4>
            <p className="text-[14px] text-muted-foreground font-medium">No pending items in the sync queue.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="divide-y divide-[#E5E7EB]">
                {syncQueue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut', delay: 0.01 * index }}
                    className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-150 ease-out"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">{getStatusIcon(item.status)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[12px] font-semibold capitalize border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[14px] text-muted-foreground capitalize font-medium">
                            {item.type} {item.entity}
                          </span>
                        </div>
                        <p className="text-[16px] text-foreground font-medium">
                          {item.entity === 'record'
                            ? `${item.data.type} record for ${item.data.cattleId}`
                            : `Cattle ${item.data.id}`}
                        </p>
                        <p className="text-[14px] text-muted-foreground mt-1 font-medium font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {item.status !== 'syncing' && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-150 ease-out flex-shrink-0 ml-4"
                      >
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="w-full h-[48px] bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] font-semibold text-[14px] hover:bg-muted transition-colors duration-150 ease-out active:scale-98"
              >
                Clear Completed Items
              </button>
            )}
          </div>
        )}

        {!isOnline && (
          <div className="bg-card border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)] flex items-start gap-4">
            <WifiOff className="w-[22px] h-[22px] text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-[14px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Offline Mode Active</p>
              <p className="leading-relaxed">
                Your changes are saved locally. They will automatically sync when you're back online.
              </p>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
