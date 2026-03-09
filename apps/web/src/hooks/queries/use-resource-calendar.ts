/**
 * Resource Calendar Hook
 * TanStack Query hook for fetching resource calendar data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

// =====================================================
// TYPES
// =====================================================

export interface CalendarStylist {
  id: string;
  name: string;
  avatar: string | null;
  color: string;
  isAvailable: boolean;
  workingHours: { start: string; end: string } | null;
  breaks: Array<{
    id: string;
    start: string;
    end: string;
    name: string;
  }>;
  blockedSlots: Array<{
    id: string;
    start: string;
    end: string;
    reason: string | null;
    isFullDay: boolean;
  }>;
}

export interface ConflictInfo {
  conflictingAppointmentIds: string[];
  overlapMinutes: number;
  severity: 'warning' | 'severe';
}

export interface CalendarAppointment {
  id: string;
  stylistId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string | null;
  services: string[];
  status: string;
  bookingType: string;
  totalAmount: number;
  hasConflict: boolean;
  conflictInfo: ConflictInfo | null;
  /** Flag for optimistic updates - appointment is being created */
  isOptimistic?: boolean;
}

export interface ResourceCalendarData {
  date: string;
  view: 'day' | 'week';
  stylists: CalendarStylist[];
  appointments: CalendarAppointment[];
  workingHours: { start: string; end: string };
}

export interface ResourceCalendarParams {
  branchId: string;
  date: string;
  view?: 'day' | 'week';
}

export interface MoveAppointmentParams {
  appointmentId: string;
  newStylistId?: string;
  newDate: string;
  newTime: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const resourceCalendarKeys = {
  all: ['resource-calendar'] as const,
  list: (params: ResourceCalendarParams) => [...resourceCalendarKeys.all, params] as const,
};

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch resource calendar data
 */
export function useResourceCalendar(
  params: ResourceCalendarParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: resourceCalendarKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        branchId: params.branchId,
        date: params.date,
        view: params.view || 'day',
      });
      // api.get already extracts the data from { success, data } response
      return api.get<ResourceCalendarData>(`/calendar/resources?${searchParams.toString()}`);
    },
    enabled: (options?.enabled ?? true) && !!params.branchId && !!params.date,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Move appointment (drag-drop) with optimistic update
 */
export function useMoveAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MoveAppointmentParams) => {
      const { appointmentId, ...body } = params;
      return api.patch<unknown>(`/calendar/appointments/${appointmentId}/move`, body);
    },

    onMutate: async (params) => {
      const { appointmentId, newStylistId, newDate, newTime } = params;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: resourceCalendarKeys.all });

      // Snapshot all calendar data for potential rollback
      const previousData = new Map<string, ResourceCalendarData>();

      // Update all matching calendar queries optimistically
      queryClient.setQueriesData<ResourceCalendarData>(
        { queryKey: resourceCalendarKeys.all },
        (old) => {
          if (!old) return old;

          // Store snapshot
          previousData.set(
            JSON.stringify(resourceCalendarKeys.list({ branchId: '', date: old.date })),
            old
          );

          return {
            ...old,
            appointments: old.appointments.map((apt) =>
              apt.id === appointmentId
                ? {
                    ...apt,
                    stylistId: newStylistId ?? apt.stylistId,
                    date: newDate,
                    startTime: newTime,
                    // Note: endTime will be recalculated by server
                  }
                : apt
            ),
          };
        }
      );

      return { previousData };
    },

    onSuccess: () => {
      // Invalidate to get fresh data with correct endTime
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment moved successfully');
    },

    onError: (
      error: Error & { response?: { data?: { error?: { message?: string } } } },
      _,
      context
    ) => {
      // Rollback all calendar caches
      if (context?.previousData) {
        context.previousData.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }

      const message = error?.response?.data?.error?.message || 'Failed to move appointment';
      toast.error(message);
    },
  });
}
