import { Response, NextFunction, Request } from 'express';
import { prisma } from '../config/db';

export class ReportController {
  static async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const totalCattle = await prisma.cattle.count();
      const healthyCount = await prisma.cattle.count({ where: { status: 'healthy' } });
      const sickCount = await prisma.cattle.count({ where: { status: 'sick' } });

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Count all types of records created today
      const healthToday = await prisma.healthRecord.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      });
      const vaccinesToday = await prisma.vaccinationRecord.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      });
      const milkToday = await prisma.milkProduction.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      });
      const breedingToday = await prisma.breedingRecord.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      });
      const feedingToday = await prisma.feedingRecord.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      });

      const todayRecords = healthToday + vaccinesToday + milkToday + breedingToday + feedingToday;

      // Average daily milk production in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const milkHistory = await prisma.milkProduction.aggregate({
        where: { date: { gte: thirtyDaysAgo } },
        _sum: { quantity: true },
      });

      const totalMilkInPeriod = milkHistory._sum.quantity || 0;
      const averageDailyMilk = parseFloat((totalMilkInPeriod / 30).toFixed(1));

      res.status(200).json({
        status: 'success',
        data: {
          totalCattle,
          healthyCount,
          sickCount,
          todayRecords,
          averageDailyMilk,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMilkProduction(_req: Request, res: Response, next: NextFunction) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch milk production records in the last 30 days
      const milkRecords = await prisma.milkProduction.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: {
          quantity: true,
          date: true,
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate milk production by date
      const aggregated: { [key: string]: number } = {};
      milkRecords.forEach(r => {
        const dateStr = r.date.toISOString().split('T')[0];
        aggregated[dateStr] = (aggregated[dateStr] || 0) + r.quantity;
      });

      const chartData = Object.keys(aggregated).map(date => ({
        date,
        liters: parseFloat(aggregated[date].toFixed(1)),
      }));

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
      // Get all currently sick cattle with their health records
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
          description: latestRecord?.description || 'No notes',
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

      // Find all vaccination records that have the nextDueDate
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

      // Filter to separate upcoming vs overdue
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
