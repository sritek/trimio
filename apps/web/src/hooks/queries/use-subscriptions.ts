/**
 * Subscription Hooks
 * React Query hooks for subscription management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ============================================
// Types
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  tier: 'basic' | 'professional' | 'enterprise';
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  maxUsers: number;
  maxAppointmentsPerDay: number;
  maxServices: number;
  maxProducts: number;
  features: Record<string, unknown>;
  trialDays: number;
  gracePeriodDays: number;
  isActive: boolean;
  isPublic: boolean;
}

export interface BranchSubscription {
  id: string;
  tenantId: string;
  branchId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  trialStartDate: string | null;
  trialEndDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  // Locked plan terms at subscription creation
  trialDaysGranted: number;
  gracePeriodDaysGranted: number;
  pricePerPeriod: number;
  currency: string;
  discountPercentage: number;
  discountReason: string | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  gracePeriodEndDate: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
  branchName?: string;
}

export interface BillingOverview {
  subscriptions: BranchSubscription[];
  summary: {
    totalBranches: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    pastDueSubscriptions: number;
    suspendedSubscriptions: number;
    monthlyRecurring: number;
  };
}

export interface BillingSettings {
  id: string;
  billingEmail: string | null;
  billingAddress: string | null;
  gstin: string | null;
  volumeDiscountEnabled: boolean;
  volumeDiscountPercentage: number;
  volumeDiscountMinBranches: number;
}

export interface SubscriptionHistory {
  id: string;
  subscriptionId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromPlanId: string | null;
  toPlanId: string | null;
  metadata: Record<string, unknown>;
  performedBy: string | null;
  createdAt: string;
}

export interface ChangePlanInput {
  newPlanId: string;
  billingCycle?: 'monthly' | 'annual';
  effectiveImmediately?: boolean;
}

export interface CancelSubscriptionInput {
  reason: string;
  cancelImmediately?: boolean;
}

export interface ReactivateSubscriptionInput {
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
}

export interface UpdateBillingSettingsInput {
  billingEmail?: string | null;
  billingAddress?: string | null;
  gstin?: string | null;
}

// ============================================
// Query Keys
// ============================================

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  billing: () => [...subscriptionKeys.all, 'billing'] as const,
  billingSettings: () => [...subscriptionKeys.all, 'billing-settings'] as const,
  branch: (branchId: string) => [...subscriptionKeys.all, 'branch', branchId] as const,
  history: (branchId: string) => [...subscriptionKeys.all, 'history', branchId] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * List all available subscription plans
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: () => api.get<SubscriptionPlan[]>('/subscriptions/plans'),
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
  });
}

/**
 * Get billing overview for the tenant
 */
export function useBillingOverview() {
  return useQuery({
    queryKey: subscriptionKeys.billing(),
    queryFn: () => api.get<BillingOverview>('/subscriptions/billing/overview'),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get billing settings
 */
export function useBillingSettings() {
  return useQuery({
    queryKey: subscriptionKeys.billingSettings(),
    queryFn: () => api.get<BillingSettings>('/subscriptions/billing/settings'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get subscription for a specific branch
 */
export function useBranchSubscription(branchId: string) {
  return useQuery({
    queryKey: subscriptionKeys.branch(branchId),
    queryFn: () => api.get<BranchSubscription>(`/subscriptions/branches/${branchId}`),
    enabled: !!branchId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get subscription history for a branch
 */
export function useSubscriptionHistory(branchId: string) {
  return useQuery({
    queryKey: subscriptionKeys.history(branchId),
    queryFn: () => api.get<SubscriptionHistory[]>(`/subscriptions/branches/${branchId}/history`),
    enabled: !!branchId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export function useChangePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: ChangePlanInput }) =>
      api.post<BranchSubscription>(`/subscriptions/branches/${branchId}/change-plan`, data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billing() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.branch(branchId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.history(branchId) });
    },
  });
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: CancelSubscriptionInput }) =>
      api.post<BranchSubscription>(`/subscriptions/branches/${branchId}/cancel`, data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billing() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.branch(branchId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.history(branchId) });
    },
  });
}

/**
 * Reactivate subscription
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: ReactivateSubscriptionInput }) =>
      api.post<BranchSubscription>(`/subscriptions/branches/${branchId}/reactivate`, data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billing() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.branch(branchId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.history(branchId) });
    },
  });
}

/**
 * Update billing settings
 */
export function useUpdateBillingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBillingSettingsInput) =>
      api.patch<BillingSettings>('/subscriptions/billing/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billingSettings() });
    },
  });
}
