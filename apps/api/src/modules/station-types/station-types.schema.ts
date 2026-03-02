/**
 * Station Types Module - Zod Validation Schemas
 * Based on: .kiro/specs/station-floor-view/design.md
 */

import { z } from 'zod';

// ============================================
// Station Type Schemas
// ============================================

export const createStationTypeBodySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .default('#6B7280'),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateStationTypeBodySchema = createStationTypeBodySchema.partial();

export const stationTypeQuerySchema = z.object({
  includeDefaults: z.coerce.boolean().default(true),
});

// ============================================
// Type Exports
// ============================================

export type CreateStationTypeBody = z.infer<typeof createStationTypeBodySchema>;
export type UpdateStationTypeBody = z.infer<typeof updateStationTypeBodySchema>;
export type StationTypeQuery = z.infer<typeof stationTypeQuerySchema>;

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

// ID param schema
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;
