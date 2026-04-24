/**
 * Feature Access Hook
 * Check if the current branch has access to specific features based on subscription
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useBranchContext } from './use-branch-context';

// Feature keys that can be checked
export type FeatureKey =
  | 'inventory'
  | 'memberships'
  | 'reports'
  | 'multiStaff'
  | 'onlineBooking'
  | 'smsReminders'
  | 'emailReminders'
  | 'api'
  | 'prioritySupport'
  | 'customBranding';

// Limit keys that can be checked
export type LimitKey = 'maxUsers' | 'maxAppointmentsPerDay' | 'maxServices' | 'maxProducts';

export interface SubscriptionFeatures {
  inventory: boolean;
  memberships: boolean;
  reports: 'basic' | 'advanced';
  multiStaff: boolean;
  onlineBooking: boolean;
  smsReminders: boolean;
  emailReminders: boolean;
  api: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxAppointmentsPerDay: number;
  maxServices: number;
  maxProducts: number;
}

export interface SubscriptionAccess {
  hasActiveSubscription: boolean;
  status: string | null;
  planName: string | null;
  planTier: string | null;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  // Trial info
  isOnTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  // Period info
  currentPeriodEnd: string | null;
  // Expiration/suspension info
  isExpired: boolean;
  isPastDue: boolean;
  isSuspended: boolean;
  gracePeriodEndsAt: string | null;
  gracePeriodDaysRemaining: number | null;
}

// Default features (most restrictive)
const DEFAULT_ACCESS: SubscriptionAccess = {
  hasActiveSubscription: false,
  status: null,
  planName: null,
  planTier: null,
  features: {
    inventory: false,
    memberships: false,
    reports: 'basic',
    multiStaff: false,
    onlineBooking: false,
    smsReminders: false,
    emailReminders: false,
    api: false,
    prioritySupport: false,
    customBranding: false,
  },
  limits: {
    maxUsers: 1,
    maxAppointmentsPerDay: 10,
    maxServices: 5,
    maxProducts: 10,
  },
  isOnTrial: false,
  trialEndsAt: null,
  trialDaysRemaining: null,
  currentPeriodEnd: null,
  isExpired: false,
  isPastDue: false,
  isSuspended: false,
  gracePeriodEndsAt: null,
  gracePeriodDaysRemaining: null,
};

/**
 * Fetch subscription access for the current branch
 */
async function fetchSubscriptionAccess(branchId: string): Promise<SubscriptionAccess> {
  // api.get already extracts the 'data' field from the API response
  return api.get<SubscriptionAccess>(`/subscriptions/branches/${branchId}/access`);
}

/**
 * Hook to get full subscription access details
 */
export function useSubscriptionAccess() {
  const { branchId } = useBranchContext();

  const query = useQuery({
    queryKey: ['subscription-access', branchId],
    queryFn: () => fetchSubscriptionAccess(branchId!),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  return {
    ...query,
    access: query.data ?? DEFAULT_ACCESS,
  };
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAccess(feature: FeatureKey): {
  hasAccess: boolean;
  isLoading: boolean;
  planName: string | null;
} {
  const { access, isLoading } = useSubscriptionAccess();

  const featureValue = access.features[feature];
  const hasAccess = typeof featureValue === 'boolean' ? featureValue : !!featureValue;

  return {
    hasAccess: access.hasActiveSubscription && hasAccess,
    isLoading,
    planName: access.planName,
  };
}

/**
 * Hook to check if advanced reports are available
 */
export function useAdvancedReports(): {
  hasAdvanced: boolean;
  isLoading: boolean;
} {
  const { access, isLoading } = useSubscriptionAccess();

  return {
    hasAdvanced: access.hasActiveSubscription && access.features.reports === 'advanced',
    isLoading,
  };
}

/**
 * Hook to check if within a specific limit
 */
export function useWithinLimit(
  limitKey: LimitKey,
  currentCount: number
): {
  withinLimit: boolean;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  isLoading: boolean;
} {
  const { access, isLoading } = useSubscriptionAccess();

  const limit = access.limits[limitKey];
  const isUnlimited = limit === -1;
  const withinLimit = isUnlimited || currentCount < limit;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentCount);

  return {
    withinLimit,
    limit,
    remaining,
    isUnlimited,
    isLoading,
  };
}

/**
 * Feature display names for UI
 */
export const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  inventory: 'Inventory Management',
  memberships: 'Memberships & Packages',
  reports: 'Reports',
  multiStaff: 'Multi-Staff Support',
  onlineBooking: 'Online Booking',
  smsReminders: 'SMS Reminders',
  emailReminders: 'Email Reminders',
  api: 'API Access',
  prioritySupport: 'Priority Support',
  customBranding: 'Custom Branding',
};

/**
 * Plans that include each feature (for upgrade prompts)
 */
export const FEATURE_REQUIRED_PLANS: Record<FeatureKey, string[]> = {
  inventory: ['Professional', 'Enterprise'],
  memberships: ['Professional', 'Enterprise'],
  reports: ['Basic', 'Professional', 'Enterprise'], // Basic has basic reports
  multiStaff: ['Professional', 'Enterprise'],
  onlineBooking: ['Professional', 'Enterprise'],
  smsReminders: ['Professional', 'Enterprise'],
  emailReminders: ['Basic', 'Professional', 'Enterprise'],
  api: ['Enterprise'],
  prioritySupport: ['Enterprise'],
  customBranding: ['Enterprise'],
};
