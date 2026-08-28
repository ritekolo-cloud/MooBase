import { Response, NextFunction, Request } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { cattleSchema, updateCattleSchema } from '../validators/cattle.validator';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class CattleController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const cattle = await prisma.cattle.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Map to frontend expected format
      const formattedCattle = cattle.map(c => ({
        id: c.id,
        tagNumber: c.tagNumber,
        name: c.name,
        breed: c.breed,
        age: c.age,
        status: c.status.toLowerCase(),
        gender: c.gender,
        lastUpdate: c.updatedAt.toISOString(),
      }));

      res.status(200).json({
        status: 'success',
        data: formattedCattle,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const cattle = await prisma.cattle.findUnique({
        where: { id },
        include: {
          healthRecords: { orderBy: { date: 'desc' } },
          vaccinationRecords: { orderBy: { dateAdministered: 'desc' } },
          milkProductions: { orderBy: { date: 'desc' } },
          breedingRecords: { orderBy: { date: 'desc' } },
          feedingRecords: { orderBy: { date: 'desc' } },
        },
      });

      if (!cattle) {
        throw new AppError(`Cattle record ${id} not found`, 404);
      }

      // Consolidate and format records to match the frontend expected schema
      const records: any[] = [];

      cattle.healthRecords.forEach(r => {
        records.push({
          id: r.id,
          cattleId: r.cattleId,
          type: 'health',
          date: r.date.toISOString(),
          notes: r.description,
          synced: true,
          createdBy: 'system',
          data: {
            treatment: r.treatment,
            vetName: r.vetName,
          },
        });
      });

      cattle.vaccinationRecords.forEach(r => {
        records.push({
          id: r.id,
          cattleId: r.cattleId,
          type: 'vaccination',
          date: r.dateAdministered.toISOString(),
          notes: `Vaccine administered: ${r.vaccineName}`,
          synced: true,
          createdBy: 'system',
          data: {
            vaccineName: r.vaccineName,
            nextDueDate: r.nextDueDate.toISOString(),
          },
        });
      });

      cattle.milkProductions.forEach(r => {
        records.push({
          id: r.id,
          cattleId: r.cattleId,
          type: 'milk',
          date: r.date.toISOString(),
          notes: `${r.quantity} liters recorded`,
          synced: true,
          createdBy: 'system',
          data: {
            liters: r.quantity,
          },
        });
      });

      cattle.breedingRecords.forEach(r => {
        records.push({
          id: r.id,
          cattleId: r.cattleId,
          type: 'breeding',
          date: r.date.toISOString(),
          notes: `Breeding status: ${r.status}`,
          synced: true,
          createdBy: 'system',
          data: {
            partnerCattleId: r.partnerCattleId,
            status: r.status,
          },
        });
      });

      cattle.feedingRecords.forEach(r => {
        records.push({
          id: r.id,
          cattleId: r.cattleId,
          type: 'feeding',
          date: r.date.toISOString(),
          notes: r.notes,
          synced: true,
          createdBy: 'system',
        });
      });

      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const formattedCattle = {
        id: cattle.id,
        tagNumber: cattle.tagNumber,
        name: cattle.name,
        breed: cattle.breed,
        age: cattle.age,
        status: cattle.status.toLowerCase(),
        gender: cattle.gender,
        lastUpdate: cattle.updatedAt.toISOString(),
        records,
      };

      res.status(200).json({
        status: 'success',
        data: formattedCattle,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = cattleSchema.parse(req.body);

      // Generate ID if missing
      const id = data.id || `C${String(Date.now()).slice(-4)}`;
      const tagNumber = data.tagNumber || `TAG-${id}`;

      const cattle = await prisma.cattle.upsert({
        where: { id },
        update: {
          tagNumber,
          name: data.name,
          breed: data.breed,
          age: data.age,
          gender: data.gender,
          status: data.status,
        },
        create: {
          id,
          tagNumber,
          name: data.name,
          breed: data.breed,
          age: data.age,
          gender: data.gender,
          status: data.status,
        },
      });

      // Audit Log
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'CREATE_CATTLE',
            description: `Created/Updated cattle ${cattle.name} with Tag ${cattle.tagNumber}`,
          },
        });
      }

      res.status(201).json({
        status: 'success',
        data: cattle,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateCattleSchema.parse(req.body);
      const tagNumber = data.tagNumber || `TAG-${id}`;

      const updatedCattle = await prisma.cattle.upsert({
        where: { id },
        update: {
          tagNumber: data.tagNumber !== undefined ? data.tagNumber : undefined,
          name: data.name !== undefined ? data.name : undefined,
          breed: data.breed !== undefined ? data.breed : undefined,
          age: data.age !== undefined ? data.age : undefined,
          gender: data.gender !== undefined ? data.gender : undefined,
          status: data.status !== undefined ? data.status : undefined,
        },
        create: {
          id,
          tagNumber,
          name: data.name || 'Unknown',
          breed: data.breed || 'Crossbreed',
          age: data.age || 1,
          gender: data.gender || 'female',
          status: data.status || 'healthy',
        },
      });

      // Audit Log
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'UPDATE_CATTLE',
            description: `Updated cattle details for ${updatedCattle.name} (${id})`,
          },
        });
      }

      res.status(200).json({
        status: 'success',
        data: updatedCattle,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const cattle = await prisma.cattle.findUnique({ where: { id } });
      if (!cattle) {
        throw new AppError(`Cattle record ${id} not found`, 404);
      }

      await prisma.cattle.delete({ where: { id } });

      // Audit Log
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'DELETE_CATTLE',
            description: `Deleted cattle record for ${cattle.name} (${id})`,
          },
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Cattle record ${id} deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default CattleController;
