/**
 * Services Hooks
 * React Query hooks for service management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  CreateServiceInput,
  Service,
  ServiceCatalog,
  ServiceFilters,
  UpdateServiceInput,
} from '@/types/services';

// Query keys
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: ServiceFilters) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
  catalog: (branchId?: string) => [...serviceKeys.all, 'catalog', branchId] as const,
};

/**
 * Get services with pagination
 */
export function useServices(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () =>
      api.getPaginated<Service>('/services', {
        page: filters.page,
        limit: filters.limit,
        categoryId: filters.categoryId,
        search: filters.search,
        isActive: filters.isActive,
        genderApplicable: filters.genderApplicable,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single service by ID
 */
export function useService(id: string) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => api.get<Service>(`/services/${id}`),
    enabled: !!id,
  });
}

/**
 * Get service catalog (hierarchical view)
 */
export function useServiceCatalog(branchId?: string, includeInactive = false) {
  return useQuery({
    queryKey: serviceKeys.catalog(branchId),
    queryFn: () =>
      api.get<ServiceCatalog[]>('/services/catalog', {
        branchId,
        includeInactive,
      }),
  });
}

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceInput) => api.post<Service>('/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}

/**
 * Update a service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceInput }) =>
      api.patch<Service>(`/services/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}

/**
 * Delete a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.catalog() });
    },
  });
}
