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
  name: string;
  breed: string;
  age: number;
  status: 'healthy' | 'sick' | 'vaccinated' | 'lactating';
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
  entity: 'cattle' | 'record';
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
  // Initialization
  init: () => {
    initializeMockData();
  },

  // User management
  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Cattle management
  getCattle: (): Cattle[] => {
    const cattle = localStorage.getItem(STORAGE_KEYS.CATTLE);
    return cattle ? JSON.parse(cattle) : [];
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

// Initialize with mock data if empty
export const initializeMockData = () => {
  if (storage.getCattle().length === 0) {
    const mockCattle: Cattle[] = [
      {
        id: 'C001',
        name: 'Bella',
        breed: 'Friesian',
        age: 3,
        status: 'healthy',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'C002',
        name: 'Daisy',
        breed: 'Jersey',
        age: 4,
        status: 'lactating',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'C003',
        name: 'Rose',
        breed: 'Ankole',
        age: 2,
        status: 'healthy',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'C004',
        name: 'Luna',
        breed: 'Friesian',
        age: 5,
        status: 'vaccinated',
        lastUpdate: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'C005',
        name: 'Molly',
        breed: 'Crossbreed',
        age: 3,
        status: 'sick',
        lastUpdate: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
    storage.setCattle(mockCattle);

    const mockRecords: Record[] = [
      {
        id: 'R001',
        cattleId: 'C001',
        type: 'vaccination',
        date: new Date(Date.now() - 604800000).toISOString(),
        notes: 'Annual vaccination completed',
        synced: true,
        createdBy: 'attendant1',
      },
      {
        id: 'R002',
        cattleId: 'C002',
        type: 'milk',
        date: new Date().toISOString(),
        notes: '12 liters morning',
        synced: true,
        createdBy: 'attendant1',
        data: { liters: 12 },
      },
      {
        id: 'R003',
        cattleId: 'C005',
        type: 'health',
        date: new Date(Date.now() - 172800000).toISOString(),
        notes: 'Showing signs of fever, isolated from herd',
        synced: true,
        createdBy: 'attendant1',
      },
    ];
    storage.setRecords(mockRecords);
  }

  // Initialize users list if empty
  if (storage.getUsers().length === 0) {
    const mockUsers: User[] = [
      { id: 'u001', username: 'manager@moobase.com', role: 'manager', name: 'Kabaka Ronald' },
      { id: 'u002', username: 'attendant1@moobase.com', role: 'attendant', name: 'Mukasa John' },
      { id: 'u003', username: 'attendant2@moobase.com', role: 'attendant', name: 'Nalule Sarah' },
    ];
    storage.setUsers(mockUsers);
  }
};
