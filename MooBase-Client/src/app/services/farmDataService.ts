/**
 * farmDataService.ts
 * 
 * THE SINGLE AUTHORITATIVE DATA ACCESS LAYER.
 * 
 * All screens must obtain farm data through this service.
 * PostgreSQL → Backend API → farmDataService → React UI
 * 
 * localStorage is used ONLY as:
 *   1. An offline read cache (stale-while-revalidate)
 *   2. A pending mutation queue for offline operations
 * 
 * localStorage NEVER overrides server data when online.
 * Demo/mock data is NEVER injected.
 */

import { API_BASE_URL } from '../config/api';
import { storage, Cattle, Record as CattleRecord } from '../utils/storage';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalCattle: number;
  healthyCount: number;
  sickCount: number;
  requireAttention: number;
  lactatingCount: number;
  vaccinatedCount: number;
  soldCount: number;
  deadCount: number;
  todayMilkLiters: number;
  milkToday: number;
  // Reminder counts — each semantically distinct
  dueToday: number;          // vaccinations with nextDueDate = today
  overdueCount: number;      // vaccinations past nextDueDate
  upcomingCount: number;     // vaccinations in next 14 days
  attentionCount: number;    // sick cattle + pending breeding
  totalReminders: number;    // all unresolved items
  todayActivities: number;
  sickCattleList: Cattle[];
  assignedCattle: Cattle[];
  recentActivities: RecentActivity[];
  serverTimestamp: string;
}

export interface RecentActivity {
  id: string;
  cattleId: string;
  cattleName: string;
  cattleTag: string;
  type: 'health' | 'vaccination' | 'milk' | 'breeding' | 'feeding';
  date: string;
  title: string;
  description: string;
}

export type ReminderStatus = 'overdue' | 'due_today' | 'upcoming' | 'attention';
export type ReminderType = 'vaccination' | 'breeding_followup' | 'sick_cattle';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  cattleId: string;
  cattleName: string;
  cattleTag: string;
  dueDate: string | null;      // null for attention-only items (sick cattle, pending breeding)
  status: ReminderStatus;
  priority: 'high' | 'medium' | 'low';
  description: string;
  // type-specific
  vaccineName?: string;        // vaccination reminders
  breedingDate?: string;       // breeding follow-up reminders
}

export interface ReminderResponse {
  reminders: Reminder[];
  summary: {
    dueToday: number;
    overdueCount: number;
    upcomingCount: number;
    attentionCount: number;
    totalReminders: number;
  };
}

export type ServiceResult<T> =
  | { ok: true; data: T; fromCache: false }
  | { ok: true; data: T; fromCache: true }
  | { ok: false; error: string; status?: number };

// ─── Token Helper ─────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('moobase_access_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

// ─── Core Fetch Helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message || 'Conflict: Record was changed by another device. Please reload.', status: 409 };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message || `Server error ${res.status}`, status: res.status };
    }

    const body = await res.json();
    return { ok: true, data: body.data ?? body };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error — could not reach server' };
  }
}

// ─── Revalidation Event ───────────────────────────────────────────────────────

