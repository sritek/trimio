import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const appointmentStatusEnum = z.enum([
  'booked',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

export const bookingTypeEnum = z.enum(['online', 'phone', 'walk_in']);

export const genderPreferenceEnum = z.enum(['male', 'female', 'any']);

export const serviceStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

export const queueStatusEnum = z.enum(['waiting', 'called', 'serving', 'completed', 'left']);

// =====================================================
// CREATE APPOINTMENT
// =====================================================

// Base schema without refinement (for extending)
const createAppointmentBaseSchema = z.object({
  branchId: z.string().uuid(),

  // Customer - at least one identifier required
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(2).max(255).optional(),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
    .optional(),

  // Scheduling
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),

  // Services
  services: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        stylistId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(1, 'At least one service is required'),

  // Stylist preference
  stylistId: z.string().uuid().optional(),
  stylistGenderPreference: genderPreferenceEnum.optional(),

  // Assign later - allows creating appointment without stylist assignment
  assignLater: z.boolean().default(false),

  // Type
  bookingType: bookingTypeEnum,
  bookingSource: z.string().max(50).optional(),

  // Notes
  customerNotes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),

  // Waitlist conversion tracking
  waitlistEntryId: z.string().uuid().optional(),
});

export const createAppointmentSchema = createAppointmentBaseSchema
  .refine((data) => data.customerId || data.customerName, {
    message: 'Either customerId or customerName is required',
  })
  .refine(
    (data) => {
      // Walk-ins cannot be unassigned (assignLater)
      if (data.bookingType === 'walk_in' && data.assignLater) {
        return false;
      }
      return true;
    },
    { message: 'Walk-in appointments cannot be unassigned' }
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// =====================================================
// UPDATE APPOINTMENT
// =====================================================

export const updateAppointmentSchema = z.object({
  stylistId: z.string().uuid().optional(),
  customerNotes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// =====================================================
// RESCHEDULE APPOINTMENT
// =====================================================

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  newTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  stylistId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

// =====================================================
// CANCEL APPOINTMENT
// =====================================================

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500),
  isSalonCancelled: z.boolean().default(false),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// =====================================================
// CONFLICT ACTION
// =====================================================

export const conflictActionEnum = z.enum(['keep', 'cancel']);

export const conflictActionSchema = z.object({
  appointmentId: z.string().uuid(),
  action: conflictActionEnum,
});

export type ConflictAction = z.infer<typeof conflictActionSchema>;

export const createWithConflictsSchema = createAppointmentBaseSchema
  .extend({
    forceOverride: z.boolean().optional(),
    overrideReason: z.string().max(500).optional(),
    conflictActions: z.array(conflictActionSchema).optional(),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: 'Either customerId or customerName is required',
  })
  .refine(
    (data) => {
      // Walk-ins cannot be unassigned (assignLater)
      if (data.bookingType === 'walk_in' && data.assignLater) {
        return false;
      }
      return true;
    },
    { message: 'Walk-in appointments cannot be unassigned' }
  );

export type CreateWithConflictsInput = z.infer<typeof createWithConflictsSchema>;

// =====================================================
// AVAILABILITY QUERY
// =====================================================

export const getAvailableSlotsSchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  serviceIds: z.array(z.string().uuid()).min(1),
  stylistId: z.string().uuid().optional(),
  genderPreference: genderPreferenceEnum.optional(),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;

// =====================================================
// CALENDAR QUERY
// =====================================================

export const getCalendarSchema = z.object({
  branchId: z.string().uuid(),
  view: z.enum(['day', 'week', 'month']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  stylistId: z.string().uuid().optional(),
});

export type GetCalendarInput = z.infer<typeof getCalendarSchema>;

// =====================================================
// APPOINTMENT LIST QUERY
// =====================================================

// Helper to transform comma-separated string to array for query params
const commaSeparatedToArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.includes(',')) {
        return val.split(',').map((s) => s.trim());
      }
      return val;
    },
    z.union([schema, z.array(schema)])
  );

