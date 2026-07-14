import { z } from 'zod';

const dateString = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return val;
}, z.date().refine((date) => !Number.isNaN(date.getTime()), 'Invalid date'));

export const healthRecordSchema = z.object({
  id: z.string().optional(),
  cattleId: z.string().min(1, 'Cattle ID is required'),
  description: z.string().min(1, 'Description is required'),
  treatment: z.string().min(1, 'Treatment is required'),
  vetName: z.string().min(1, 'Vet name is required'),
  date: dateString,
});

export const updateHealthRecordSchema = healthRecordSchema.partial().omit({ id: true });

export const vaccinationRecordSchema = z.object({
  id: z.string().optional(),
  cattleId: z.string().min(1, 'Cattle ID is required'),
  vaccineName: z.string().min(1, 'Vaccine name is required'),
  dateAdministered: dateString,
  nextDueDate: dateString,
});

export const updateVaccinationRecordSchema = vaccinationRecordSchema.partial().omit({ id: true });

export const milkProductionSchema = z.object({
  id: z.string().optional(),
  cattleId: z.string().min(1, 'Cattle ID is required'),
  quantity: z.preprocess((val) => Number(val), z.number().positive('Quantity must be a positive number')),
  date: dateString,
});

export const updateMilkProductionSchema = milkProductionSchema.partial().omit({ id: true });

export const breedingRecordSchema = z.object({
  id: z.string().optional(),
  cattleId: z.string().min(1, 'Cattle ID is required'),
  partnerCattleId: z.string().optional().nullable(),
  status: z.string().min(1, 'Breeding status is required'),
  date: dateString,
});

export const updateBreedingRecordSchema = breedingRecordSchema.partial().omit({ id: true });

export const feedingRecordSchema = z.object({
  id: z.string().optional(),
  cattleId: z.string().min(1, 'Cattle ID is required'),
  notes: z.string().min(1, 'Feeding notes are required'),
  date: dateString,
});

export const updateFeedingRecordSchema = feedingRecordSchema.partial().omit({ id: true });

export const recordTypeSchema = z.enum(['health', 'vaccination', 'milk', 'breeding', 'feeding']);
