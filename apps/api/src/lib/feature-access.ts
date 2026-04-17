/**
 * Feature Access Service
 * Checks if a branch has access to specific features based on their subscription plan
 */

import { prisma } from './prisma';
import { ForbiddenError } from './errors';

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
}

// Default features for when there's no subscription (most restrictive)
const DEFAULT_FEATURES: SubscriptionFeatures = {
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
};

// Default limits for when there's no subscription (most restrictive)
const DEFAULT_LIMITS: SubscriptionLimits = {
  maxUsers: 1,
  maxAppointmentsPerDay: 10,
  maxServices: 5,
  maxProducts: 10,
};

/**
 * Get subscription access details for a branch
 */
export async function getSubscriptionAccess(branchId: string): Promise<SubscriptionAccess> {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: {
      plan: true,
    },
  });

  // No subscription found
  if (!subscription) {
    return {
      hasActiveSubscription: false,
      status: null,
      planName: null,
      planTier: null,
      features: DEFAULT_FEATURES,
      limits: DEFAULT_LIMITS,
    };
  }

  // Check if subscription is in an active state (trial or active)
  const isActive = ['trial', 'active'].includes(subscription.status);

  // Parse features from plan (with defaults)
  const planFeatures = (subscription.plan.features || {}) as Partial<SubscriptionFeatures>;
  const features: SubscriptionFeatures = {
    ...DEFAULT_FEATURES,
    ...planFeatures,
  };

  // Get limits from plan
  const limits: SubscriptionLimits = {
    maxUsers: subscription.plan.maxUsers,
    maxAppointmentsPerDay: subscription.plan.maxAppointmentsPerDay,
    maxServices: subscription.plan.maxServices,
    maxProducts: subscription.plan.maxProducts,
  };

  return {
    hasActiveSubscription: isActive,
    status: subscription.status,
    planName: subscription.plan.name,
    planTier: subscription.plan.tier,
    features: isActive ? features : DEFAULT_FEATURES,
    limits: isActive ? limits : DEFAULT_LIMITS,
  };
}

/**
 * Check if a branch has access to a specific feature
 */
export async function hasFeatureAccess(branchId: string, feature: FeatureKey): Promise<boolean> {
  const access = await getSubscriptionAccess(branchId);

  if (!access.hasActiveSubscription) {
    return false;
  }

  const featureValue = access.features[feature];

  // For boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  // For string features (like reports: 'basic' | 'advanced'), any value means access
  return !!featureValue;
}

/**
 * Check if a branch has access to advanced reports
 */
export async function hasAdvancedReports(branchId: string): Promise<boolean> {
  const access = await getSubscriptionAccess(branchId);
  return access.hasActiveSubscription && access.features.reports === 'advanced';
}

/**
 * Check if a branch is within a specific limit
 * Returns true if within limit, false if limit exceeded
 */
export async function checkLimit(
  branchId: string,
  limitKey: LimitKey,
  currentCount: number
): Promise<boolean> {
  const access = await getSubscriptionAccess(branchId);

  if (!access.hasActiveSubscription) {
    return currentCount < DEFAULT_LIMITS[limitKey];
  }

  const limit = access.limits[limitKey];

  // -1 means unlimited
  if (limit === -1) {
    return true;
  }

  return currentCount < limit;
}

/**
 * Require feature access - throws ForbiddenError if not allowed
 */
export async function requireFeatureAccess(branchId: string, feature: FeatureKey): Promise<void> {
  const hasAccess = await hasFeatureAccess(branchId, feature);

  if (!hasAccess) {
    const featureNames: Record<FeatureKey, string> = {
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

    throw new ForbiddenError(
      'FEATURE_NOT_AVAILABLE',
      `${featureNames[feature]} is not available on your current plan. Please upgrade to access this feature.`
    );
  }
}

/**
 * Require limit not exceeded - throws ForbiddenError if limit reached
 */
export async function requireWithinLimit(
  branchId: string,
  limitKey: LimitKey,
  currentCount: number
): Promise<void> {
  const withinLimit = await checkLimit(branchId, limitKey, currentCount);

  if (!withinLimit) {
    const limitNames: Record<LimitKey, string> = {
      maxUsers: 'users',
      maxAppointmentsPerDay: 'appointments per day',
      maxServices: 'services',
      maxProducts: 'products',
    };

    throw new ForbiddenError(
      'LIMIT_EXCEEDED',
      `You've reached the maximum number of ${limitNames[limitKey]} for your current plan. Please upgrade to add more.`
    );
  }
}
