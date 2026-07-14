import { z } from 'zod';

export const cattleSchema = z.object({
  id: z.string().min(1, 'Cattle ID is required'),
  tagNumber: z.string().min(1, 'Tag number is required'),
  name: z.string().min(1, 'Cattle name is required'),
  breed: z.string().min(1, 'Breed is required'),
  age: z.preprocess((val) => Number(val), z.number().int().nonnegative('Age must be a non-negative integer')),
  gender: z.string().min(1, 'Gender is required'),
  status: z.enum(['healthy', 'sick', 'sold', 'dead', 'vaccinated', 'lactating']).default('healthy'),
});

export const updateCattleSchema = cattleSchema.partial().omit({ id: true });
