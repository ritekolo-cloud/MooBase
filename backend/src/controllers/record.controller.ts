import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  healthRecordSchema,
  updateHealthRecordSchema,
  vaccinationRecordSchema,
  updateVaccinationRecordSchema,
  milkProductionSchema,
  updateMilkProductionSchema,
  breedingRecordSchema,
  updateBreedingRecordSchema,
  feedingRecordSchema,
  updateFeedingRecordSchema,
  recordTypeSchema,
} from '../validators/record.validator';

type RecordType = 'health' | 'vaccination' | 'milk' | 'breeding' | 'feeding';

const ensureCattleExists = async (cattleId: string) => {
  const cattle = await prisma.cattle.findUnique({ where: { id: cattleId } });
  if (!cattle) {
    throw new AppError(`Cattle with ID ${cattleId} not found`, 404);
  }
};

const touchCattle = async (cattleId: string, status?: 'healthy' | 'sick' | 'sold' | 'dead' | 'vaccinated' | 'lactating') => {
  await prisma.cattle.update({
    where: { id: cattleId },
    data: {
      updatedAt: new Date(),
      ...(status ? { status } : {}),
    },
  });
};

const logRecordAction = async (
  req: AuthenticatedRequest,
  action: string,
  description: string
) => {
  if (!req.user) return;

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action,
      description,
    },
  });
};

const ensureNewCattleExists = async (cattleId?: string) => {
  if (cattleId) {
    await ensureCattleExists(cattleId);
  }
};

export class RecordController {
  // --- HEALTH RECORDS ---
  static async createHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = healthRecordSchema.parse(req.body);
      await ensureCattleExists(data.cattleId);

      const record = await prisma.healthRecord.create({
        data: {
          id: data.id,
          cattleId: data.cattleId,
          description: data.description,
          treatment: data.treatment,
          vetName: data.vetName,
          date: data.date,
        },
      });

      await touchCattle(data.cattleId, 'sick');
      await logRecordAction(req, 'CREATE_HEALTH_RECORD', `Created health record for cattle ${data.cattleId}`);

      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async getHealthByCattle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { cattleId } = req.params;
      await ensureCattleExists(cattleId);

