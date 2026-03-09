/**
 * Calendar API Schemas
 * Zod schemas for resource calendar endpoints
 */

import { z } from 'zod';

// =====================================================
// INPUT SCHEMAS
// =====================================================

export const getResourceCalendarSchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  view: z.enum(['day', 'week']).default('day'),
});

export const moveAppointmentSchema = z.object({
  newStylistId: z.string().uuid().optional(),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// =====================================================
// RESPONSE TYPES
// =====================================================

export const calendarStylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  color: z.string(),
  isAvailable: z.boolean(),
  workingHours: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .nullable(),
  breaks: z.array(
    z.object({
      id: z.string(),
      start: z.string(),
      end: z.string(),
      name: z.string(),
    })
  ),
  blockedSlots: z.array(
    z.object({
      id: z.string(),
      start: z.string(),
      end: z.string(),
      reason: z.string().nullable(),
      isFullDay: z.boolean(),
    })
  ),
});

export const conflictInfoSchema = z.object({
  conflictingAppointmentIds: z.array(z.string()),
  overlapMinutes: z.number(),
  severity: z.enum(['warning', 'severe']), // warning = partial (<50%), severe = significant (>=50%)
});

export const calendarAppointmentSchema = z.object({
  id: z.string(),
  stylistId: z.string().nullable(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  services: z.array(z.string()),
  status: z.string(),
  bookingType: z.string(),
  totalAmount: z.number(),
  hasConflict: z.boolean(),
  conflictInfo: conflictInfoSchema.nullable(),
});

export const resourceCalendarResponseSchema = z.object({
  date: z.string(),
  view: z.enum(['day', 'week']),
  stylists: z.array(calendarStylistSchema),
  appointments: z.array(calendarAppointmentSchema),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type GetResourceCalendarInput = z.infer<typeof getResourceCalendarSchema>;
export type MoveAppointmentInput = z.infer<typeof moveAppointmentSchema>;
export type CalendarStylist = z.infer<typeof calendarStylistSchema>;
export type CalendarAppointment = z.infer<typeof calendarAppointmentSchema>;
export type ConflictInfo = z.infer<typeof conflictInfoSchema>;
export type ResourceCalendarResponse = z.infer<typeof resourceCalendarResponseSchema>;
