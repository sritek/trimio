/**
 * Tenant Hooks
 * React Query hooks for tenant management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ============================================
// Types
// ============================================

export interface TenantUsage {
  branches: {
    current: number;
    active: number;
  };
  users: {
    current: number;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  gstin: string | null;
  volumeDiscountEnabled: boolean;
  volumeDiscountPercentage: number;
  volumeDiscountMinBranches: number;
  usage: TenantUsage;
}

export interface UpdateTenantInput {
  name?: string;
  legalName?: string | null;
  email?: string;
  phone?: string | null;
  logoUrl?: string | null;
}

// ============================================
// Query Keys
// ============================================

export const tenantKeys = {
  all: ['tenant'] as const,
  detail: () => [...tenantKeys.all, 'detail'] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Get current tenant details with usage statistics
 */
export function useTenant() {
  return useQuery({
    queryKey: tenantKeys.detail(),
    queryFn: () => api.get<Tenant>('/tenant'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update tenant details (super_owner only)
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTenantInput) => api.patch<Tenant>('/tenant', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail() });
    },
  });
}