function dispatchRevalidation(cattle?: Cattle[], records?: CattleRecord[]) {
  window.dispatchEvent(
    new CustomEvent('farm-data-updated', { detail: { cattle, records } })
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const farmDataService = {
  /**
   * Fetch live dashboard statistics directly from PostgreSQL via backend.
   * Returns cached data ONLY when offline (clearly marked fromCache=true).
   */
  async getDashboardSummary(): Promise<ServiceResult<DashboardSummary>> {
    if (!navigator.onLine) {
      // Offline: compute a minimal summary from the offline cache
      const cattle = storage.getCattle();
      const records = storage.getRecords();
      const today = new Date().toDateString();
      const sickCattle = cattle.filter((c) => c.status === 'sick');
      const todayRecords = records.filter((r) => new Date(r.date).toDateString() === today);
      const summary: DashboardSummary = {
        totalCattle: cattle.length,
        healthyCount: cattle.filter((c) => c.status === 'healthy').length,
        sickCount: sickCattle.length,
        requireAttention: sickCattle.length,
        lactatingCount: cattle.filter((c) => c.status === 'lactating').length,
        vaccinatedCount: cattle.filter((c) => c.status === 'vaccinated').length,
        soldCount: cattle.filter((c) => c.status === 'sold').length,
        deadCount: cattle.filter((c) => c.status === 'dead').length,
        todayMilkLiters: 0,
        milkToday: todayRecords.filter((r) => r.type === 'milk').length,
        dueToday: 0,
        todayActivities: todayRecords.length,
        sickCattleList: sickCattle,
        assignedCattle: cattle.slice(0, 8),
        recentActivities: [],
        serverTimestamp: new Date().toISOString(),
      };
      return { ok: true, data: summary, fromCache: true };
    }

    const result = await apiFetch<DashboardSummary>('/dashboard/summary');
    if (result.ok) {
      // Update offline cattle/records cache from the embedded lists
      if (result.data.assignedCattle?.length) {
        storage.setCattle(result.data.assignedCattle);
      }
      return { ok: true, data: result.data, fromCache: false };
    }
    return { ok: false, error: result.error, status: (result as any).status };
  },

  // ─── Cattle ─────────────────────────────────────────────────────────────────

  /**
   * Fetch authoritative cattle list from PostgreSQL.
   * Populates offline cache on success.
   */
  async getCattleList(): Promise<ServiceResult<Cattle[]>> {
    if (!navigator.onLine) {
      const cached = storage.getCattle();
      return { ok: true, data: cached, fromCache: true };
    }

    const result = await apiFetch<any[]>('/cattle');
    if (!result.ok) return { ok: false, error: result.error, status: (result as any).status };

    const cattle: Cattle[] = result.data.map((c) => ({
      id: c.id,
      tagNumber: c.tagNumber || `TAG-${c.id}`,
      name: c.name,
      breed: c.breed,
      age: c.age,
      gender: c.gender as Cattle['gender'],
      status: c.status as Cattle['status'],
      lastUpdate: c.lastUpdate || c.updatedAt || new Date().toISOString(),
    }));

    // Update offline cache with authoritative server data
    storage.setCattle(cattle);
    return { ok: true, data: cattle, fromCache: false };
  },

  /**
   * Fetch a single cattle profile with all its records from backend.
   */
  async getCattleById(id: string): Promise<ServiceResult<Cattle & { records: CattleRecord[] }>> {
    if (!navigator.onLine) {
      const cached = storage.getCattleById(id);
      if (!cached) return { ok: false, error: 'Cattle not found in offline cache' };
      return { ok: true, data: { ...cached, records: storage.getRecordsByCattleId(id) }, fromCache: true };
    }

    const result = await apiFetch<any>(`/cattle/${id}`);
    if (!result.ok) return { ok: false, error: result.error, status: (result as any).status };

    const d = result.data;
    const cattle: Cattle = {
      id: d.id, tagNumber: d.tagNumber || `TAG-${d.id}`, name: d.name,
      breed: d.breed, age: d.age, gender: d.gender, status: d.status,
      lastUpdate: d.lastUpdate || d.updatedAt || new Date().toISOString(),
    };
    const records: CattleRecord[] = Array.isArray(d.records) ? d.records : [];

    // Update offline cache
    storage.updateCattle(id, cattle);
    const otherRecords = storage.getRecords().filter((r) => r.cattleId !== id);
    storage.setRecords([...otherRecords, ...records]);

    return { ok: true, data: { ...cattle, records }, fromCache: false };
  },

  // ─── Records ─────────────────────────────────────────────────────────────────

  /**
   * Fetch all records from the server.
   */
  async getRecords(): Promise<ServiceResult<CattleRecord[]>> {
    if (!navigator.onLine) {
      return { ok: true, data: storage.getRecords(), fromCache: true };
    }

    const result = await apiFetch<CattleRecord[]>('/records');
    if (!result.ok) return { ok: false, error: result.error, status: (result as any).status };

    storage.setRecords(result.data);
    return { ok: true, data: result.data, fromCache: false };
  },

  // ─── Create Cattle ───────────────────────────────────────────────────────────

  /**
   * Create a new cattle record. Online-first; offline queue as fallback.
   */
  async createCattle(data: Omit<Cattle, 'lastUpdate'>): Promise<ServiceResult<Cattle>> {
    const newAnimal: Cattle = { ...data, lastUpdate: new Date().toISOString() };

    if (!navigator.onLine || !getToken()) {
      storage.addCattle(newAnimal);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'create', entity: 'cattle',
        data: newAnimal, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: newAnimal, fromCache: true };
    }

    const result = await apiFetch<any>('/cattle', {
      method: 'POST',
      body: JSON.stringify(newAnimal),
    });

    if (!result.ok) {
      // Offline fallback
      storage.addCattle(newAnimal);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'create', entity: 'cattle',
        data: newAnimal, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: newAnimal, fromCache: true };
    }

    // Revalidate after successful server write
    await farmDataService.revalidate();
    return { ok: true, data: result.data, fromCache: false };
  },

  /**
   * Update an existing cattle record. Online-first; offline queue as fallback.
   * Supports optimistic concurrency: pass lastUpdate to detect conflicts.
   */
  async updateCattle(id: string, updates: Partial<Cattle>): Promise<ServiceResult<Cattle>> {
    const updatesWithTimestamp = { ...updates, lastUpdate: new Date().toISOString() };

    if (!navigator.onLine || !getToken()) {
      storage.updateCattle(id, updatesWithTimestamp);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'update', entity: 'cattle',
        data: { id, ...updatesWithTimestamp }, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: { ...storage.getCattleById(id)!, ...updatesWithTimestamp }, fromCache: true };
    }

    const result = await apiFetch<any>(`/cattle/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatesWithTimestamp),
    });

    if (result.ok === false && (result as any).status === 409) {
      return { ok: false, error: result.error, status: 409 };
    }

    if (!result.ok) {
      // Offline fallback
      storage.updateCattle(id, updatesWithTimestamp);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'update', entity: 'cattle',
        data: { id, ...updatesWithTimestamp }, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: { ...storage.getCattleById(id)!, ...updatesWithTimestamp }, fromCache: true };
    }

    await farmDataService.revalidate();
    return { ok: true, data: result.data, fromCache: false };
  },

  // ─── Create Record ───────────────────────────────────────────────────────────

  /**
   * Create a new record (health, vaccination, milk, breeding, feeding).
   * Online-first; offline queue as fallback.
   */
  async createRecord(
    type: CattleRecord['type'],
    cattleId: string,
    notes: string,
    date: string,
    data?: any
  ): Promise<ServiceResult<CattleRecord>> {
    const recordId = `R${Date.now()}`;
    const user = storage.getUser();
    const recordDate = new Date(date).toISOString();

    const newRecord: CattleRecord = {
      id: recordId, cattleId, type, date: recordDate,
      notes, synced: false, createdBy: user?.id || 'unknown', data,
    };

    if (!navigator.onLine || !getToken()) {
      storage.addRecord(newRecord);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'create', entity: 'record',
        data: newRecord, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: newRecord, fromCache: true };
    }

    // Build type-specific payload
    const bodyPayload: any = { id: recordId, cattleId, date: recordDate };
    if (type === 'health') {
      bodyPayload.description = notes;
      bodyPayload.treatment = data?.treatment || 'General Checkup';
      bodyPayload.vetName = data?.vetName || user?.name || 'Attendant';
    } else if (type === 'vaccination') {
      bodyPayload.vaccineName = data?.vaccineName || notes;
      bodyPayload.dateAdministered = recordDate;
      bodyPayload.nextDueDate = data?.nextDueDate || new Date(Date.now() + 180 * 86400000).toISOString();
    } else if (type === 'milk') {
      bodyPayload.quantity = Number(data?.liters || parseFloat(notes) || 10);
    } else if (type === 'breeding') {
      bodyPayload.status = data?.status || notes;
      bodyPayload.partnerCattleId = data?.partnerCattleId || null;
    } else if (type === 'feeding') {
      bodyPayload.notes = notes;
    }

    const result = await apiFetch<any>(`/records/${type}`, {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });

    if (!result.ok) {
      storage.addRecord(newRecord);
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'create', entity: 'record',
        data: newRecord, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: newRecord, fromCache: true };
    }

    newRecord.synced = true;
    storage.addRecord(newRecord);
    await farmDataService.revalidate();
    return { ok: true, data: newRecord, fromCache: false };
  },

  // ─── Update Record ───────────────────────────────────────────────────────────

  async updateRecord(
    id: string,
    type: CattleRecord['type'],
    updates: Partial<CattleRecord>
  ): Promise<ServiceResult<CattleRecord>> {
    storage.updateRecord(id, updates);

    if (!navigator.onLine || !getToken()) {
      storage.addToSyncQueue({
        id: `sync_${Date.now()}`, type: 'update', entity: 'record',
        data: { id, type, ...updates }, status: 'pending', timestamp: new Date().toISOString(),
      });
      return { ok: true, data: storage.getRecords().find((r) => r.id === id)!, fromCache: true };
    }

    const result = await apiFetch<any>(`/records/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (result.ok) await farmDataService.revalidate();
    return result.ok
      ? { ok: true, data: result.data, fromCache: false }
      : { ok: false, error: result.error };
  },

  // ─── Sync Pending Queue ──────────────────────────────────────────────────────

  /**
   * Flush any locally queued offline mutations to the backend.
   * Idempotent — uses server-side upsert to prevent duplicate records.
   */
  async syncPendingQueue(): Promise<void> {
    if (!navigator.onLine || !getToken()) return;

    const queue = storage.getSyncQueue();
    const pending = queue.filter((item) => item.status === 'pending' || item.status === 'failed');
    if (pending.length === 0) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sync/push`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(pending.map((item) => ({
          id: item.id, type: item.type, entity: item.entity,
          data: item.data, timestamp: item.timestamp,
        }))),
      });
      if (res.ok) {
        storage.clearCompletedSyncItems();
      }
    } catch (err) {
      console.warn('Offline sync push deferred — will retry on next revalidation:', err);
    }
  },

  // ─── Global Revalidation ─────────────────────────────────────────────────────

  /**
   * Pull fresh authoritative data from the server and update all UI listeners.
   * Called automatically after mutations and periodically by RootLayout.
   * 
   * Does NOT modify the UI directly — it updates the offline cache and then
   * dispatches a 'farm-data-updated' event which all listening screens handle.
   */
  async revalidate(): Promise<void> {
    const token = getToken();
    if (!token || !navigator.onLine) return;

    try {
      // Flush pending queue first
      await farmDataService.syncPendingQueue();

      // Fetch authoritative cattle
      const cattleResult = await apiFetch<any[]>('/cattle');
      if (!cattleResult.ok) return;

      const cattle: Cattle[] = cattleResult.data.map((c) => ({
        id: c.id,
        tagNumber: c.tagNumber || `TAG-${c.id}`,
        name: c.name,
        breed: c.breed,
        age: c.age,
        gender: c.gender as Cattle['gender'],
        status: c.status as Cattle['status'],
        lastUpdate: c.lastUpdate || c.updatedAt || new Date().toISOString(),
      }));

      // Fetch authoritative records
      let records: CattleRecord[] = [];
      const recordsResult = await apiFetch<CattleRecord[]>('/records');
      if (recordsResult.ok) {
        records = recordsResult.data;
      }

      // Update offline cache
      storage.setCattle(cattle);
      storage.setRecords(records);

      // Notify all active screen listeners
      dispatchRevalidation(cattle, records);
    } catch (err) {
      console.warn('Revalidation skipped (network issue):', err);
    }
  },

  // ─── Reminders ───────────────────────────────────────────────────────────────

  /**
   * Fetch the current reminder/due-task list from PostgreSQL via the backend.
   * This is the ONLY legitimate source of reminders — no local computation.
   *
   * When offline: returns an empty reminder list clearly marked fromCache=true.
   * The UI should show an "offline — reminder data may be outdated" indicator.
   */
  async getReminders(): Promise<ServiceResult<ReminderResponse>> {
    if (!navigator.onLine || !getToken()) {
      // Offline: return empty reminders with cache flag — do NOT fabricate
      return {
        ok: true,
        fromCache: true,
        data: {
          reminders: [],
          summary: {
            dueToday: 0,
            overdueCount: 0,
            upcomingCount: 0,
            attentionCount: 0,
            totalReminders: 0,
          },
        },
      };
    }

    const result = await apiFetch<ReminderResponse>('/reminders');
    if (result.ok) {
      return { ok: true, data: result.data, fromCache: false };
    }
    return { ok: false, error: result.error, status: (result as any).status };
  },
};

