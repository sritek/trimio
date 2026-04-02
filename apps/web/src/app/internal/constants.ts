/**
 * Internal Admin Portal - Constants
 */

import type { SubscriptionPlan, SubscriptionStatus } from './types';

// ============================================
// SUBSCRIPTION OPTIONS
// ============================================

export const SUBSCRIPTION_PLANS: { value: SubscriptionPlan; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'basic', label: 'Basic' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

export const SUBSCRIPTION_STATUSES: { value: SubscriptionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ============================================
// PLAN BADGE COLORS
// ============================================

export const PLAN_BADGE_COLORS: Record<SubscriptionPlan, string> = {
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  basic: 'bg-blue-100 text-blue-700 border-blue-200',
  professional: 'bg-purple-100 text-purple-700 border-purple-200',
  enterprise: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_TRIAL_DAYS = 14;

export const EMPTY_TENANT_FORM = {
  name: '',
  legalName: '',
  email: '',
  phone: '',
  subscriptionPlan: 'trial' as SubscriptionPlan,
  subscriptionStatus: 'active' as SubscriptionStatus,
  trialDays: DEFAULT_TRIAL_DAYS,
  logoUrl: '',
  // Loyalty defaults
  loyaltyEnabled: true,
  loyaltyPointsPerUnit: 0.01, // 1 point per ₹100 spent
  loyaltyRedemptionValue: 1, // 1 point = ₹1
  loyaltyExpiryDays: 365,
};

export const EMPTY_BRANCH_FORM = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
};

export const EMPTY_OWNER_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

// ============================================
// FILE UPLOAD
// ============================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const MAX_LOGO_SIZE_MB = 2;
export const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;
