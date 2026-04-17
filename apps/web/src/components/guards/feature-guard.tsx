'use client';

/**
 * Feature Guard Component
 *
 * Protects routes that require specific feature flags to be enabled.
 * Two-layer protection:
 * 1. Static feature flags (environment variables) - global on/off for all tenants
 * 2. Subscription-based access - per-tenant based on their subscription plan
 *
 * If static flag is disabled, shows 404.
 * If subscription doesn't include feature, shows upgrade prompt.
 */

import { notFound } from 'next/navigation';
import { features, type FeatureFlags } from '@/config/features';
import { FeatureGate } from '@/components/common';
import type { FeatureKey } from '@/hooks/use-feature-access';

interface FeatureGuardProps {
  feature: FeatureFlags;
  children: React.ReactNode;
  /**
   * Whether to check subscription access in addition to static flags
   * Default: true (checks both static flags AND subscription)
   * Set to false to only check static flags (useful during development)
   */
  checkSubscription?: boolean;
}

// Map static feature flags to subscription feature keys
const featureKeyMap: Record<FeatureFlags, FeatureKey | null> = {
  inventory: 'inventory',
  memberships: 'memberships',
  reports: 'reports',
  marketing: null, // Marketing doesn't have a subscription feature yet
  realTime: null, // Real-time is not a subscription feature
};

export function FeatureGuard({ feature, children, checkSubscription = true }: FeatureGuardProps) {
  // Layer 1: Check static feature flag (environment variable)
  const isStaticEnabled = features[feature];

  if (!isStaticEnabled) {
    notFound();
  }

  // Layer 2: Check subscription-based access (if enabled)
  const subscriptionFeature = featureKeyMap[feature];

  if (checkSubscription && subscriptionFeature) {
    return (
      <FeatureGate feature={subscriptionFeature} promptVariant="full-page">
        {children}
      </FeatureGate>
    );
  }

  // No subscription check needed, just render children
  return <>{children}</>;
}
