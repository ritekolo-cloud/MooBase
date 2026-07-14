import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { SyncService } from '../services/sync.service';
import { SyncItem } from '../services/sync.service';
import { AppError } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { batchSyncSchema } from '../validators/sync.validator';

export class SyncController {
  static async push(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User details not found in session', 401);
      }

      // Validate the batch sync payload
      const syncItems = batchSyncSchema.parse(req.body);

      // Delegate processing to the Sync Service
      const result = await SyncService.processSyncBatch(
        req.user.id,
        req.user.role,
        syncItems as SyncItem[]
      );

      res.status(200).json({
        status: 'success',
        message: 'Sync processing complete',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPending(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Get all unresolved sync items that require manager manual resolution.
      const pendingSyncs = await prisma.offlineSyncQueue.findMany({
        where: { status: { in: ['pending', 'failed'] } },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        status: 'success',
        data: pendingSyncs,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id, action } = req.body; // action: 'retry' or 'dismiss'
      if (!id || !['retry', 'dismiss'].includes(action)) {
        throw new AppError('Sync queue ID and resolution action are required', 400);
      }

      const syncItem = await prisma.offlineSyncQueue.findUnique({
        where: { id },
      });

      if (!syncItem) {
        throw new AppError(`Sync queue item ${id} not found`, 404);
      }

      if (action === 'retry') {
        const payload =
          typeof syncItem.payload === 'string'
            ? JSON.parse(syncItem.payload)
            : syncItem.payload;
        const result = await SyncService.processSyncBatch(req.user!.id, req.user!.role, [payload]);

        if (result.success) {
          // Update status in DB
          await prisma.offlineSyncQueue.update({
            where: { id },
            data: { status: 'synced' },
          });

          res.status(200).json({
            status: 'success',
            message: 'Sync item resolved and synced successfully',
            data: result,
          });
        } else {
          throw new AppError(`Retry failed: ${result.details[0].error}`, 400);
        }
      } else if (action === 'dismiss') {
        await prisma.offlineSyncQueue.delete({
          where: { id },
        });

        res.status(200).json({
          status: 'success',
          message: 'Sync item dismissed successfully',
        });
      } else {
        throw new AppError(`Unknown action: ${action}`, 400);
      }
    } catch (error) {
      next(error);
    }
  }
}
export default SyncController;
