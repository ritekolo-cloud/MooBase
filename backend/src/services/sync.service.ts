import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { Prisma } from '@prisma/client';

export interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'cattle' | 'record';
  data?: any;
  timestamp?: string;
}

type SyncTransaction = Prisma.TransactionClient;

export class SyncService {
  /**
   * Processes a batch of synchronization items from the client's queue.
   * Runs each item and records results. Returns status of sync operation.
   */
  static async processSyncBatch(userId: string, userRole: 'manager' | 'attendant', items: SyncItem[]) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        await prisma.$transaction(async (tx) => {
          if (item.entity === 'cattle') {
            if (item.type === 'delete' && userRole !== 'manager') {
              throw new AppError('Only farm managers can delete cattle records', 403);
            }
            await this.syncCattle(tx, item);
          } else if (item.entity === 'record') {
            await this.syncRecord(tx, item);
          } else {
            throw new AppError(`Unknown entity type: ${item.entity}`, 400);
          }

          // Log the successful sync action in AuditLogs
          await tx.auditLog.create({
            data: {
              userId,
              action: `SYNC_${item.entity.toUpperCase()}_${item.type.toUpperCase()}`,
              description: `Successfully synced ${item.type} action on ${item.entity} (Client ID: ${item.data?.id || item.data?.tagNumber || item.id})`,
            },
          });
        });

