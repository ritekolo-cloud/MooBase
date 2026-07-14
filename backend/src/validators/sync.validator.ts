import { z } from 'zod';

export const syncQueueItemSchema = z.object({
  id: z.string().min(1, 'Sync item ID is required'),
  type: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['cattle', 'record']),
  data: z.any(),
  timestamp: z.string().optional(),
});

export const batchSyncSchema = z.union([
  z.array(syncQueueItemSchema),
  z.object({ items: z.array(syncQueueItemSchema) }).transform((body) => body.items),
]);
export default batchSyncSchema;
