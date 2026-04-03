/**
 * Branch Hooks
 * React Query hooks for branch data
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ============================================
// Types
// ============================================

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  timezone: string;
  currency: string;
  workingHours?: Record<string, { isOpen: boolean; openTime?: string | null; closeTime?: string | null }>;
  isActive: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  workingHours?: Record<
    string,
    { isOpen: boolean; openTime?: string | null; closeTime?: string | null }
  > | null;
}

// ============================================
// Query Keys
// ============================================

export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (branchIds: string[]) => [...branchKeys.lists(), branchIds] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Get all branches the user has access to
 * Fetches branch details for the user's branchIds
 */
export function useBranches(branchIds: string[]) {
  return useQuery({
    queryKey: branchKeys.list(branchIds),
    queryFn: async () => {
      if (branchIds.length === 0) {
        return [];
      }
      // Fetch branches by IDs
      const branches = await api.get<Branch[]>('/branches', {
        ids: branchIds.join(','),
      });
      return branches;
    },
    enabled: branchIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - branches don't change often
  });
}

/**
 * Get a single branch by ID
 */
export function useBranch(id: string) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => api.get<Branch>(`/branches/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update a branch (super_owner or regional_manager only)
 */
export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchInput }) =>
      api.patch<Branch>(`/branches/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}
