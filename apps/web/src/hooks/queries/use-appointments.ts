/**
 * Appointment Hooks
 * React Query hooks for appointment management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import {
  resourceCalendarKeys,
  type ResourceCalendarData,
  type CalendarAppointment,
  type ResourceCalendarParams,
} from './use-resource-calendar';
import { floorViewKeys } from './use-stations';
import { customerKeys } from './use-customers';
import type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  CreateAppointmentResponse,
  RescheduleResponse,
  AvailableSlotsFilters,
  AvailableSlotsResponse,
  AvailableStylistsFilters,
  AvailableStylist,
  CalendarFilters,
  CalendarResponse,
  QueueFilters,
  QueueResponse,
  AddToQueueInput,
  AddToQueueResponse,
  WalkInQueueEntry,
  StylistScheduleFilters,
  StylistScheduleResponse,
  StylistBreak,
  StylistBlockedSlot,
  CreateStylistBreakInput,
  CreateBlockedSlotInput,
  StylistBusySlotsResponse,
} from '@/types/appointments';

// ============================================
// Query Keys
// ============================================

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: AppointmentFilters) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  calendar: (filters: CalendarFilters) => [...appointmentKeys.all, 'calendar', filters] as const,
};

export const availabilityKeys = {
  all: ['availability'] as const,
  slots: (filters: AvailableSlotsFilters) => [...availabilityKeys.all, 'slots', filters] as const,
  stylists: (filters: AvailableStylistsFilters) =>
    [...availabilityKeys.all, 'stylists', filters] as const,
};

export const queueKeys = {
  all: ['walkInQueue'] as const,
  list: (filters: QueueFilters) => [...queueKeys.all, 'list', filters] as const,
};

export const stylistScheduleKeys = {
  all: ['stylistSchedule'] as const,
  detail: (stylistId: string, filters: StylistScheduleFilters) =>
    [...stylistScheduleKeys.all, stylistId, filters] as const,
};

export const stylistBusySlotsKeys = {
  all: ['stylistBusySlots'] as const,
  detail: (stylistId: string, branchId: string, date: string) =>
    [...stylistBusySlotsKeys.all, stylistId, branchId, date] as const,
};

// ============================================
// Appointment CRUD Hooks
// ============================================

/**
 * Get appointments with pagination and filtering
 */
export function useAppointments(filters: AppointmentFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () =>
      api.getPaginated<Appointment>('/appointments', filters as Record<string, unknown>),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get single appointment by ID
 */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new appointment with optimistic calendar update
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      api.post<CreateAppointmentResponse>('/appointments', data),

    onMutate: async (newAppointment) => {
      // Show loading toast
      const toastId = toast.loading('Creating appointment...');

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Create optimistic appointment for calendar
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticCalendarAppointment: CalendarAppointment = {
        id: optimisticId,
        stylistId: newAppointment.stylistId || null,
        date: newAppointment.scheduledDate,
        startTime: newAppointment.scheduledTime,
        endTime: newAppointment.scheduledTime, // Will be calculated by server
        customerName: newAppointment.customerName || 'New Customer',
        customerPhone: newAppointment.customerPhone || null,
        services: [], // Will be populated by server
        status: 'booked',
        bookingType: newAppointment.bookingType,
        totalAmount: 0,
        hasConflict: false,
        conflictInfo: null,
        isOptimistic: true,
      };

      // Find and update matching calendar queries
      const calendarParams: ResourceCalendarParams = {
        branchId: newAppointment.branchId,
        date: newAppointment.scheduledDate,
        view: 'day',
      };

      // Snapshot previous calendar data
      const previousCalendarData = queryClient.getQueryData<ResourceCalendarData>(
        resourceCalendarKeys.list(calendarParams)
      );

      // Optimistically add to calendar
      if (previousCalendarData) {
        queryClient.setQueryData<ResourceCalendarData>(
          resourceCalendarKeys.list(calendarParams),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              appointments: [...old.appointments, optimisticCalendarAppointment],
            };
          }
        );
      }

      return { toastId, optimisticId, previousCalendarData, calendarParams };
    },

    onSuccess: (response, _newAppointment, context) => {
      // Update toast to success
      toast.success('Appointment created successfully!', { id: context?.toastId });

      // Transform server response to calendar appointment format
      const apt = response.appointment;
      const realCalendarAppointment: CalendarAppointment = {
        id: apt.id,
        stylistId: apt.stylistId || null,
        date: apt.scheduledDate,
        startTime: apt.scheduledTime,
        endTime: apt.scheduledEndTime,
        customerName: apt.customerName || apt.customer?.name || 'Customer',
        customerPhone: apt.customerPhone || apt.customer?.phone || null,
        services: apt.services?.map((s) => s.serviceName) || [],
        status: apt.status,
        bookingType: apt.bookingType,
        totalAmount: apt.totalAmount,
        hasConflict: apt.hasConflict || false,
        conflictInfo: null,
        isOptimistic: false,
      };

      // Replace optimistic appointment with real one in calendar
      if (context?.calendarParams) {
        queryClient.setQueryData<ResourceCalendarData>(
          resourceCalendarKeys.list(context.calendarParams),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              appointments: old.appointments.map((a) =>
                a.id === context.optimisticId ? realCalendarAppointment : a
              ),
            };
          }
        );
      }

      // Invalidate list queries to refresh in background
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      // Also invalidate calendar to ensure consistency (will refetch in background)
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });

      // If a new customer was created, invalidate customers list so it appears in Customers page
      if (response.customerCreated) {
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      }
    },

    onError: (_error, _newAppointment, context) => {
      // Update toast to error
      toast.error('Failed to create appointment', { id: context?.toastId });

      // Rollback calendar to previous state
      if (context?.previousCalendarData && context?.calendarParams) {
        queryClient.setQueryData(
          resourceCalendarKeys.list(context.calendarParams),
          context.previousCalendarData
        );
      }
    },
  });
}

