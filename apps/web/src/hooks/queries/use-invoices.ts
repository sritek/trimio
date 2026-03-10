/**
 * Invoice Query Hooks
 * TanStack Query hooks for invoice management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  Invoice,
  CreateInvoiceInput,
  QuickBillInput,
  PaymentInput,
  InvoiceItemInput,
  ListInvoicesQuery,
} from '@/types/billing';

// ============================================
// Query Keys
// ============================================

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: ListInvoicesQuery) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// ============================================
// List Invoices
// ============================================

export function useInvoices(filters: ListInvoicesQuery = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      return api.getPaginated<Invoice>(`/invoices?${params.toString()}`);
    },
  });
}

// ============================================
// Get Single Invoice
// ============================================

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });
}

// ============================================
// Create Invoice (Draft)
// ============================================

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post<Invoice>('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Update Invoice
// ============================================

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceInput> }) =>
      api.patch<Invoice>(`/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Delete Invoice
// ============================================

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Add Item to Invoice
// ============================================

export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, item }: { invoiceId: string; item: InvoiceItemInput }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/items`, item),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
  });
}

// ============================================
// Remove Item from Invoice
// ============================================

export function useRemoveInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: string; itemId: string }) =>
      api.delete(`/invoices/${invoiceId}/items/${itemId}`),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
  });
}

// ============================================
// Add Payment
// ============================================

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, payments }: { invoiceId: string; payments: PaymentInput[] }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/payments`, { payments }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Finalize Invoice
// ============================================

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, payments }: { invoiceId: string; payments?: PaymentInput[] }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/finalize`, { payments }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Cancel Invoice
// ============================================

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      api.post<Invoice>(`/invoices/${invoiceId}/cancel`, { reason }),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ============================================
// Quick Bill (Create + Finalize)
// ============================================

export function useQuickBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuickBillInput) => api.post<Invoice>('/invoices/quick-bill', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// ============================================
// Calculate Totals (Preview)
// ============================================

export function useCalculateTotals() {
  return useMutation({
    mutationFn: (data: {
      branchId: string;
      items: InvoiceItemInput[];
      discounts?: any[];
      redeemLoyaltyPoints?: number;
      useWalletAmount?: number;
      isIgst?: boolean;
    }) => api.post('/invoices/calculate', data),
  });
}
