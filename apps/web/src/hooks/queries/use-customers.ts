/**
 * Customer Hooks
 * React Query hooks for customer management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  Customer,
  CustomerFilters,
  CustomerSearchFilters,
  CreateCustomerInput,
  UpdateCustomerInput,
  UpdateCustomerPhoneInput,
  CustomerNote,
  NotesFilters,
  CreateNoteInput,
  CustomTag,
  CreateTagInput,
  AddTagsInput,
  LoyaltyConfig,
  UpdateLoyaltyConfigInput,
  LoyaltyBalanceResponse,
  AdjustLoyaltyInput,
  AdjustLoyaltyResponse,
  WalletBalanceResponse,
  AdjustWalletInput,
  AdjustWalletResponse,
  CustomerStats,
  LoyaltyFilters,
  WalletFilters,
} from '@/types/customers';

// ============================================
// Query Keys
// ============================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  search: (filters: CustomerSearchFilters) => [...customerKeys.all, 'search', filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  notes: (customerId: string, filters?: NotesFilters) =>
    [...customerKeys.detail(customerId), 'notes', filters] as const,
  stats: (customerId: string) => [...customerKeys.detail(customerId), 'stats'] as const,
  loyalty: (customerId: string, filters?: LoyaltyFilters) =>
    [...customerKeys.detail(customerId), 'loyalty', filters] as const,
  wallet: (customerId: string, filters?: WalletFilters) =>
    [...customerKeys.detail(customerId), 'wallet', filters] as const,
};

export const tagKeys = {
  all: ['tags'] as const,
  list: () => [...tagKeys.all, 'list'] as const,
};

export const loyaltyConfigKeys = {
  all: ['loyaltyConfig'] as const,
  detail: () => [...loyaltyConfigKeys.all, 'detail'] as const,
};

// ============================================
// Customer CRUD Hooks
// ============================================

/**
 * Get customers with pagination and filtering
 */
export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () =>
      api.getPaginated<Customer>('/customers', {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        tags: filters.tags,
        gender: filters.gender,
        bookingStatus: filters.bookingStatus,
        branchId: filters.branchId,
        isActive: filters.isActive,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * @deprecated Use useCustomers instead - it now returns paginated results
 */
export function useCustomersPaginated(filters: CustomerFilters = {}) {
  return useCustomers(filters);
}

/**
 * Search customers (quick lookup for autocomplete)
 */
export function useCustomerSearch(filters: CustomerSearchFilters) {
  return useQuery({
    queryKey: customerKeys.search(filters),
    queryFn: () =>
      api.get<Customer[]>('/customers/search', {
        q: filters.q,
        limit: filters.limit,
      }),
    enabled: filters.q.length >= 2,
  });
}

/**
 * Get single customer by ID
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

/**
 * Lookup customer by exact phone number
 * Returns customer basic info if found, null otherwise
 */
export function useCustomerPhoneLookup(phone: string) {
  // Only lookup if phone is a valid 10-digit number
  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  return useQuery({
    queryKey: [...customerKeys.all, 'phone-lookup', phone],
    queryFn: () =>
      api.get<{ id: string; name: string; phone: string } | null>('/customers/phone-lookup', {
        phone,
      }),
    enabled: isValidPhone,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) => api.post<Customer>('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      api.patch<Customer>(`/customers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

/**
 * Update customer phone number (manager only)
 */
export function useUpdateCustomerPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerPhoneInput }) =>
      api.patch<Customer>(`/customers/${id}/phone`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

/**
 * Delete (deactivate) a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Reactivate a customer
 */
export function useReactivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Customer>(`/customers/${id}/reactivate`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

// ============================================
// Customer Notes Hooks
// ============================================

/**
 * Get customer notes with pagination
 */
export function useCustomerNotes(customerId: string, filters: NotesFilters = {}) {
  return useQuery({
    queryKey: customerKeys.notes(customerId, filters),
    queryFn: () =>
      api.getPaginated<CustomerNote>(`/customers/${customerId}/notes`, {
        page: filters.page,
        limit: filters.limit,
      }),
    enabled: !!customerId,
  });
}

/**
 * Add a note to customer
 */
export function useAddCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: CreateNoteInput }) =>
      api.post<CustomerNote>(`/customers/${customerId}/notes`, data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notes(customerId) });
    },
  });
}

