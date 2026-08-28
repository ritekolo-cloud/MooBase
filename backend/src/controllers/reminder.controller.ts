import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderStatus = 'overdue' | 'due_today' | 'upcoming' | 'attention';
export type ReminderPriority = 'high' | 'medium' | 'low';
export type ReminderType = 'vaccination' | 'breeding_followup' | 'sick_cattle';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  cattleId: string;
  cattleName: string;
  cattleTag: string;
  dueDate: string | null;       // ISO string or null for attention-only items
  status: ReminderStatus;
  priority: ReminderPriority;
  description: string;
  // type-specific detail fields
  vaccineName?: string;         // vaccination reminders
  breedingDate?: string;        // breeding follow-up reminders
}

// ─── Date Helpers (UTC-normalized, no timezone drift) ─────────────────────────

/**
 * Returns midnight UTC for a given Date, as a plain Date object.
 * This ensures date comparisons are consistent regardless of server/client timezone.
 */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayUtc(): Date {
  return utcMidnight(new Date());
}

function compareDateStatus(dueDate: Date): ReminderStatus {
  const due = utcMidnight(dueDate);
  const today = todayUtc();

  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due_today';
  return 'upcoming';
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((utcMidnight(to).getTime() - utcMidnight(from).getTime()) / 86_400_000);
}

