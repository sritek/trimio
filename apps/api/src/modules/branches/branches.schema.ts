/**
 * Branch Schemas
 * Zod schemas for branch validation
 */

import { z } from 'zod';

export const branchQuerySchema = z.object({
  ids: z.string().optional(), // Comma-separated branch IDs
});

// Working hours schema for a single day
const dayWorkingHoursSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
});

// Update branch body schema
export const updateBranchBodySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  workingHours: z
    .object({
      monday: dayWorkingHoursSchema.optional(),
      tuesday: dayWorkingHoursSchema.optional(),
      wednesday: dayWorkingHoursSchema.optional(),
      thursday: dayWorkingHoursSchema.optional(),
      friday: dayWorkingHoursSchema.optional(),
      saturday: dayWorkingHoursSchema.optional(),
      sunday: dayWorkingHoursSchema.optional(),
    })
    .optional()
    .nullable(),
});

export type BranchQuery = z.infer<typeof branchQuerySchema>;
export type UpdateBranchBody = z.infer<typeof updateBranchBodySchema>;
