/**
 * Stations Hooks
 * React Query hooks for station management and floor view
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { appointmentKeys } from '@/hooks/queries/use-appointments';
import { resourceCalendarKeys } from '@/hooks/queries/use-resource-calendar';
import type {
  BulkCreateStationsInput,
  CreateStationInput,
  CreateStationTypeInput,
  FloorViewResponse,
  Station,
  StationFilters,
  StationType,
  UpdateStationInput,
  UpdateStationTypeInput,
} from '@/types/stations';

// ============================================
// Query Keys
// ============================================

export const stationTypeKeys = {
  all: ['station-types'] as const,
  lists: () => [...stationTypeKeys.all, 'list'] as const,
  list: () => [...stationTypeKeys.lists()] as const,
  details: () => [...stationTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...stationTypeKeys.details(), id] as const,
};

export const stationKeys = {
  all: ['stations'] as const,
  lists: () => [...stationKeys.all, 'list'] as const,
  list: (branchId: string, filters?: StationFilters) =>
    [...stationKeys.lists(), branchId, filters] as const,
  details: () => [...stationKeys.all, 'detail'] as const,
  detail: (id: string) => [...stationKeys.details(), id] as const,
};

export const floorViewKeys = {
  all: ['floor-view'] as const,
  branch: (branchId: string) => [...floorViewKeys.all, branchId] as const,
};

// ============================================
// Station Type Hooks
// ============================================

/**
 * Get all station types for tenant
 */
export function useStationTypes(branchId?: string) {
  return useQuery({
    queryKey: [...stationTypeKeys.list(), branchId] as const,
    queryFn: () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      return api.get<StationType[]>(`/station-types${params}`);
    },
  });
}

/**
 * Get single station type by ID
 */
export function useStationType(id: string) {
  return useQuery({
    queryKey: stationTypeKeys.detail(id),
    queryFn: () => api.get<StationType>(`/station-types/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new station type
 */
export function useCreateStationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStationTypeInput) => api.post<StationType>('/station-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationTypeKeys.lists() });
    },
  });
}

/**
 * Update a station type
 */
export function useUpdateStationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStationTypeInput }) =>
      api.patch<StationType>(`/station-types/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: stationTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stationTypeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: floorViewKeys.all });
    },
  });
}

/**
 * Delete a station type
 */
export function useDeleteStationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/station-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationTypeKeys.lists() });
    },
  });
}

// ============================================
// Station Hooks
// ============================================

/**
 * Get stations for a branch with optional filters
 */
export function useStations(branchId: string, filters: StationFilters = {}) {
  return useQuery({
    queryKey: stationKeys.list(branchId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.stationTypeId) params.set('stationTypeId', filters.stationTypeId);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const queryString = params.toString();
      const url = `/branches/${branchId}/stations${queryString ? `?${queryString}` : ''}`;
      const stations = await api.get<Station[]>(url);

      // Return in paginated format for consistency
      return {
        data: stations,
        meta: {
          page: 1,
          limit: stations.length,
          total: stations.length,
          totalPages: 1,
        },
      };
    },
    enabled: !!branchId,
  });
}

/**
 * Get single station by ID
 */
export function useStation(id: string) {
  return useQuery({
    queryKey: stationKeys.detail(id),
    queryFn: () => api.get<Station>(`/stations/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new station
 */
export function useCreateStation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStationInput) =>
      api.post<Station>(`/branches/${branchId}/stations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
    },
  });
}

/**
 * Bulk create stations
 */
export function useBulkCreateStations(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateStationsInput) =>
      api.post<Station[]>(`/branches/${branchId}/stations/bulk`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
    },
  });
}

/**
 * Update a station
 */
export function useUpdateStation(branchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStationInput }) =>
      api.patch<Station>(`/stations/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(id) });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
      }
    },
  });
}

/**
 * Delete a station
 */
export function useDeleteStation(branchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/stations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
      }
    },
  });
}

// ============================================
// Floor View Hooks
// ============================================

/**
 * Get floor view data for a branch
 */
export function useFloorView(branchId: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: floorViewKeys.branch(branchId),
    queryFn: () => api.get<FloorViewResponse>(`/branches/${branchId}/floor-view`),
    enabled: !!branchId,
    refetchInterval: options?.refetchInterval,
  });
}

// ============================================
// Appointment Extension Hooks
// ============================================

/**
 * Assign station to appointment
 */
export function useAssignStation(branchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, stationId }: { appointmentId: string; stationId: string }) =>
      api.patch(`/appointments/${appointmentId}/station`, { stationId }),
    onSuccess: (_, { appointmentId }) => {
      // Invalidate appointment queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      // Invalidate calendar queries to update the calendar view
      queryClient.invalidateQueries({ queryKey: resourceCalendarKeys.all });
      // Always invalidate all floor view queries to ensure sync
      queryClient.invalidateQueries({ queryKey: floorViewKeys.all });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
      }
    },
  });
}

/**
 * Add service to appointment (upsell)
 */
export function useAddAppointmentService(branchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      serviceId,
      stylistId,
      quantity,
    }: {
      appointmentId: string;
      serviceId: string;
      stylistId?: string;
      quantity?: number;
    }) =>
      api.post(`/appointments/${appointmentId}/services`, {
        serviceId,
        stylistId,
        quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
      }
    },
  });
}

/**
 * Update stylists for appointment
 */
export function useUpdateAppointmentStylists(branchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      primaryStylistId,
      assistantIds,
    }: {
      appointmentId: string;
      primaryStylistId?: string;
      assistantIds?: string[];
    }) =>
      api.patch(`/appointments/${appointmentId}/stylists`, {
        primaryStylistId,
        assistantIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: floorViewKeys.branch(branchId) });
      }
    },
  });
}
