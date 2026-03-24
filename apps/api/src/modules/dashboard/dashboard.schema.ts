/**
 * Dashboard Schemas
 * Zod schemas for Command Center API
 */

import { z } from 'zod';

// Query schema for command center
export const commandCenterQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CommandCenterQuery = z.infer<typeof commandCenterQuerySchema>;

// Response schemas
export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  stationType: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }),
  displayOrder: z.number(),
  status: z.enum(['available', 'occupied', 'out_of_service']),
  appointment: z
    .object({
      id: z.string(),
      customerName: z.string(),
      stylistName: z.string().nullable(),
      assistantNames: z.array(z.string()),
      services: z.array(z.string()),
      startedAt: z.string().nullable(),
      estimatedEndTime: z.string().nullable(),
      scheduledTime: z.string(),
      scheduledDate: z.string(), // Date in YYYY-MM-DD format
      delayMinutes: z.number(),
      elapsedMinutes: z.number().nullable(),
      remainingMinutes: z.number().nullable(),
      progressPercent: z.number().nullable(),
      isOvertime: z.boolean(),
    })
    .nullable(),
});

export const upcomingAppointmentSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  scheduledTime: z.string(),
  services: z.array(z.string()),
  stylistName: z.string(),
  status: z.enum(['booked', 'confirmed', 'checked_in']),
  isLate: z.boolean(),
});

export const walkInEntrySchema = z.object({
  id: z.string(),
  tokenNumber: z.number(),
  customerName: z.string(),
  services: z.array(z.string()),
  waitTime: z.number(),
  status: z.enum(['waiting', 'called', 'serving']),
});

export const attentionItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    'late_arrival',
    'pending_checkout',
    'walk_in_waiting',
    'low_stock',
    'pending_approval',
    'no_show_risk',
  ]),
  priority: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  entityType: z.enum(['appointment', 'customer', 'inventory', 'expense']),
  entityId: z.string(),
  createdAt: z.string(),
});

export const timelineAppointmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  customerName: z.string(),
  status: z.string(),
});

export const stylistScheduleSchema = z.object({
  stylistId: z.string(),
  stylistName: z.string(),
  avatar: z.string().nullable(),
  appointments: z.array(timelineAppointmentSchema),
});

export const quickStatsSchema = z.object({
  todayRevenue: z.number(),
  revenueChange: z.number(),
  appointmentsCompleted: z.number(),
  appointmentsRemaining: z.number(),
  walkInsServed: z.number(),
  averageWaitTime: z.number(),
  noShows: z.number(),
  occupancyRate: z.number(),
});

export const commandCenterResponseSchema = z.object({
  stats: quickStatsSchema,
  stations: z.array(stationSchema),
  nextUp: z.object({
    appointments: z.array(upcomingAppointmentSchema),
    walkIns: z.array(walkInEntrySchema),
  }),
  attentionItems: z.array(attentionItemSchema),
  timeline: z.array(stylistScheduleSchema),
});

export type Station = z.infer<typeof stationSchema>;
export type UpcomingAppointment = z.infer<typeof upcomingAppointmentSchema>;
export type WalkInEntry = z.infer<typeof walkInEntrySchema>;
export type AttentionItem = z.infer<typeof attentionItemSchema>;
export type QuickStats = z.infer<typeof quickStatsSchema>;
export type CommandCenterResponse = z.infer<typeof commandCenterResponseSchema>;

// =====================================================
// Owner Dashboard Schemas
// =====================================================

export const ownerDashboardQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export type OwnerDashboardQuery = z.infer<typeof ownerDashboardQuerySchema>;

export const ownerDashboardResponseSchema = z.object({
  revenue: z.object({
    today: z.number(),
    yesterday: z.number(),
    lastWeekSameDay: z.number(),
    percentChangeVsYesterday: z.number(),
    percentChangeVsLastWeek: z.number(),
  }),
  appointments: z.object({
    total: z.number(),
    completed: z.number(),
    cancelled: z.number(),
    noShows: z.number(),
    inProgress: z.number(),
    upcoming: z.number(),
  }),
  inventory: z.object({
    lowStockCount: z.number(),
    expiringCount: z.number(),
  }),
  staff: z.object({
    presentToday: z.number(),
    totalActive: z.number(),
    onLeave: z.number(),
  }),
});

export type OwnerDashboardResponse = z.infer<typeof ownerDashboardResponseSchema>;
