'use client';

/**
 * Hook to check subscription limit status
 * Returns current count, limit, and whether limit is reached
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useSubscriptionAccess } from './use-feature-access';

interface LimitStatusResponse {
  users: number;
  services: number;
  products: number;
}

interface LimitStatus {
  current: number;
  limit: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  isUnlimited: boolean;
  isLoading: boolean;
}

/**
 * Fetch current counts for all limited resources
 */
function useLimitCounts() {
  return useQuery({
    queryKey: ['limit-counts'],
    queryFn: () => api.get<LimitStatusResponse>('/subscriptions/limits/counts'),
    staleTime: 30 * 1000, // 30 seconds - counts can change frequently
  });
}

/**
 * Hook to get limit status for users
 */
export function useUserLimitStatus(): LimitStatus {
  const { data: counts, isLoading: isLoadingCounts } = useLimitCounts();
  const { access, isLoading: isLoadingAccess, isError } = useSubscriptionAccess();

  const current = counts?.users ?? 0;

  // If still loading or error, don't show limit warnings
  // Use actual limit from subscription, not default
  const hasValidAccess = !isLoadingAccess && !isError && access.hasActiveSubscription;
  const limit = hasValidAccess ? access.limits.maxUsers : -1; // Treat as unlimited if no valid access

  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && current >= limit;
  const isNearLimit = !isUnlimited && !isAtLimit && limit > 0 && current / limit >= 0.9;

  return {
    current,
    limit,
    isAtLimit,
    isNearLimit,
    isUnlimited,
    isLoading: isLoadingCounts || isLoadingAccess,
  };
}

/**
 * Hook to get limit status for services
 */
export function useServiceLimitStatus(): LimitStatus {
  const { data: counts, isLoading: isLoadingCounts } = useLimitCounts();
  const { access, isLoading: isLoadingAccess, isError } = useSubscriptionAccess();

  const current = counts?.services ?? 0;

  // If still loading or error, don't show limit warnings
  const hasValidAccess = !isLoadingAccess && !isError && access.hasActiveSubscription;
  const limit = hasValidAccess ? access.limits.maxServices : -1;

  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && current >= limit;
  const isNearLimit = !isUnlimited && !isAtLimit && limit > 0 && current / limit >= 0.9;

  return {
    current,
    limit,
    isAtLimit,
    isNearLimit,
    isUnlimited,
    isLoading: isLoadingCounts || isLoadingAccess,
  };
}

/**
 * Hook to get limit status for products
 */
export function useProductLimitStatus(): LimitStatus {
  const { data: counts, isLoading: isLoadingCounts } = useLimitCounts();
  const { access, isLoading: isLoadingAccess, isError } = useSubscriptionAccess();

  const current = counts?.products ?? 0;

  // If still loading or error, don't show limit warnings
  const hasValidAccess = !isLoadingAccess && !isError && access.hasActiveSubscription;
  const limit = hasValidAccess ? access.limits.maxProducts : -1;

  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && current >= limit;
  const isNearLimit = !isUnlimited && !isAtLimit && limit > 0 && current / limit >= 0.9;

  return {
    current,
    limit,
    isAtLimit,
    isNearLimit,
    isUnlimited,
    isLoading: isLoadingCounts || isLoadingAccess,
  };
}
