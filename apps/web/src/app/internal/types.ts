/**
 * Internal Admin Portal - Shared Types
 */

// ============================================
// ENTITY TYPES
// ============================================

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
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  createdAt: string;
  _count: {
    branches: number;
    users: number;
  };
}

export interface TenantDetail extends Tenant {
  legalName: string | null;
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
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialDays: number;
  logoUrl: string;
  // Loyalty configuration
  loyaltyEnabled: boolean;
  loyaltyPointsPerUnit: number;
  loyaltyRedemptionValue: number;
  loyaltyExpiryDays: number;
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
// ENUMS / CONSTANTS
// ============================================

export type SubscriptionPlan = 'trial' | 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'cancelled';

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