      const records = await prisma.healthRecord.findMany({
        where: { cattleId },
        orderBy: { date: 'desc' },
      });

      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }

  static async updateHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateHealthRecordSchema.parse(req.body);
      await ensureNewCattleExists(data.cattleId);

      const existing = await prisma.healthRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Health record ${id} not found`, 404);

      const record = await prisma.healthRecord.update({
        where: { id },
        data,
      });

      await touchCattle(record.cattleId, 'sick');
      await logRecordAction(req, 'UPDATE_HEALTH_RECORD', `Updated health record ${id}`);

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.healthRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Health record ${id} not found`, 404);

      await prisma.healthRecord.delete({ where: { id } });
      await touchCattle(existing.cattleId);
      await logRecordAction(req, 'DELETE_HEALTH_RECORD', `Deleted health record ${id}`);

      res.status(200).json({ status: 'success', message: `Health record ${id} deleted successfully` });
    } catch (error) {
      next(error);
    }
  }

  // --- VACCINATION RECORDS ---
  static async createVaccination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = vaccinationRecordSchema.parse(req.body);
      await ensureCattleExists(data.cattleId);

      const record = await prisma.vaccinationRecord.create({
        data: {
          id: data.id,
          cattleId: data.cattleId,
          vaccineName: data.vaccineName,
          dateAdministered: data.dateAdministered,
          nextDueDate: data.nextDueDate,
        },
      });

      await touchCattle(data.cattleId, 'vaccinated');
      await logRecordAction(req, 'CREATE_VACCINATION_RECORD', `Administered ${data.vaccineName} vaccine to cattle ${data.cattleId}`);

      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async getVaccinationByCattle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { cattleId } = req.params;
      await ensureCattleExists(cattleId);

      const records = await prisma.vaccinationRecord.findMany({
        where: { cattleId },
        orderBy: { dateAdministered: 'desc' },
      });

      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }

  static async updateVaccination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateVaccinationRecordSchema.parse(req.body);
      await ensureNewCattleExists(data.cattleId);

      const existing = await prisma.vaccinationRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Vaccination record ${id} not found`, 404);

      const record = await prisma.vaccinationRecord.update({
        where: { id },
        data,
      });

      await touchCattle(record.cattleId, 'vaccinated');
      await logRecordAction(req, 'UPDATE_VACCINATION_RECORD', `Updated vaccination record ${id}`);

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteVaccination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.vaccinationRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Vaccination record ${id} not found`, 404);

      await prisma.vaccinationRecord.delete({ where: { id } });
      await touchCattle(existing.cattleId);
      await logRecordAction(req, 'DELETE_VACCINATION_RECORD', `Deleted vaccination record ${id}`);

      res.status(200).json({ status: 'success', message: `Vaccination record ${id} deleted successfully` });
    } catch (error) {
      next(error);
    }
  }

  // --- MILK PRODUCTION ---
  static async createMilk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = milkProductionSchema.parse(req.body);
      await ensureCattleExists(data.cattleId);

      const record = await prisma.milkProduction.create({
        data: {
          id: data.id,
          cattleId: data.cattleId,
          quantity: data.quantity,
          date: data.date,
        },
      });

      await touchCattle(data.cattleId, 'lactating');
      await logRecordAction(req, 'CREATE_MILK_RECORD', `Recorded ${data.quantity}L milk yield from cattle ${data.cattleId}`);

      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async getMilkByCattle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { cattleId } = req.params;
      await ensureCattleExists(cattleId);

      const records = await prisma.milkProduction.findMany({
        where: { cattleId },
        orderBy: { date: 'desc' },
      });

      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }

  static async updateMilk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateMilkProductionSchema.parse(req.body);
      await ensureNewCattleExists(data.cattleId);

      const existing = await prisma.milkProduction.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Milk production record ${id} not found`, 404);

      const record = await prisma.milkProduction.update({
        where: { id },
        data,
      });

      await touchCattle(record.cattleId, 'lactating');
      await logRecordAction(req, 'UPDATE_MILK_RECORD', `Updated milk production record ${id}`);

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMilk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.milkProduction.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Milk production record ${id} not found`, 404);

      await prisma.milkProduction.delete({ where: { id } });
      await touchCattle(existing.cattleId);
      await logRecordAction(req, 'DELETE_MILK_RECORD', `Deleted milk production record ${id}`);

      res.status(200).json({ status: 'success', message: `Milk production record ${id} deleted successfully` });
    } catch (error) {
      next(error);
    }
  }

  // --- BREEDING RECORDS ---
  static async createBreeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = breedingRecordSchema.parse(req.body);
      await ensureCattleExists(data.cattleId);

      if (data.partnerCattleId) {
        await ensureCattleExists(data.partnerCattleId);
      }

      const record = await prisma.breedingRecord.create({
        data: {
          id: data.id,
          cattleId: data.cattleId,
          partnerCattleId: data.partnerCattleId,
          status: data.status,
          date: data.date,
        },
      });

      await touchCattle(data.cattleId);
      await logRecordAction(req, 'CREATE_BREEDING_RECORD', `Recorded breeding event for cattle ${data.cattleId} (Status: ${data.status})`);

      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async getBreedingByCattle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { cattleId } = req.params;
      await ensureCattleExists(cattleId);

      const records = await prisma.breedingRecord.findMany({
        where: {
          OR: [{ cattleId }, { partnerCattleId: cattleId }],
        },
        orderBy: { date: 'desc' },
      });

      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }

  static async updateBreeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateBreedingRecordSchema.parse(req.body);
      await ensureNewCattleExists(data.cattleId);
      if (data.partnerCattleId) await ensureCattleExists(data.partnerCattleId);

      const existing = await prisma.breedingRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Breeding record ${id} not found`, 404);

      const record = await prisma.breedingRecord.update({
        where: { id },
        data,
      });

      await touchCattle(record.cattleId);
      await logRecordAction(req, 'UPDATE_BREEDING_RECORD', `Updated breeding record ${id}`);

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBreeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.breedingRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Breeding record ${id} not found`, 404);

      await prisma.breedingRecord.delete({ where: { id } });
      await touchCattle(existing.cattleId);
      await logRecordAction(req, 'DELETE_BREEDING_RECORD', `Deleted breeding record ${id}`);

      res.status(200).json({ status: 'success', message: `Breeding record ${id} deleted successfully` });
    } catch (error) {
      next(error);
    }
  }

  // --- FEEDING RECORDS ---
  static async createFeeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = feedingRecordSchema.parse(req.body);
      await ensureCattleExists(data.cattleId);

      const record = await prisma.feedingRecord.create({
        data: {
          id: data.id,
          cattleId: data.cattleId,
          notes: data.notes,
          date: data.date,
        },
      });

      await touchCattle(data.cattleId);
      await logRecordAction(req, 'CREATE_FEEDING_RECORD', `Created feeding record for cattle ${data.cattleId}`);

      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async getFeedingByCattle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { cattleId } = req.params;
      await ensureCattleExists(cattleId);

      const records = await prisma.feedingRecord.findMany({
        where: { cattleId },
        orderBy: { date: 'desc' },
      });

      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }

  static async updateFeeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateFeedingRecordSchema.parse(req.body);
      await ensureNewCattleExists(data.cattleId);

      const existing = await prisma.feedingRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Feeding record ${id} not found`, 404);

      const record = await prisma.feedingRecord.update({
        where: { id },
        data,
      });

      await touchCattle(record.cattleId);
      await logRecordAction(req, 'UPDATE_FEEDING_RECORD', `Updated feeding record ${id}`);

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteFeeding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.feedingRecord.findUnique({ where: { id } });
      if (!existing) throw new AppError(`Feeding record ${id} not found`, 404);

      await prisma.feedingRecord.delete({ where: { id } });
      await touchCattle(existing.cattleId);
      await logRecordAction(req, 'DELETE_FEEDING_RECORD', `Deleted feeding record ${id}`);

      res.status(200).json({ status: 'success', message: `Feeding record ${id} deleted successfully` });
    } catch (error) {
      next(error);
    }
  }

  static async deleteByType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const type = recordTypeSchema.parse(req.params.type) as RecordType;

      if (type === 'health') return RecordController.deleteHealth(req, res, next);
      if (type === 'vaccination') return RecordController.deleteVaccination(req, res, next);
      if (type === 'milk') return RecordController.deleteMilk(req, res, next);
      if (type === 'breeding') return RecordController.deleteBreeding(req, res, next);
      return RecordController.deleteFeeding(req, res, next);
    } catch (error) {
      next(error);
    }
  }
}

export default RecordController;
