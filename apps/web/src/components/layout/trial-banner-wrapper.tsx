'use client';

/**
 * TrialBannerWrapper - Client component that checks subscription status
 * and renders the trial banner if user is on trial
 */

import { useSubscriptionAccess } from '@/hooks/use-feature-access';
import { TrialBanner } from '@/components/common';

export function TrialBannerWrapper() {
  const { access, isLoading } = useSubscriptionAccess();

  // Don't show while loading or if not on trial
  if (isLoading || !access.isOnTrial || access.trialDaysRemaining === null) {
    return null;
  }

  return <TrialBanner daysRemaining={access.trialDaysRemaining} planName={access.planName} />;
}