/**
 * Update an appointment
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentInput }) =>
      api.patch<Appointment>(`/appointments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

/**
 * Update appointment services (replace all services)
 */
export function useUpdateAppointmentServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      services,
    }: {
      id: string;
      services: Array<{ serviceId: string; stylistId?: string; quantity?: number }>;
    }) => api.put<Appointment>(`/appointments/${id}/services`, { services }),

    onMutate: async () => {
      const toastId = toast.loading('Updating services...');
      return { toastId };
    },

    onSuccess: (_, { id }, context) => {
      toast.success('Services updated', { id: context?.toastId });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },

    onError: (_, __, context) => {
      toast.error('Failed to update services', { id: context?.toastId });
    },
  });
}

// ============================================
// Appointment Action Hooks
// ============================================

/**
 * Check in customer for appointment
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/check-in`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === id ? { ...apt, status: 'checked_in' } : apt
            ),
          };
        }
      );

      return { id };
    },

    onSuccess: (_, id) => {
      toast.success('Customer checked in');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },

    onError: () => {
      toast.error('Failed to check in');
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Start appointment service
 */
export function useStartAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/start`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === id ? { ...apt, status: 'in_progress' } : apt
            ),
          };
        }
      );

      return { id };
    },

    onSuccess: (_, id) => {
      toast.success('Appointment started');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      // Also invalidate floor view since station status may have changed
      queryClient.invalidateQueries({ queryKey: floorViewKeys.all });
    },

    onError: () => {
      toast.error('Failed to start appointment');
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Complete appointment
 */
export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      actualEndTime,
      completionDate,
      completionTime,
    }: {
      appointmentId: string;
      actualEndTime?: string;
      completionDate?: string;
      completionTime?: string;
    }) => {
      // Build the request body
      const body: Record<string, any> = {};

      if (actualEndTime) {
        body.actualEndTime = actualEndTime;
      } else if (completionDate && completionTime) {
        // Combine date and time into ISO string
        body.actualEndTime = `${completionDate}T${completionTime}:00`;
      }

      return api.post<Appointment>(`/appointments/${appointmentId}/complete`, body);
    },

    onMutate: async ({ appointmentId }) => {
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === appointmentId ? { ...apt, status: 'completed' } : apt
            ),
          };
        }
      );

      return { appointmentId };
    },

    onSuccess: (_, { appointmentId }) => {
      toast.success('Appointment completed');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      // Also invalidate floor view since station is now free
      queryClient.invalidateQueries({ queryKey: floorViewKeys.all });
    },

    onError: () => {
      toast.error('Failed to complete appointment');
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Cancel appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelAppointmentInput }) =>
      api.post<Appointment>(`/appointments/${id}/cancel`, data),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === id ? { ...apt, status: 'cancelled' } : apt
            ),
          };
        }
      );

      return { id };
    },

    onSuccess: (_, { id }) => {
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },

    onError: () => {
      toast.error('Failed to cancel appointment');
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Mark appointment as no-show
 */
export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/appointments/${id}/no-show`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === id ? { ...apt, status: 'no_show' } : apt
            ),
          };
        }
      );

      return { id };
    },

    onSuccess: (_, id) => {
      toast.success('Marked as no-show');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },

    onError: () => {
      toast.error('Failed to mark as no-show');
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Update appointment status (generic status change)
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Appointment>(`/appointments/${id}/status`, { status }),

    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Optimistically update status in all calendar caches
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt) => (apt.id === id ? { ...apt, status } : apt)),
          };
        }
      );

      return { id, status };
    },

    onSuccess: (_, { id, status }) => {
      const statusLabels: Record<string, string> = {
        confirmed: 'Appointment confirmed',
        checked_in: 'Customer checked in',
        in_progress: 'Appointment started',
        completed: 'Appointment completed',
        cancelled: 'Appointment cancelled',
        no_show: 'Marked as no-show',
      };
      toast.success(statusLabels[status] || 'Status updated');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      // Also invalidate floor view since station assignments may have changed
      queryClient.invalidateQueries({ queryKey: floorViewKeys.all });
    },

    onError: () => {
      toast.error('Failed to update status');
      // Refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
    },
  });
}

