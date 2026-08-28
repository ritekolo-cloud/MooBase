import { API_BASE_URL } from '../config/api';

// Offline-first storage utilities

export interface User {
  id: string;
  username: string;
  role: 'manager' | 'attendant';
  phone?: string;
  name?: string;
}

export interface Cattle {
  id: string;
  tagNumber?: string;
  name: string;
  breed: string;
  age: number;
  gender: 'male' | 'female' | string;
  status: 'healthy' | 'sick' | 'vaccinated' | 'lactating' | 'sold' | 'dead';
  imageUrl?: string;
  lastUpdate: string;
}

export interface Record {
  id: string;
  cattleId: string;
  type: 'health' | 'vaccination' | 'feeding' | 'milk' | 'breeding';
  date: string;
  notes: string;
  synced: boolean;
  createdBy: string;
  data?: any;
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'cattle' | 'record' | 'user';
  data: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  timestamp: string;
}

const STORAGE_KEYS = {
  USER: 'moobase_user',
  CATTLE: 'moobase_cattle',
  RECORDS: 'moobase_records',
  SYNC_QUEUE: 'moobase_sync_queue',
  OFFLINE_MODE: 'moobase_offline_mode',
  USERS: 'moobase_users',
};

export const storage = {
  /**
   * init() — intentionally a no-op.
   * Data is loaded on demand from the PostgreSQL backend via farmDataService.
   * localStorage is used ONLY as an offline read cache, never as a data source.
   * Mock/demo data is never injected here.
   */
  init: () => {
    // No mock data. No seed data. Offline cache is populated on first successful
    // server fetch and remains empty until the user authenticates.
  },

  // Authoritative server synchronization
  syncWithBackend: async (): Promise<{ cattle: Cattle[]; records: Record[] } | null> => {
    const token = localStorage.getItem('moobase_access_token');
    if (!token) return null;

    try {
      // 1. If online, flush any pending items from syncQueue first
      const queue = storage.getSyncQueue();
      const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'failed');
      if (pendingItems.length > 0 && navigator.onLine) {
        try {
          const pushRes = await fetch(`${API_BASE_URL}/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
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
          if (pushRes.ok) {
            storage.clearCompletedSyncItems();
          }
        } catch (pushErr) {
          console.warn('Background sync push deferred:', pushErr);
        }
      }

      // 2. Fetch authoritative cattle from server
      const cattleRes = await fetch(`${API_BASE_URL}/cattle`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!cattleRes.ok) return null;
      const cattleJson = await cattleRes.json();
      if (cattleJson.status !== 'success' || !Array.isArray(cattleJson.data)) return null;

      const serverCattle: Cattle[] = cattleJson.data;

      // 3. Fetch authoritative records from server
      let serverRecords: Record[] = [];
      try {
        const recordsRes = await fetch(`${API_BASE_URL}/records`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (recordsRes.ok) {
          const recordsJson = await recordsRes.json();
          if (recordsJson.status === 'success' && Array.isArray(recordsJson.data)) {
            serverRecords = recordsJson.data;
          }
        } else {
          // Fallback: Query per cattle
          for (const animal of serverCattle) {
            const detailRes = await fetch(`${API_BASE_URL}/cattle/${animal.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === 'success' && Array.isArray(detailData.data?.records)) {
                serverRecords.push(...detailData.data.records);
              }
            }
          }
        }
      } catch (recErr) {
        console.warn('Could not fetch records list, keeping current cache:', recErr);
        serverRecords = storage.getRecords();
      }

      // 4. Update local storage cache with authoritative data
      storage.setCattle(serverCattle);
      storage.setRecords(serverRecords);

      // 5. Notify all active listeners across screens
      window.dispatchEvent(
        new CustomEvent('farm-data-updated', {
          detail: { cattle: serverCattle, records: serverRecords },
        })
      );

      return { cattle: serverCattle, records: serverRecords };
    } catch (err) {
      console.warn('Non-fatal: Server sync skipped (offline mode):', err);
      return null;
    }
  },

  // User management
  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    // Synchronize users cache so offline lookups retrieve the latest user record
    const allUsers = storage.getUsers();
    const index = allUsers.findIndex(
      (u) => u.id === user.id || (user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );
    if (index !== -1) {
      allUsers[index] = { ...allUsers[index], ...user };
      storage.setUsers(allUsers);
    } else if (allUsers.length > 0) {
      allUsers.push(user);
      storage.setUsers(allUsers);
    }
  },

  getUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    if (!user) return null;
    try {
      return JSON.parse(user);
    } catch {
      storage.clearUser();
      return null;
    }
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('moobase_access_token');
    localStorage.removeItem('moobase_refresh_token');
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_MODE);
  },

  getCattle: (): Cattle[] => {
    const cattle = localStorage.getItem(STORAGE_KEYS.CATTLE);
    if (!cattle) return [];
    try {
      const parsed: Cattle[] = JSON.parse(cattle);
      return parsed.map((c) => ({
        ...c,
        gender: c.gender || (c.status === 'lactating' ? 'female' : 'female'),
      }));
    } catch {
      return [];
    }
  },

  setCattle: (cattle: Cattle[]) => {
    localStorage.setItem(STORAGE_KEYS.CATTLE, JSON.stringify(cattle));
  },

  addCattle: (cattle: Cattle) => {
    const allCattle = storage.getCattle();
    allCattle.push(cattle);
    storage.setCattle(allCattle);
  },

  updateCattle: (id: string, updates: Partial<Cattle>) => {
    const allCattle = storage.getCattle();
    const index = allCattle.findIndex(c => c.id === id);
    if (index !== -1) {
      allCattle[index] = { ...allCattle[index], ...updates };
      storage.setCattle(allCattle);
    }
  },

  getCattleById: (id: string): Cattle | undefined => {
    return storage.getCattle().find(c => c.id === id);
  },

  deleteCattle: (id: string) => {
    const allCattle = storage.getCattle().filter(c => c.id !== id);
    storage.setCattle(allCattle);

    const allRecords = storage.getRecords().filter(r => r.cattleId !== id);
    storage.setRecords(allRecords);

    storage.addToSyncQueue({
      id: `sync_${Date.now()}`,
      type: 'delete',
      entity: 'cattle',
      data: { id },
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  },

  deleteRecord: (id: string, type?: string) => {
    const allRecords = storage.getRecords().filter(r => r.id !== id);
    storage.setRecords(allRecords);

    storage.addToSyncQueue({
      id: `sync_${Date.now()}`,
      type: 'delete',
      entity: 'record',
      data: { id, type },
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  },

  // Records management
  getRecords: (): Record[] => {
    const records = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return records ? JSON.parse(records) : [];
  },

  setRecords: (records: Record[]) => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  },

  addRecord: (record: Record) => {
    const allRecords = storage.getRecords();
    allRecords.push(record);
    storage.setRecords(allRecords);

    // Add to sync queue if not synced
    if (!record.synced) {
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'create',
        entity: 'record',
        data: record,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });
    }
  },

  getRecordsByCattleId: (cattleId: string): Record[] => {
    return storage.getRecords().filter(r => r.cattleId === cattleId);
  },

  // Sync queue management
  getSyncQueue: (): SyncQueueItem[] => {
    const queue = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return queue ? JSON.parse(queue) : [];
  },

  setSyncQueue: (queue: SyncQueueItem[]) => {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  addToSyncQueue: (item: SyncQueueItem) => {
    const queue = storage.getSyncQueue();
    queue.push(item);
    storage.setSyncQueue(queue);
  },

  updateSyncQueueItem: (id: string, updates: Partial<SyncQueueItem>) => {
    const queue = storage.getSyncQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      storage.setSyncQueue(queue);
    }
  },

  clearCompletedSyncItems: () => {
    const queue = storage.getSyncQueue();
    const filtered = queue.filter(item => item.status !== 'completed');
    storage.setSyncQueue(filtered);
  },

  // Offline mode
  isOfflineMode: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE) === 'true';
  },

  setOfflineMode: (offline: boolean) => {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, offline.toString());
  },

  // Record update
  updateRecord: (id: string, updates: Partial<Record>) => {
    const allRecords = storage.getRecords();
    const index = allRecords.findIndex(r => r.id === id);
    if (index !== -1) {
      allRecords[index] = { ...allRecords[index], ...updates, synced: false };
      storage.setRecords(allRecords);

      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'update',
        entity: 'record',
        data: allRecords[index],
        status: 'pending',
        timestamp: new Date().toISOString(),
      });
    }
  },

  // User list management
  getUsers: (): User[] => {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
  },

  setUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  addUser: (user: User) => {
    const allUsers = storage.getUsers();
    // Check if user already exists
    if (!allUsers.some(u => u.id === user.id || u.username === user.username)) {
      allUsers.push(user);
      storage.setUsers(allUsers);

      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'create',
        entity: 'user' as any,
        data: user,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });
    }
  },

  updateUser: (id: string, updates: Partial<User> & { password?: string }) => {
    const allUsers = storage.getUsers();
    const index = allUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      allUsers[index] = { ...allUsers[index], ...updates };
      storage.setUsers(allUsers);

      storage.addToSyncQueue({
        id: `sync_${Date.now()}`,
        type: 'update',
        entity: 'user' as any,
        data: { id, ...updates },
        status: 'pending',
        timestamp: new Date().toISOString(),
      });
    }
  },

  deleteUser: (id: string) => {
    const allUsers = storage.getUsers().filter(u => u.id !== id);
    storage.setUsers(allUsers);

    storage.addToSyncQueue({
      id: `sync_${Date.now()}`,
      type: 'delete',
      entity: 'user' as any,
      data: { id },
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  },
};

// initializeMockData — permanently stubbed out.
// Do NOT seed mock cattle or records here.
// All data comes from PostgreSQL via farmDataService.
export const initializeMockData = () => {};
