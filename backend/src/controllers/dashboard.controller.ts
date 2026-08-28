import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class DashboardController {
  static async getSummary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Cattle Status Counts — authoritative from PostgreSQL
      const [totalCattle, healthyCount, sickCount, lactatingCount, vaccinatedCount, soldCount, deadCount] =
        await Promise.all([
          prisma.cattle.count(),
          prisma.cattle.count({ where: { status: 'healthy' } }),
          prisma.cattle.count({ where: { status: 'sick' } }),
          prisma.cattle.count({ where: { status: 'lactating' } }),
          prisma.cattle.count({ where: { status: 'vaccinated' } }),
          prisma.cattle.count({ where: { status: 'sold' } }),
          prisma.cattle.count({ where: { status: 'dead' } }),
        ]);

      // 2. UTC-normalized date boundaries (consistent regardless of server timezone)
      const nowUtc = new Date();
      const todayUtcStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
      const todayUtcEnd = new Date(todayUtcStart.getTime() + 86_400_000 - 1);
      const in14DaysUtc = new Date(todayUtcStart.getTime() + 14 * 86_400_000);

      // 3. Today's Milk Production (using local day boundaries for milk logging)
      const todayMilkRecords = await prisma.milkProduction.findMany({
        where: { date: { gte: todayUtcStart, lte: todayUtcEnd } },
        select: { quantity: true },
      });
      const todayMilkLiters = todayMilkRecords.reduce((sum, r) => sum + r.quantity, 0);
      const milkTodayCount = todayMilkRecords.length;

      // 4. Reminder counts — using same logic as ReminderController for consistency
      //    dueToday:      vaccinations with nextDueDate = today exactly
      //    overdueCount:  vaccinations with nextDueDate < today
      //    upcomingCount: vaccinations with nextDueDate in next 14 days (exclusive of today)
      //    attentionCount: sick cattle + pending breeding follow-ups (no due date)
      const [dueTodayCount, overdueCount, upcomingCount, attentionSick, attentionBreeding] =
        await Promise.all([
          // Vaccinations due exactly today
          prisma.vaccinationRecord.count({
            where: { nextDueDate: { gte: todayUtcStart, lte: todayUtcEnd } },
          }),
          // Vaccinations past their due date
          prisma.vaccinationRecord.count({
            where: { nextDueDate: { lt: todayUtcStart } },
          }),
          // Vaccinations upcoming in next 14 days (after today)
          prisma.vaccinationRecord.count({
            where: { nextDueDate: { gt: todayUtcEnd, lte: in14DaysUtc } },
          }),
          // Sick cattle attention
          prisma.cattle.count({ where: { status: 'sick' } }),
          // Pending breeding follow-ups
          prisma.breedingRecord.count({ where: { status: 'pending' } }),
        ]);
      const attentionCount = attentionSick + attentionBreeding;
      const totalReminders = dueTodayCount + overdueCount + upcomingCount + attentionCount;

      // 5. Today's total activity count (records created/administered today)
      const [healthToday, vaccinesToday, breedingToday, feedingToday] = await Promise.all([
        prisma.healthRecord.count({ where: { createdAt: { gte: todayUtcStart, lte: todayUtcEnd } } }),
        prisma.vaccinationRecord.count({ where: { createdAt: { gte: todayUtcStart, lte: todayUtcEnd } } }),
        prisma.breedingRecord.count({ where: { createdAt: { gte: todayUtcStart, lte: todayUtcEnd } } }),
        prisma.feedingRecord.count({ where: { createdAt: { gte: todayUtcStart, lte: todayUtcEnd } } }),
      ]);
      const todayActivitiesCount = healthToday + vaccinesToday + milkTodayCount + breedingToday + feedingToday;


      // 6. Sick / Require Attention Cattle List
      const sickCattle = await prisma.cattle.findMany({
        where: { status: 'sick' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, tagNumber: true, name: true, breed: true, age: true, gender: true, status: true, updatedAt: true },
      });

      // 7. Recent Cattle (for attendant assigned view)
      const assignedCattle = await prisma.cattle.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, tagNumber: true, name: true, breed: true, age: true, gender: true, status: true, updatedAt: true },
      });

      // 8. Recent Activity Events from all 5 record types
      const [recentHealth, recentVaccines, recentMilk, recentBreeding, recentFeeding] = await Promise.all([
        prisma.healthRecord.findMany({
          take: 5, orderBy: { date: 'desc' },
          include: { cattle: { select: { name: true, tagNumber: true } } },
        }),
        prisma.vaccinationRecord.findMany({
          take: 5, orderBy: { dateAdministered: 'desc' },
          include: { cattle: { select: { name: true, tagNumber: true } } },
        }),
        prisma.milkProduction.findMany({
          take: 5, orderBy: { date: 'desc' },
          include: { cattle: { select: { name: true, tagNumber: true } } },
        }),
        prisma.breedingRecord.findMany({
          take: 5, orderBy: { date: 'desc' },
          include: { cattle: { select: { name: true, tagNumber: true } } },
        }),
        prisma.feedingRecord.findMany({
          take: 5, orderBy: { date: 'desc' },
          include: { cattle: { select: { name: true, tagNumber: true } } },
        }),
      ]);

      const recentActivities: any[] = [];

      recentHealth.forEach((r) => {
        recentActivities.push({
          id: r.id, cattleId: r.cattleId,
          cattleName: r.cattle.name, cattleTag: r.cattle.tagNumber,
          type: 'health', date: r.date.toISOString(),
          title: 'Health Check / Treatment',
          description: `${r.cattle.name} — ${r.treatment || r.description}`,
        });
      });
      recentVaccines.forEach((r) => {
        recentActivities.push({
          id: r.id, cattleId: r.cattleId,
          cattleName: r.cattle.name, cattleTag: r.cattle.tagNumber,
          type: 'vaccination', date: r.dateAdministered.toISOString(),
          title: 'Vaccination Given',
          description: `${r.cattle.name} — ${r.vaccineName}`,
        });
      });
      recentMilk.forEach((r) => {
        recentActivities.push({
          id: r.id, cattleId: r.cattleId,
          cattleName: r.cattle.name, cattleTag: r.cattle.tagNumber,
          type: 'milk', date: r.date.toISOString(),
          title: 'Milk Recorded',
          description: `${r.cattle.name} — ${r.quantity} Liters`,
        });
      });
      recentBreeding.forEach((r) => {
        recentActivities.push({
          id: r.id, cattleId: r.cattleId,
          cattleName: r.cattle.name, cattleTag: r.cattle.tagNumber,
          type: 'breeding', date: r.date.toISOString(),
          title: 'Breeding Event',
          description: `${r.cattle.name} — Status: ${r.status}`,
        });
      });
      recentFeeding.forEach((r) => {
        recentActivities.push({
          id: r.id, cattleId: r.cattleId,
          cattleName: r.cattle.name, cattleTag: r.cattle.tagNumber,
          type: 'feeding', date: r.date.toISOString(),
          title: 'Feeding Logged',
          description: `${r.cattle.name} — ${r.notes}`,
        });
      });

      recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.status(200).json({
        status: 'success',
        data: {
          totalCattle,
          healthyCount,
          sickCount,
          requireAttention: sickCount,
          lactatingCount,
          vaccinatedCount,
          soldCount,
          deadCount,
          todayMilkLiters,
          milkToday: milkTodayCount,
          // Reminder counts — each is a distinct, accurate measurement
          dueToday: dueTodayCount,        // vaccinations with nextDueDate = today
          overdueCount,                    // vaccinations past nextDueDate
          upcomingCount,                   // vaccinations in next 14 days
          attentionCount,                  // sick cattle + pending breeding
          totalReminders,                  // all unresolved items
          todayActivities: todayActivitiesCount,
          sickCattleList: sickCattle.map((c) => ({
            id: c.id, tagNumber: c.tagNumber, name: c.name,
            breed: c.breed, age: c.age, gender: c.gender,
            status: c.status, lastUpdate: c.updatedAt.toISOString(),
          })),
          assignedCattle: assignedCattle.map((c) => ({
            id: c.id, tagNumber: c.tagNumber, name: c.name,
            breed: c.breed, age: c.age, gender: c.gender,
            status: c.status, lastUpdate: c.updatedAt.toISOString(),
          })),
          recentActivities: recentActivities.slice(0, 8),
          serverTimestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      next(error);
    }
  }
}