export const listAppointmentsSchema = z.object({
  branchId: z.string().uuid().optional(),
  stylistId: commaSeparatedToArray(z.string().uuid()).optional(),
  customerId: z.string().uuid().optional(),
  status: commaSeparatedToArray(appointmentStatusEnum).optional(),
  bookingType: commaSeparatedToArray(bookingTypeEnum).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Use z.input for the type so fields with defaults are optional in the input
export type ListAppointmentsInput = z.input<typeof listAppointmentsSchema>;

// =====================================================
// WALK-IN QUEUE
// =====================================================

export const addToQueueSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(2).max(255),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
    .optional(),
  serviceIds: z.array(z.string().uuid()).min(1),
  stylistPreferenceId: z.string().uuid().optional(),
  genderPreference: genderPreferenceEnum.optional(),
});

export type AddToQueueInput = z.infer<typeof addToQueueSchema>;

export const getQueueSchema = z.object({
  branchId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type GetQueueInput = z.infer<typeof getQueueSchema>;

// =====================================================
// STYLIST BREAK
// =====================================================

export const createStylistBreakSchema = z
  .object({
    name: z.string().min(2).max(100),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
  });

export type CreateStylistBreakInput = z.infer<typeof createStylistBreakSchema>;

// =====================================================
// STYLIST BLOCKED SLOT
// =====================================================

export const createBlockedSlotSchema = z
  .object({
    blockedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    isFullDay: z.boolean().default(false),
    reason: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.isFullDay) return true;
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    { message: 'End time must be after start time' }
  );

export type CreateBlockedSlotInput = z.infer<typeof createBlockedSlotSchema>;

// =====================================================
// STYLIST SCHEDULE QUERY
// =====================================================

export const getStylistScheduleSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export type GetStylistScheduleInput = z.infer<typeof getStylistScheduleSchema>;

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

// Note: Response schemas are intentionally flexible to allow controllers
// to return full objects without strict serialization.

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// =====================================================
// PARAM SCHEMAS
// =====================================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

export const stylistIdParamSchema = z.object({
  stylistId: z.string().uuid(),
});

export type StylistIdParam = z.infer<typeof stylistIdParamSchema>;

export const stylistBreakParamsSchema = z.object({
  stylistId: z.string().uuid(),
  breakId: z.string().uuid(),
});

export type StylistBreakParams = z.infer<typeof stylistBreakParamsSchema>;

export const stylistSlotParamsSchema = z.object({
  stylistId: z.string().uuid(),
  slotId: z.string().uuid(),
});

export type StylistSlotParams = z.infer<typeof stylistSlotParamsSchema>;

// =====================================================
// ADDITIONAL QUERY SCHEMAS
// =====================================================

export const getAvailableStylistsSchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  duration: z.coerce.number().int().min(1),
  genderPreference: genderPreferenceEnum.optional(),
});

export type GetAvailableStylistsInput = z.infer<typeof getAvailableStylistsSchema>;

export const serveQueueBodySchema = z.object({
  stylistId: z.string().uuid(),
});

export type ServeQueueBody = z.infer<typeof serveQueueBodySchema>;

// =====================================================
// UNASSIGNED APPOINTMENTS
// =====================================================

export const listUnassignedQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type ListUnassignedQueryInput = z.infer<typeof listUnassignedQuerySchema>;

export const assignStylistSchema = z.object({
  stylistId: z.string().uuid(),
});

export type AssignStylistInput = z.infer<typeof assignStylistSchema>;

// =====================================================
// STATION ASSIGNMENT (Floor View)
// =====================================================

export const assignStationSchema = z.object({
  stationId: z.string().uuid(),
});

export type AssignStationInput = z.infer<typeof assignStationSchema>;

// =====================================================
// ADD SERVICE MID-APPOINTMENT (Upsell)
// =====================================================

export const addServiceSchema = z.object({
  serviceId: z.string().uuid(),
  stylistId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
});

export type AddServiceInput = z.infer<typeof addServiceSchema>;

// =====================================================
// UPDATE STYLISTS (Multi-Stylist Support)
// =====================================================

export const updateStylistsSchema = z.object({
  primaryStylistId: z.string().uuid().optional(),
  assistantIds: z.array(z.string().uuid()).optional(),
});

export type UpdateStylistsInput = z.infer<typeof updateStylistsSchema>;
