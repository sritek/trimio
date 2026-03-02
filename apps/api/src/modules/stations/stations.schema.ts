/**
 * Stations Module - Zod Validation Schemas
 * Based on: .kiro/specs/station-floor-view/design.md
 */

import { z } from 'zod';

// ============================================
// Station Schemas
// ============================================

export const stationStatusEnum = z.enum(['active', 'out_of_service']);

export const createStationBodySchema = z.object({
  stationTypeId: z.string().uuid(),
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const updateStationBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  stationTypeId: z.string().uuid().optional(),
  displayOrder: z.number().int().min(0).optional(),
  status: stationStatusEnum.optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const bulkCreateStationsBodySchema = z.object({
  stations: z
    .array(
      z.object({
        stationTypeId: z.string().uuid(),
        count: z.number().int().min(1).max(50),
      })
    )
    .min(1),
});

export const stationQuerySchema = z.object({
  status: stationStatusEnum.optional(),
  stationTypeId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false),
});

// ============================================
// Type Exports
// ============================================

export type StationStatus = z.infer<typeof stationStatusEnum>;
export type CreateStationBody = z.infer<typeof createStationBodySchema>;
export type UpdateStationBody = z.infer<typeof updateStationBodySchema>;
export type BulkCreateStationsBody = z.infer<typeof bulkCreateStationsBodySchema>;
export type StationQuery = z.infer<typeof stationQuerySchema>;

// ============================================
// Response Schemas
// ============================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// Param schemas
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type BranchIdParam = z.infer<typeof branchIdParamSchema>;