function formatDueDateDesc(dueDate: Date, status: ReminderStatus): string {
  const days = Math.abs(daysBetween(todayUtc(), dueDate));
  if (status === 'overdue') return days === 1 ? 'Due 1 day ago' : `Due ${days} days ago`;
  if (status === 'due_today') return 'Due today';
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class ReminderController {
  static async getReminders(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const today = todayUtc();
      const in14Days = new Date(today.getTime() + 14 * 86_400_000);

      const reminders: Reminder[] = [];

      // ── 1. VACCINATION REMINDERS ────────────────────────────────────────────
      //
      // Strategy: For each (cattle, vaccineName) pair, find the record with the
      // LATEST dateAdministered. That record's nextDueDate is the authoritative
      // "next due" for that vaccine type for that cattle.
      //
      // This prevents an older superseded vaccination record from generating a
      // spurious overdue reminder when a newer record of the same type exists.

      const allVaccinations = await prisma.vaccinationRecord.findMany({
        where: {
          nextDueDate: {
            lte: in14Days,  // only fetch records whose nextDueDate falls within scope
          },
        },
        orderBy: { dateAdministered: 'desc' },
        include: {
          cattle: {
            select: { id: true, name: true, tagNumber: true, status: true },
          },
        },
      });

      // Deduplicate: per (cattleId, vaccineName), keep only the record with the
      // latest dateAdministered (already sorted desc, so first occurrence wins).
      const seenVaccKeys = new Set<string>();
      for (const vacc of allVaccinations) {
        const key = `${vacc.cattleId}::${vacc.vaccineName.trim().toLowerCase()}`;
        if (seenVaccKeys.has(key)) continue; // older record of same type — skip
        seenVaccKeys.add(key);

        // Skip cattle that are sold or dead — no point reminding about them
        if (vacc.cattle.status === 'sold' || vacc.cattle.status === 'dead') continue;

        const status = compareDateStatus(vacc.nextDueDate);
        // Only include overdue, due_today, or upcoming (within 14 days)
        // "upcoming" is already filtered by the where clause above
        if (status === 'upcoming' && vacc.nextDueDate > in14Days) continue;

        const priority: ReminderPriority =
          status === 'overdue' || status === 'due_today' ? 'high' : 'medium';

        reminders.push({
          id: `vacc-${vacc.id}`,
          type: 'vaccination',
          title: status === 'overdue'
            ? 'Vaccination Overdue'
            : status === 'due_today'
            ? 'Vaccination Due Today'
            : 'Vaccination Upcoming',
          cattleId: vacc.cattle.id,
          cattleName: vacc.cattle.name,
          cattleTag: vacc.cattle.tagNumber,
          dueDate: vacc.nextDueDate.toISOString(),
          status,
          priority,
          description: `${vacc.vaccineName} — ${formatDueDateDesc(vacc.nextDueDate, status)}`,
          vaccineName: vacc.vaccineName,
        });
      }

      // ── 2. SICK CATTLE ATTENTION ALERTS ─────────────────────────────────────
      //
      // Cattle with status='sick' require attention. These are NOT date-based
      // reminders — they are ongoing health alerts until the status is updated.

      const sickCattle = await prisma.cattle.findMany({
        where: { status: 'sick' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, tagNumber: true, updatedAt: true },
      });

      for (const cattle of sickCattle) {
        reminders.push({
          id: `sick-${cattle.id}`,
          type: 'sick_cattle',
          title: 'Sick Cattle — Attention Required',
          cattleId: cattle.id,
          cattleName: cattle.name,
          cattleTag: cattle.tagNumber,
          dueDate: null,
          status: 'attention',
          priority: 'high',
          description: `${cattle.name} is marked as sick — requires veterinary attention`,
        });
      }

      // ── 3. BREEDING FOLLOW-UP REMINDERS ──────────────────────────────────────
      //
      // Breeding records with status='pending' indicate an unresolved breeding
      // event. There is NO nextDueDate in the schema, so these are NOT classified
      // as "due_today" or "overdue". They are attention/follow-up items showing
      // "Pending since [breedingDate]".

      const pendingBreeding = await prisma.breedingRecord.findMany({
        where: { status: 'pending' },
        orderBy: { date: 'desc' },
        include: {
          cattle: {
            select: { id: true, name: true, tagNumber: true, status: true },
          },
        },
      });

      for (const breeding of pendingBreeding) {
        // Skip cattle that are sold or dead
        if (breeding.cattle.status === 'sold' || breeding.cattle.status === 'dead') continue;

        const daysPending = daysBetween(breeding.date, new Date());
        reminders.push({
          id: `breed-${breeding.id}`,
          type: 'breeding_followup',
          title: 'Breeding Follow-up Required',
          cattleId: breeding.cattle.id,
          cattleName: breeding.cattle.name,
          cattleTag: breeding.cattle.tagNumber,
          dueDate: null,   // no due date — this is a follow-up, not a scheduled activity
          status: 'attention',
          priority: 'medium',
          description: daysPending === 0
            ? 'Breeding event recorded today — monitor outcome'
            : daysPending === 1
            ? 'Pending since yesterday — check breeding outcome'
            : `Pending since ${daysPending} days ago — check breeding outcome`,
          breedingDate: breeding.date.toISOString(),
        });
      }

      // ── Sort ─────────────────────────────────────────────────────────────────
      // Order: overdue → attention (sick) → due_today → upcoming
      const statusOrder: Record<ReminderStatus, number> = {
        overdue: 0,
        attention: 1,
        due_today: 2,
        upcoming: 3,
      };
      reminders.sort((a, b) => {
        const so = statusOrder[a.status] - statusOrder[b.status];
        if (so !== 0) return so;
        // Within same status group, sort by dueDate ascending (soonest first)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

      // ── Summary counts ───────────────────────────────────────────────────────
      const vaccinationReminders = reminders.filter((r) => r.type === 'vaccination');
      const overdueCount = vaccinationReminders.filter((r) => r.status === 'overdue').length;
      const dueTodayCount = vaccinationReminders.filter((r) => r.status === 'due_today').length;
      const upcomingCount = vaccinationReminders.filter((r) => r.status === 'upcoming').length;
      // attentionCount = sick cattle + pending breeding (no due date, just need action)
      const attentionCount = reminders.filter((r) => r.status === 'attention').length;
      const totalReminders = reminders.length;

      res.status(200).json({
        status: 'success',
        data: {
          reminders,
          summary: {
            dueToday: dueTodayCount,         // vaccinations actually due today
            overdueCount,                     // vaccinations past their nextDueDate
            upcomingCount,                    // vaccinations in next 14 days
            attentionCount,                   // sick cattle + pending breeding
            totalReminders,                   // all unresolved items
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
