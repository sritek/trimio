/**
 * Internal Admin Portal - Shared Types
 */

// ============================================
// ENTITY TYPES
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
  displayOrder: number;
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

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  isActive: boolean;
  subscriptionStatus: string | null;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  createdAt: string;
  _count: {
    branches: number;
    users: number;
  };
}

export interface TenantDetail extends Tenant {
  legalName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  gstin: string | null;
  branches: Branch[];
  users: Owner[];
}

export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  pointsPerUnit: number;
  redemptionValuePerPoint: number;
  expiryDays: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface TenantFormData {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  logoUrl: string;
  // Billing information
  billingEmail: string;
  billingAddress: string;
  gstin: string;
}

export interface BranchFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface OwnerFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface FormErrors {
  [key: string]: string | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface TenantsResponse {
  success: boolean;
  data: Tenant[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantResponse {
  success: boolean;
  data: TenantDetail;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface LogoState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

export interface CreatedEntities {
  tenant: { id: string; name: string; slug: string } | null;
  branch: { id: string; name: string } | null;
  owner: { id: string; name: string; email: string | null } | null;
}

// ============================================
// SUBSCRIPTION FORM TYPES
// ============================================

export interface CreateSubscriptionFormData {
  branchId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  startTrial: boolean;
  discountPercentage: number;
  discountReason: string;
}

export interface SubscriptionBillingOverview {
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

// ============================================
// PLAN MANAGEMENT TYPES
// ============================================

export interface CreatePlanFormData {
  name: string;
  code: string;
  tier: 'basic' | 'professional' | 'enterprise';
  description: string;
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
  displayOrder: number;
  isActive: boolean;
  isPublic: boolean;
}

export interface UpdatePlanFormData extends Partial<Omit<CreatePlanFormData, 'code'>> {}

// ============================================
// SUBSCRIPTION HISTORY TYPES
// ============================================

export interface SubscriptionHistory {
  id: string;
  tenantId: string;
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