// ============================================
// Customer Stats Hooks
// ============================================

/**
 * Get customer statistics
 */
export function useCustomerStats(customerId: string) {
  return useQuery({
    queryKey: customerKeys.stats(customerId),
    queryFn: () => api.get<CustomerStats>(`/customers/${customerId}/stats`),
    enabled: !!customerId,
  });
}

/**
 * Get customer appointments
 */
export function useCustomerAppointments(
  customerId: string,
  filters: { page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: [...customerKeys.detail(customerId), 'appointments', filters],
    queryFn: () =>
      api.getPaginated<unknown>(`/customers/${customerId}/appointments`, {
        page: filters.page || 1,
        limit: filters.limit || 10,
      }),
    enabled: !!customerId,
  });
}

/**
 * Get customer invoices
 */
export function useCustomerInvoices(
  customerId: string,
  filters: { page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: [...customerKeys.detail(customerId), 'invoices', filters],
    queryFn: () =>
      api.getPaginated<unknown>(`/customers/${customerId}/invoices`, {
        page: filters.page || 1,
        limit: filters.limit || 10,
      }),
    enabled: !!customerId,
  });
}

// ============================================
// Tags Hooks
// ============================================

/**
 * Get all custom tags
 */
export function useCustomTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: () => api.get<CustomTag[]>('/tags'),
  });
}

/**
 * Create a custom tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagInput) => api.post<CustomTag>('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list() });
    },
  });
}

/**
 * Delete a custom tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list() });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Add tags to a customer
 */
export function useAddCustomerTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: AddTagsInput }) =>
      api.post<Customer>(`/customers/${customerId}/tags`, data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Remove a tag from a customer
 */
export function useRemoveCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, tag }: { customerId: string; tag: string }) =>
      api.delete<Customer>(`/customers/${customerId}/tags/${encodeURIComponent(tag)}`),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ============================================
// Loyalty Hooks
// ============================================

/**
 * Get loyalty configuration
 */
export function useLoyaltyConfig() {
  return useQuery({
    queryKey: loyaltyConfigKeys.detail(),
    queryFn: () => api.get<LoyaltyConfig>('/loyalty/config'),
  });
}

/**
 * Update loyalty configuration
 */
export function useUpdateLoyaltyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateLoyaltyConfigInput) =>
      api.patch<LoyaltyConfig>('/loyalty/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyConfigKeys.detail() });
    },
  });
}

/**
 * Get customer loyalty balance and history
 */
export function useCustomerLoyalty(customerId: string, filters: LoyaltyFilters = {}) {
  return useQuery({
    queryKey: customerKeys.loyalty(customerId, filters),
    queryFn: () =>
      api.get<LoyaltyBalanceResponse>(`/customers/${customerId}/loyalty`, {
        page: filters.page,
        limit: filters.limit,
      }),
    enabled: !!customerId,
  });
}

/**
 * Adjust customer loyalty points (manager only)
 */
export function useAdjustLoyalty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: AdjustLoyaltyInput }) =>
      api.post<AdjustLoyaltyResponse>(`/customers/${customerId}/loyalty/adjust`, data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.loyalty(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ============================================
// Wallet Hooks
// ============================================

/**
 * Get customer wallet balance and history
 */
export function useCustomerWallet(customerId: string, filters: WalletFilters = {}) {
  return useQuery({
    queryKey: customerKeys.wallet(customerId, filters),
    queryFn: () =>
      api.get<WalletBalanceResponse>(`/customers/${customerId}/wallet`, {
        page: filters.page,
        limit: filters.limit,
      }),
    enabled: !!customerId,
  });
}

/**
 * Adjust customer wallet balance (manager only)
 */
export function useAdjustWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: AdjustWalletInput }) =>
      api.post<AdjustWalletResponse>(`/customers/${customerId}/wallet/adjust`, data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.wallet(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