/**
 * Reschedule appointment
 */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RescheduleAppointmentInput }) =>
      api.post<RescheduleResponse>(`/appointments/${id}/reschedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// ============================================
// Availability Hooks
// ============================================

/**
 * Get available time slots for a date
 */
export function useAvailableSlots(filters: AvailableSlotsFilters) {
  return useQuery({
    queryKey: availabilityKeys.slots(filters),
    queryFn: () =>
      api.get<AvailableSlotsResponse>('/appointments/availability/slots', {
        branchId: filters.branchId,
        date: filters.date,
        serviceIds: filters.serviceIds.join(','),
        stylistId: filters.stylistId,
        genderPreference: filters.genderPreference,
      }),
    enabled: !!filters.branchId && !!filters.date && filters.serviceIds.length > 0,
  });
}

/**
 * Get available stylists for a time slot
 */
export function useAvailableStylists(filters: AvailableStylistsFilters) {
  return useQuery({
    queryKey: availabilityKeys.stylists(filters),
    queryFn: () =>
      api.get<AvailableStylist[]>('/appointments/availability/stylists', {
        branchId: filters.branchId,
        date: filters.date,
        time: filters.time,
        duration: filters.duration,
        genderPreference: filters.genderPreference,
      }),
    enabled: !!filters.branchId && !!filters.date && !!filters.time && !!filters.duration,
  });
}

// ============================================
// Calendar Hooks
// ============================================

/**
 * Get calendar view
 */
export function useCalendar(filters: CalendarFilters) {
  return useQuery({
    queryKey: appointmentKeys.calendar(filters),
    queryFn: () =>
      api.get<CalendarResponse>('/appointments/calendar', {
        branchId: filters.branchId,
        view: filters.view,
        date: filters.date,
        stylistId: filters.stylistId,
      }),
    enabled: !!filters.branchId && !!filters.date,
  });
}

// ============================================
// Walk-in Queue Hooks
// ============================================

/**
 * Get walk-in queue
 */
export function useWalkInQueue(filters: QueueFilters) {
  return useQuery({
    queryKey: queueKeys.list(filters),
    queryFn: () =>
      api.get<QueueResponse>('/appointments/walk-in/queue', {
        branchId: filters.branchId,
        date: filters.date,
      }),
    enabled: !!filters.branchId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Add customer to walk-in queue
 */
export function useAddToQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToQueueInput) =>
      api.post<AddToQueueResponse>('/appointments/walk-in/queue', data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: queueKeys.list({ branchId: data.branchId }),
      });
    },
  });
}

/**
 * Call customer from queue
 */
export function useCallCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/call`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Start serving customer from queue
 */
export function useStartServing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stylistId }: { id: string; stylistId: string }) =>
      api.patch<{ queueEntry: WalkInQueueEntry; appointment: Appointment }>(
        `/appointments/walk-in/queue/${id}/serve`,
        { stylistId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

/**
 * Mark queue entry as complete
 */
export function useCompleteQueueEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Mark customer as left from queue
 */
export function useMarkLeft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<WalkInQueueEntry>(`/appointments/walk-in/queue/${id}/left`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

// ============================================
// Stylist Schedule Hooks
// ============================================

/**
 * Get stylist schedule
 */
export function useStylistSchedule(stylistId: string, filters: StylistScheduleFilters) {
  return useQuery({
    queryKey: stylistScheduleKeys.detail(stylistId, filters),
    queryFn: () =>
      api.get<StylistScheduleResponse>(`/appointments/stylists/${stylistId}/schedule`, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    enabled: !!stylistId && !!filters.dateFrom && !!filters.dateTo,
  });
}

/**
 * Create stylist break
 */
export function useCreateBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, data }: { stylistId: string; data: CreateStylistBreakInput }) =>
      api.post<StylistBreak>(`/appointments/stylists/${stylistId}/breaks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Delete stylist break
 */
export function useDeleteBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, breakId }: { stylistId: string; breakId: string }) =>
      api.delete<{ message: string }>(`/appointments/stylists/${stylistId}/breaks/${breakId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Create blocked slot
 */
export function useCreateBlockedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, data }: { stylistId: string; data: CreateBlockedSlotInput }) =>
      api.post<StylistBlockedSlot>(`/appointments/stylists/${stylistId}/blocked-slots`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/**
 * Delete blocked slot
 */
export function useDeleteBlockedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stylistId, slotId }: { stylistId: string; slotId: string }) =>
      api.delete<{ message: string }>(
        `/appointments/stylists/${stylistId}/blocked-slots/${slotId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stylistScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

// ============================================
// Stylist Busy Slots Hook
// ============================================

/**
 * Get stylist busy slots for a specific date
 * Returns all time ranges where the stylist is unavailable
 */
export function useStylistBusySlots(
  stylistId: string | undefined,
  branchId: string | undefined,
  date: string | undefined
) {
  return useQuery({
    queryKey: stylistBusySlotsKeys.detail(stylistId || '', branchId || '', date || ''),
    queryFn: () =>
      api.get<StylistBusySlotsResponse>(`/appointments/stylists/${stylistId}/busy-slots`, {
        branchId,
        date,
      }),
    enabled: !!stylistId && !!branchId && !!date,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// ============================================
// Unassigned Appointments Hooks
// ============================================

export const unassignedKeys = {
  all: ['unassignedAppointments'] as const,
  list: (branchId: string, date?: string) =>
    [...unassignedKeys.all, 'list', branchId, date] as const,
  count: (branchId: string) => [...unassignedKeys.all, 'count', branchId] as const,
};

/**
 * Get unassigned appointments for a branch
 */
export function useUnassignedAppointments(branchId: string, date?: string) {
  return useQuery({
    queryKey: unassignedKeys.list(branchId, date),
    queryFn: () =>
      api.get<Appointment[]>('/appointments/unassigned', {
        branchId,
        date,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get count of unassigned appointments for today
 */
export function useUnassignedCount(branchId: string) {
  return useQuery({
    queryKey: unassignedKeys.count(branchId),
    queryFn: () => api.get<{ count: number }>('/appointments/unassigned/count', { branchId }),
    enabled: !!branchId,
  });
}

/**
 * Assign stylist to an unassigned appointment
 */
export function useAssignStylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stylistId }: { id: string; stylistId: string }) =>
      api.post<Appointment>(`/appointments/${id}/assign`, { stylistId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: unassignedKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
