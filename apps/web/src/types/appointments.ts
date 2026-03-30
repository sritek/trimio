/**
 * Appointment Module Types
 */

// ============================================
// Enums
// ============================================

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type BookingType = 'online' | 'phone' | 'walk_in';

export type GenderPreference = 'male' | 'female' | 'any';

export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'left';

// ============================================
// Appointment Types
// ============================================

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  scheduledDate: string;
  scheduledTime: string;
  scheduledEndTime: string;
  totalDuration: number;
  stylistId?: string | null;
  stylistGenderPreference?: GenderPreference | null;
  bookingType: BookingType;
  bookingSource?: string | null;
  status: AppointmentStatus;
  tokenNumber?: number | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  priceLockedAt: string;
  prepaymentRequired: boolean;
  prepaymentAmount: number;
  prepaymentStatus?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  rescheduleCount: number;
  originalAppointmentId?: string | null;
  rescheduledToId?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  isSalonCancelled: boolean;
  // Station assignment
  stationId?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  // Conflict tracking
  hasConflict: boolean;
  conflictNotes?: string | null;
  conflictMarkedAt?: string | null;
  conflictResolvedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // Relations
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    gender?: string | null;
    loyaltyPoints?: number;
    walletBalance?: number;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  stylist?: {
    id: string;
    name: string;
  } | null;
  station?: {
    id: string;
    name: string;
    stationType?: {
      id: string;
      name: string;
      color?: string | null;
    } | null;
  } | null;
  services?: AppointmentService[];
  statusHistory?: AppointmentStatusHistory[];
}

export interface AppointmentService {
  id: string;
  tenantId: string;
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  serviceSku: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes: number;
  stylistId?: string | null;
  status: ServiceStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  commissionRate: number;
  commissionAmount: number;
  service?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface AppointmentStatusHistory {
  id: string;
  tenantId: string;
  appointmentId: string;
  fromStatus?: string | null;
  toStatus: string;
  changedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

// ============================================
// Input Types
// ============================================

export interface CreateAppointmentInput {
  branchId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  scheduledDate: string;
  scheduledTime: string;
  services: {
    serviceId: string;
    stylistId?: string;
    quantity?: number;
  }[];
  stylistId?: string;
  stylistGenderPreference?: GenderPreference;
  bookingType: BookingType;
  bookingSource?: string;
  customerNotes?: string;
  internalNotes?: string;
  assignLater?: boolean;
  waitlistEntryId?: string;
}

export interface UpdateAppointmentInput {
  stylistId?: string;
  customerNotes?: string;
  internalNotes?: string;
}

export interface RescheduleAppointmentInput {
  newDate: string;
  newTime: string;
  stylistId?: string;
  reason?: string;
}

export interface CancelAppointmentInput {
  reason: string;
  isSalonCancelled?: boolean;
}

// ============================================
// Conflict Types
// ============================================

export type ConflictActionType = 'keep' | 'cancel';

export interface ConflictAction {
  appointmentId: string;
  action: ConflictActionType;
}

export interface ConflictingAppointment {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  scheduledTime: string;
  scheduledEndTime: string;
  status: string;
  services: string[];
}

// ============================================
// Filter Types
// ============================================

export interface AppointmentFilters {
  branchId?: string;
  stylistId?: string | string[];
  customerId?: string;
  status?: AppointmentStatus | AppointmentStatus[];
  bookingType?: BookingType | BookingType[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AvailableSlotsFilters {
  branchId: string;
  date: string;
  serviceIds: string[];
  stylistId?: string;
  genderPreference?: GenderPreference;
}

export interface AvailableStylistsFilters {
  branchId: string;
  date: string;
  time: string;
  duration: number;
  genderPreference?: string;
}

export interface CalendarFilters {
  branchId: string;
  view: 'day' | 'week' | 'month';
  date: string;
  stylistId?: string;
}

// ============================================
// Response Types
// ============================================

export interface TimeSlot {
  time: string;
  available: boolean;
  stylistId?: string;
  stylistName?: string;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: TimeSlot[];
  nextAvailableDate?: string;
}

export interface AvailableStylist {
  id: string;
  name: string;
  gender: string | null;
  isAvailable: boolean;
}

export interface CalendarAppointment {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledEndTime: string;
  customerName: string;
  customerPhone?: string | null;
  stylistId?: string | null;
  services: string[];
  status: AppointmentStatus;
  bookingType: BookingType;
  totalAmount: number;
  tokenNumber?: number | null;
  hasConflict?: boolean;
}

export interface CalendarResponse {
  view: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  appointments: CalendarAppointment[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export interface CreateAppointmentResponse {
  appointment: Appointment;
  tokenNumber?: number;
  prepaymentRequired: boolean;
  prepaymentAmount?: number;
  customerCreated?: boolean;
}

export interface RescheduleResponse {
  originalAppointment: Appointment;
  newAppointment: Appointment;
  rescheduleCount: number;
}

// ============================================
// Walk-in Queue Types
// ============================================

export interface WalkInQueueEntry {
  id: string;
  tenantId: string;
  branchId: string;
  queueDate: string;
  tokenNumber: number;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  serviceIds: string[];
  stylistPreferenceId?: string | null;
  genderPreference?: GenderPreference | null;
  status: QueueStatus;
  position: number;
  estimatedWaitMinutes: number;
  calledAt?: string | null;
  appointmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddToQueueInput {
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  stylistPreferenceId?: string;
  genderPreference?: GenderPreference;
}

export interface QueueFilters {
  branchId: string;
  date?: string;
}

export interface QueueStats {
  waiting: number;
  serving: number;
  completed: number;
  left: number;
  averageWaitTime: number;
}

export interface QueueResponse {
  branchId: string;
  date: string;
  queue: WalkInQueueEntry[];
  stats: QueueStats;
  currentlyServing: {
    tokenNumber: number;
    stylistId?: string | null;
  }[];
}

export interface AddToQueueResponse {
  queueEntry: WalkInQueueEntry;
  tokenNumber: number;
  position: number;
  estimatedWaitMinutes: number;
}

// ============================================
// Stylist Schedule Types
// ============================================

export interface StylistBreak {
  id: string;
  tenantId: string;
  branchId: string;
  stylistId: string;
  name: string;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StylistBlockedSlot {
  id: string;
  tenantId: string;
  branchId: string;
  stylistId: string;
  blockedDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isFullDay: boolean;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStylistBreakInput {
  name: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
}

export interface CreateBlockedSlotInput {
  blockedDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay?: boolean;
  reason?: string;
}

export interface StylistScheduleFilters {
  dateFrom: string;
  dateTo: string;
}

export interface StylistScheduleResponse {
  stylist: {
    id: string;
    name: string;
    gender: string | null;
  };
  dateFrom: string;
  dateTo: string;
  breaks: StylistBreak[];
  blockedSlots: StylistBlockedSlot[];
  appointments: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    endTime: string;
    customerName: string;
    services: string[];
    status: string;
  }[];
}

// ============================================
// Stylist Busy Slots Types
// ============================================

export interface BusySlot {
  startTime: string;
  endTime: string;
  type: 'appointment' | 'break' | 'blocked';
  label?: string;
}

export interface StylistBusySlotsFilters {
  branchId: string;
  date: string;
}

export interface StylistBusySlotsResponse {
  date: string;
  stylistId: string;
  busySlots: BusySlot[];
}
