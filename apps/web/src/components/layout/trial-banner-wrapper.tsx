'use client';

/**
 * TrialBannerWrapper - Client component that checks subscription status
 * and renders the appropriate banner/overlay based on subscription state
 *
 * States handled:
 * - trial: Shows trial banner with days remaining
 * - expired: Shows urgent expired banner (non-dismissible)
 * - past_due: Shows payment overdue banner (non-dismissible)
 * - suspended: Shows full-page overlay blocking the app
 */

import { useSubscriptionAccess } from '@/hooks/use-feature-access';
import { SubscriptionStatusBanner, SuspendedOverlay } from '@/components/common';

export function TrialBannerWrapper() {
  const { access, isLoading } = useSubscriptionAccess();

  // Don't show while loading
  if (isLoading) {
    return null;
  }

  // Suspended: Show full-page overlay
  if (access.isSuspended) {
    return <SuspendedOverlay planName={access.planName} />;
  }

  // Expired: Show urgent banner
  if (access.isExpired) {
    return (
      <SubscriptionStatusBanner
        type="expired"
        daysRemaining={null}
        planName={access.planName}
        gracePeriodDaysRemaining={access.gracePeriodDaysRemaining}
      />
    );
  }

  // Past Due: Show payment overdue banner
  if (access.isPastDue) {
    return (
      <SubscriptionStatusBanner
        type="past_due"
        daysRemaining={null}
        planName={access.planName}
        gracePeriodDaysRemaining={access.gracePeriodDaysRemaining}
      />
    );
  }

  // Trial: Show trial banner with days remaining
  if (access.isOnTrial && access.trialDaysRemaining !== null) {
    return (
      <SubscriptionStatusBanner
        type="trial"
        daysRemaining={access.trialDaysRemaining}
        planName={access.planName}
      />
    );
  }

  return null;
}
