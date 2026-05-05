/**
 * Floor View Module - Zod Validation Schemas
 * Based on: .kiro/specs/station-floor-view/design.md
 */

import { z } from 'zod';

// ============================================
// Floor View Schemas
// ============================================

export const floorViewStatusEnum = z.enum(['available', 'occupied', 'reserved', 'out_of_service']);

// Schema for "Up Next" service information
export const upNextServiceSchema = z.object({
  id: z.string().uuid(),
  serviceName: z.string(),
  customerName: z.string(),
  assignedStylistId: z.string().uuid().nullable(),
  assignedStylistName: z.string().nullable(),
  estimatedStartTime: z.string().nullable(), // ISO timestamp
  durationMinutes: z.number(),
  sequence: z.number(),
});

// Schema for current service in multi-service appointment
export const currentServiceInfoSchema = z.object({
  id: z.string().uuid(),
  serviceName: z.string(),
  sequence: z.number(),
  status: z.string(),
  assignedStylistId: z.string().uuid().nullable(),
  assignedStylistName: z.string().nullable(),
  actualStylistId: z.string().uuid().nullable(),
  actualStylistName: z.string().nullable(),
});

export const stationCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stationType: z.object({
    id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
  }),
  displayOrder: z.number(),
  status: floorViewStatusEnum,
  appointment: z
    .object({
      id: z.string().uuid(),
      customerName: z.string(),
      stylistName: z.string().nullable(),
      assistantNames: z.array(z.string()),
      services: z.array(z.string()),
      startedAt: z.string().nullable(),
      estimatedEndTime: z.string().nullable(),
      scheduledTime: z.string(),
      scheduledDate: z.string(), // Date in YYYY-MM-DD format
      elapsedMinutes: z.number().nullable(),
      remainingMinutes: z.number().nullable(),
      progressPercent: z.number().nullable(),
      isOvertime: z.boolean(),
      // Multi-service fields
      isMultiService: z.boolean(),
      serviceCount: z.number(),
      currentServiceIndex: z.number().nullable(), // 1-based index of current service
      currentService: currentServiceInfoSchema.nullable(), // Details of current in-progress service
    })
    .nullable(),
  // "Up Next" service for this station (next service in sequence for multi-service appointments)
  upNext: upNextServiceSchema.nullable(),
});

export const floorViewResponseSchema = z.object({
  stations: z.array(stationCardSchema),
  summary: z.object({
    total: z.number(),
    available: z.number(),
    occupied: z.number(),
    reserved: z.number(),
    outOfService: z.number(),
  }),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().uuid(),
});

// ============================================
// Type Exports
// ============================================

export type FloorViewStatus = z.infer<typeof floorViewStatusEnum>;
export type StationCard = z.infer<typeof stationCardSchema>;
export type FloorViewResponse = z.infer<typeof floorViewResponseSchema>;
export type BranchIdParam = z.infer<typeof branchIdParamSchema>;
export type UpNextService = z.infer<typeof upNextServiceSchema>;
export type CurrentServiceInfo = z.infer<typeof currentServiceInfoSchema>;

// ============================================
// Response Schemas
// ============================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});
