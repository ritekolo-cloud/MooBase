import { Response, NextFunction, Request } from 'express';
import { prisma } from '../config/db';

export class ReportController {
  static async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Cattle Status Aggregation from operational 'cattle' table
      const totalCattle = await prisma.cattle.count();
      const healthyCount = await prisma.cattle.count({ where: { status: 'healthy' } });
      const sickCount = await prisma.cattle.count({ where: { status: 'sick' } });
      const lactatingCount = await prisma.cattle.count({ where: { status: 'lactating' } });
      const vaccinatedCount = await prisma.cattle.count({ where: { status: 'vaccinated' } });
      const soldCount = await prisma.cattle.count({ where: { status: 'sold' } });
      const deadCount = await prisma.cattle.count({ where: { status: 'dead' } });

      const statusDistribution = [
        { name: 'Healthy', value: healthyCount, color: '#16A34A' },
        { name: 'Sick', value: sickCount, color: '#DC2626' },
        { name: 'Lactating', value: lactatingCount, color: '#1E3A8A' },
        { name: 'Vaccinated', value: vaccinatedCount, color: '#F59E0B' },
      ];

      // 2. Records by Type Aggregation across all 5 operational tables
      const healthCount = await prisma.healthRecord.count();
      const vaccinationCount = await prisma.vaccinationRecord.count();
      const milkCount = await prisma.milkProduction.count();
      const breedingCount = await prisma.breedingRecord.count();
      const feedingCount = await prisma.feedingRecord.count();

      const totalRecords = healthCount + vaccinationCount + milkCount + breedingCount + feedingCount;

      const recordsByType = [
        { name: 'Health', count: healthCount },
        { name: 'Vaccination', count: vaccinationCount },
        { name: 'Feeding', count: feedingCount },
        { name: 'Milk', count: milkCount },
        { name: 'Breeding', count: breedingCount },
      ];

      // 3. Today's Activity Count
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [healthToday, vaccinesToday, milkToday, breedingToday, feedingToday] = await Promise.all([
        prisma.healthRecord.count({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
        prisma.vaccinationRecord.count({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
        prisma.milkProduction.count({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
        prisma.breedingRecord.count({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
        prisma.feedingRecord.count({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
      ]);

      const todayRecords = healthToday + vaccinesToday + milkToday + breedingToday + feedingToday;

      // 4. Milk Production Analytical Metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const [milkHistory30, milkHistoryAll] = await Promise.all([
        prisma.milkProduction.aggregate({
          where: { date: { gte: thirtyDaysAgo } },
          _sum: { quantity: true },
        }),
        prisma.milkProduction.aggregate({
          _sum: { quantity: true },
        }),
      ]);

      const totalMilkIn30Days = milkHistory30._sum.quantity || 0;
      const totalMilkAllTime = milkHistoryAll._sum.quantity || 0;
      const averageDailyMilk = parseFloat((totalMilkIn30Days / 30).toFixed(1));

      res.status(200).json({
        status: 'success',
        data: {
          totalCattle,
          healthyCount,
          sickCount,
          lactatingCount,
          vaccinatedCount,
          soldCount,
          deadCount,
          statusDistribution,
          totalRecords,
          healthCount,
          vaccinationCount,
          milkCount,
          breedingCount,
          feedingCount,
          recordsByType,
          todayRecords,
          averageDailyMilk,
          totalMilkIn30Days,
          totalMilkAllTime,
          // Missing schema data dependencies explicitly identified:
          unavailableMetrics: [
            {
              id: 'financial_revenue',
              name: 'Milk Sales & Revenue',
              reason: 'Missing pricePerLiter or sales transaction table in database schema',
            },
            {
              id: 'feed_conversion_ratio',
              name: 'Feed Weight & Cost Analysis',
              reason: 'FeedingRecord stores unstructured notes; lacks weightKg and costPerKg fields',
            },
            {
              id: 'calving_projections',
              name: 'Expected Calving Projections',
              reason: 'BreedingRecord lacks expectedCalvingDate and inseminationType fields',
            },
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMilkProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      // Fetch actual operational milk production records in the requested date range
      const milkRecords = await prisma.milkProduction.findMany({
        where: { date: { gte: startDate } },
        select: {
          id: true,
          quantity: true,
          date: true,
          cattleId: true,
        },
        orderBy: { date: 'asc' },
      });

      // Construct a continuous daily timeline for the requested window
      const dailyMap = new Map<string, { totalLiters: number; count: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, { totalLiters: 0, count: 0 });
      }

      milkRecords.forEach(r => {
        const key = r.date.toISOString().split('T')[0];
        const existing = dailyMap.get(key);
        if (existing) {
          existing.totalLiters += r.quantity;
          existing.count += 1;
        } else {
          dailyMap.set(key, { totalLiters: r.quantity, count: 1 });
        }
      });

      const chartData = Array.from(dailyMap.entries()).map(([dateStr, stats]) => {
        const d = new Date(dateStr);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: dateStr,
          production: parseFloat(stats.totalLiters.toFixed(1)),
          recordCount: stats.count,
        };
      });

      res.status(200).json({
        status: 'success',
        data: chartData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHealthStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      // Get all currently sick cattle with their health records from the database
      const sickCattle = await prisma.cattle.findMany({
        where: { status: 'sick' },
        include: {
          healthRecords: {
            orderBy: { date: 'desc' },
            take: 1, // Get the latest treatment record
          },
        },
      });

      const report = sickCattle.map(c => {
        const latestRecord = c.healthRecords[0];
        return {
          cattleId: c.id,
          name: c.name,
          breed: c.breed,
          description: latestRecord?.description || 'No treatment notes logged',
          treatment: latestRecord?.treatment || 'No treatment logged',
          vetName: latestRecord?.vetName || 'N/A',
          dateDetected: latestRecord?.date.toISOString() || c.updatedAt.toISOString(),
        };
      });

      res.status(200).json({
        status: 'success',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVaccinationStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();

      // Find all vaccination records that have nextDueDate
      const records = await prisma.vaccinationRecord.findMany({
        include: {
          cattle: {
            select: {
              name: true,
              breed: true,
            },
          },
        },
        orderBy: { nextDueDate: 'asc' },
      });

      // Filter to separate upcoming vs overdue based on current time
      const overdue = records
        .filter(r => new Date(r.nextDueDate) < now)
        .map(r => ({
          id: r.id,
          cattleId: r.cattleId,
          cattleName: r.cattle.name,
          vaccineName: r.vaccineName,
          lastAdministered: r.dateAdministered.toISOString(),
          dueDate: r.nextDueDate.toISOString(),
          status: 'overdue',
        }));

      const upcoming = records
        .filter(r => new Date(r.nextDueDate) >= now)
        .map(r => ({
          id: r.id,
          cattleId: r.cattleId,
          cattleName: r.cattle.name,
          vaccineName: r.vaccineName,
          lastAdministered: r.dateAdministered.toISOString(),
          dueDate: r.nextDueDate.toISOString(),
          status: 'upcoming',
        }));

      res.status(200).json({
        status: 'success',
        data: {
          overdue,
          upcoming,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
export default ReportController;