        results.push({ id: item.id, status: 'completed' });
        successCount++;
      } catch (error: any) {
        console.error(`❌ Sync failed for item ${item.id}:`, error.message);
        results.push({ id: item.id, status: 'failed', error: error.message });
        failCount++;

        // Add to offline sync queue in failed state on backend for manager review
        try {
          await prisma.offlineSyncQueue.create({
            data: {
              userId,
              actionType: `${item.entity}:${item.type}`,
              payload: item as unknown as Prisma.InputJsonValue,
              status: 'failed',
            },
          });
        } catch (innerErr) {
          console.error('Failed to log sync failure into OfflineSyncQueue table:', innerErr);
        }
      }
    }

    return {
      success: failCount === 0,
      summary: {
        total: items.length,
        succeeded: successCount,
        failed: failCount,
      },
      details: results,
    };
  }

  private static async syncCattle(tx: SyncTransaction, item: SyncItem) {
    const { id, tagNumber, name, breed, age, gender, status } = item.data || {};

    if (!id) {
      throw new AppError('Cattle sync item requires data.id', 400);
    }

    const finalTagNumber = tagNumber || `TAG-${id}`;
    const finalGender = gender || 'female';

    if (item.type === 'create') {
      await tx.cattle.upsert({
        where: { id: id },
        update: { tagNumber: finalTagNumber, name, breed, age: Number(age), gender: finalGender, status: status || 'healthy' },
        create: {
          id: id,
          tagNumber: finalTagNumber,
          name,
          breed,
          age: Number(age),
          gender: finalGender,
          status: status || 'healthy',
        },
      });
    } else if (item.type === 'update') {
      await tx.cattle.update({
        where: { id: id },
        data: {
          tagNumber: tagNumber !== undefined ? tagNumber : undefined,
          name,
          breed,
          age: age !== undefined ? Number(age) : undefined,
          gender: gender !== undefined ? gender : undefined,
          status,
        },
      });
    } else if (item.type === 'delete') {
      // Deletes cascade to health, vaccination, milk, breeding and feeding records
      await tx.cattle.delete({
        where: { id: id },
      });
    }
  }

  private static async syncRecord(tx: SyncTransaction, item: SyncItem) {
    const { id, cattleId, type: recordType, date, notes, data: additionalData } = item.data || {};

    if (!id) {
      throw new AppError('Record sync item requires data.id', 400);
    }

    if (!recordType) {
      throw new AppError('Record sync item requires data.type', 400);
    }

    if (item.type !== 'delete') {
      if (!cattleId) {
        throw new AppError('Record sync item requires data.cattleId', 400);
      }

      const cattleExists = await tx.cattle.findUnique({ where: { id: cattleId } });
      if (!cattleExists) {
        throw new AppError(`Cattle record ${cattleId} not found in database. Cannot sync record.`, 404);
      }
    }

    if (item.type === 'delete') {
      // Depending on the recordType, delete from the appropriate table
      if (recordType === 'health') {
        await tx.healthRecord.deleteMany({ where: { id } });
      } else if (recordType === 'vaccination') {
        await tx.vaccinationRecord.deleteMany({ where: { id } });
      } else if (recordType === 'milk') {
        await tx.milkProduction.deleteMany({ where: { id } });
      } else if (recordType === 'breeding') {
        await tx.breedingRecord.deleteMany({ where: { id } });
      } else if (recordType === 'feeding') {
        await tx.feedingRecord.deleteMany({ where: { id } });
      }
      return;
    }

    const recordDate = new Date(date || Date.now());

    if (recordType === 'health') {
      const description = notes || 'No description provided';
      const treatment = additionalData?.treatment || 'N/A';
      const vetName = additionalData?.vetName || 'N/A';

      await tx.healthRecord.upsert({
        where: { id },
        update: { cattleId, description, treatment, vetName, date: recordDate },
        create: { id, cattleId, description, treatment, vetName, date: recordDate },
      });
      await tx.cattle.update({ where: { id: cattleId }, data: { status: 'sick', updatedAt: new Date() } });
    } else if (recordType === 'vaccination') {
      const vaccineName = additionalData?.vaccineName || notes || 'General Vaccine';
      const dateAdministered = recordDate;
      const nextDueDate = additionalData?.nextDueDate
        ? new Date(additionalData.nextDueDate)
        : new Date(recordDate.getTime() + 180 * 24 * 60 * 60 * 1000); // Default 6 months later

      await tx.vaccinationRecord.upsert({
        where: { id },
        update: { cattleId, vaccineName, dateAdministered, nextDueDate },
        create: { id, cattleId, vaccineName, dateAdministered, nextDueDate },
      });
      await tx.cattle.update({ where: { id: cattleId }, data: { status: 'vaccinated', updatedAt: new Date() } });
    } else if (recordType === 'milk') {
      const quantity = additionalData?.liters || parseFloat(notes) || 0;

      if (quantity <= 0) {
        throw new AppError('Milk production quantity must be greater than zero', 400);
      }

      await tx.milkProduction.upsert({
        where: { id },
        update: { cattleId, quantity, date: recordDate },
        create: { id, cattleId, quantity, date: recordDate },
      });
      await tx.cattle.update({ where: { id: cattleId }, data: { status: 'lactating', updatedAt: new Date() } });
    } else if (recordType === 'breeding') {
      const partnerCattleId = additionalData?.partnerCattleId || null;
      const status = additionalData?.status || notes || 'pending';

      if (partnerCattleId) {
        const partnerExists = await tx.cattle.findUnique({ where: { id: partnerCattleId } });
        if (!partnerExists) {
          throw new AppError(`Partner cattle record ${partnerCattleId} not found in database.`, 404);
        }
      }

      await tx.breedingRecord.upsert({
        where: { id },
        update: { cattleId, partnerCattleId, status, date: recordDate },
        create: { id, cattleId, partnerCattleId, status, date: recordDate },
      });
      await tx.cattle.update({ where: { id: cattleId }, data: { updatedAt: new Date() } });
    } else if (recordType === 'feeding') {
      const feedingNotes = notes || 'Standard feeding';

      await tx.feedingRecord.upsert({
        where: { id },
        update: { cattleId, notes: feedingNotes, date: recordDate },
        create: { id, cattleId, notes: feedingNotes, date: recordDate },
      });
      await tx.cattle.update({ where: { id: cattleId }, data: { updatedAt: new Date() } });
    } else {
      throw new AppError(`Unknown record type: ${recordType}`, 400);
    }
  }
}
export default SyncService;
