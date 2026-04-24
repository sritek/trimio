/**
 * Internal Admin API Hook
 * Provides authenticated API calls for the internal admin portal
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAdminStore } from '@/stores/admin-store';
import type {
  TenantFormData,
  BranchFormData,
  OwnerFormData,
  Tenant,
  TenantDetail,
  Branch,
  Owner,
  TenantsResponse,
  LoyaltyConfig,
  SubscriptionPlan,
  BranchSubscription,
  CreateSubscriptionFormData,
  SubscriptionBillingOverview,
  CreatePlanFormData,
  UpdatePlanFormData,
  SubscriptionHistory,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function useInternalApi() {
  const router = useRouter();
  const { accessToken, logout } = useAdminStore();

  /**
   * Base fetch wrapper with auth and error handling
   */
  const apiFetch = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/internal${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        logout();
        router.push('/internal/login');
        throw new Error('Session expired');
      }

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error?.message || 'Request failed');
      }

      return data.data as T;
    },
    [accessToken, logout, router]
  );

  /**
   * Upload file (multipart/form-data)
   */
  const uploadFile = useCallback(
    async (
      endpoint: string,
      file: File,
      additionalFields?: Record<string, string>
    ): Promise<{ url: string; key: string }> => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();

      // Append fields before file — Fastify multipart needs fields available when file is parsed
      if (additionalFields) {
        Object.entries(additionalFields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      formData.append('file', file, file.name);

      const response = await fetch(`${API_URL}/internal${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        logout();
        router.push('/internal/login');
        throw new Error('Session expired');
      }

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error?.message || 'Upload failed');
      }

      return data.data;
    },
    [accessToken, logout, router]
  );

  // ============================================
  // TENANT OPERATIONS
  // ============================================

  const listTenants = useCallback(
    async (search?: string): Promise<TenantsResponse> => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`${API_URL}/internal/tenants?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        logout();
        router.push('/internal/login');
        throw new Error('Session expired');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch tenants');
      }

      return data as TenantsResponse;
    },
    [accessToken, logout, router]
  );

  const getTenant = useCallback(
    async (id: string): Promise<TenantDetail> => {
      return apiFetch<TenantDetail>(`/tenants/${id}`);
    },
    [apiFetch]
  );

  const createTenant = useCallback(
    async (data: Partial<TenantFormData>): Promise<Tenant> => {
      return apiFetch<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          legalName: data.legalName || undefined,
          email: data.email,
          phone: data.phone || undefined,
        }),
      });
    },
    [apiFetch]
  );

  const updateTenant = useCallback(
    async (id: string, data: Partial<TenantFormData>): Promise<Tenant> => {
      return apiFetch<Tenant>(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          legalName: data.legalName || null,
          email: data.email,
          phone: data.phone || null,
          logoUrl: data.logoUrl || null,
        }),
      });
    },
    [apiFetch]
  );

  // ============================================
  // BRANCH OPERATIONS
  // ============================================

  const createBranch = useCallback(
    async (tenantId: string, data: BranchFormData): Promise<Branch> => {
      return apiFetch<Branch>('/branches', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          phone: data.phone || undefined,
          email: data.email || undefined,
          gstin: data.gstin || undefined,
        }),
      });
    },
    [apiFetch]
  );

  const updateBranch = useCallback(
    async (id: string, data: BranchFormData): Promise<Branch> => {
      return apiFetch<Branch>(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
        }),
      });
    },
    [apiFetch]
  );

  // ============================================
  // OWNER OPERATIONS
  // ============================================

  const createOwner = useCallback(
    async (tenantId: string, data: OwnerFormData): Promise<Owner> => {
      return apiFetch<Owner>('/users', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });
    },
    [apiFetch]
  );

  const updateOwner = useCallback(
    async (id: string, data: Partial<OwnerFormData>): Promise<Owner> => {
      const payload: Record<string, string> = {
        name: data.name!,
        email: data.email!,
        phone: data.phone!,
      };
      if (data.password) {
        payload.password = data.password;
      }

      return apiFetch<Owner>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    [apiFetch]
  );

  // ============================================
  // LOYALTY CONFIG OPERATIONS
  // ============================================

  const getLoyaltyConfig = useCallback(
    async (tenantId: string): Promise<LoyaltyConfig> => {
      return apiFetch<LoyaltyConfig>(`/tenants/${tenantId}/loyalty-config`);
    },
    [apiFetch]
  );

  const updateLoyaltyConfig = useCallback(
    async (tenantId: string, data: Partial<LoyaltyConfig>): Promise<LoyaltyConfig> => {
      return apiFetch<LoyaltyConfig>(`/tenants/${tenantId}/loyalty-config`, {
        method: 'PATCH',
        body: JSON.stringify({
          isEnabled: data.isEnabled,
          pointsPerUnit: data.pointsPerUnit,
          redemptionValuePerPoint: data.redemptionValuePerPoint,
          expiryDays: data.expiryDays,
        }),
      });
    },
    [apiFetch]
  );

  // ============================================
  // LOGO UPLOAD
  // ============================================

  const uploadLogo = useCallback(
    async (tenantId: string, file: File): Promise<string> => {
      const result = await uploadFile('/upload/logo', file, { tenantId });
      return result.url;
    },
    [uploadFile]
  );

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================

  const listPlans = useCallback(
    async (query?: {
      isActive?: boolean;
      isPublic?: boolean;
      tier?: string;
    }): Promise<SubscriptionPlan[]> => {
      const params = new URLSearchParams();
      if (query?.isActive !== undefined) params.set('isActive', String(query.isActive));
      if (query?.isPublic !== undefined) params.set('isPublic', String(query.isPublic));
      if (query?.tier) params.set('tier', query.tier);

      const queryString = params.toString();
      return apiFetch<SubscriptionPlan[]>(
        `/subscriptions/plans${queryString ? `?${queryString}` : ''}`
      );
    },
    [apiFetch]
  );

  const getPlan = useCallback(
    async (planId: string): Promise<SubscriptionPlan> => {
      return apiFetch<SubscriptionPlan>(`/subscriptions/plans/${planId}`);
    },
    [apiFetch]
  );

  const createPlan = useCallback(
    async (data: CreatePlanFormData): Promise<SubscriptionPlan> => {
      return apiFetch<SubscriptionPlan>('/subscriptions/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    [apiFetch]
  );

  const updatePlan = useCallback(
    async (planId: string, data: UpdatePlanFormData): Promise<SubscriptionPlan> => {
      return apiFetch<SubscriptionPlan>(`/subscriptions/plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    [apiFetch]
  );

  const getBillingOverview = useCallback(
    async (tenantId: string): Promise<SubscriptionBillingOverview> => {
      return apiFetch<SubscriptionBillingOverview>(`/subscriptions/tenants/${tenantId}/billing`);
    },
    [apiFetch]
  );

  const createSubscription = useCallback(
    async (tenantId: string, data: CreateSubscriptionFormData): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(`/subscriptions/tenants/${tenantId}/subscriptions`, {
        method: 'POST',
        body: JSON.stringify({
          branchId: data.branchId,
          planId: data.planId,
          billingCycle: data.billingCycle,
          startTrial: data.startTrial,
          discountPercentage: data.discountPercentage || 0,
          discountReason: data.discountReason || undefined,
        }),
      });
    },
    [apiFetch]
  );

  const cancelSubscription = useCallback(
    async (
      tenantId: string,
      branchId: string,
      data: { reason: string; cancelImmediately: boolean }
    ): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    },
    [apiFetch]
  );

  const reactivateSubscription = useCallback(
    async (
      tenantId: string,
      branchId: string,
      data?: { planId?: string; billingCycle?: 'monthly' | 'annual' }
    ): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/reactivate`,
        {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }
      );
    },
    [apiFetch]
  );

  const updateSubscriptionStatus = useCallback(
    async (
      tenantId: string,
      branchId: string,
      data: { status: string; reason?: string }
    ): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    [apiFetch]
  );

  const extendTrial = useCallback(
    async (
      tenantId: string,
      branchId: string,
      data: { additionalDays: number; reason: string }
    ): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/extend-trial`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    },
    [apiFetch]
  );

  const applyDiscount = useCallback(
    async (
      tenantId: string,
      branchId: string,
      data: { discountPercentage: number; discountReason?: string }
    ): Promise<BranchSubscription> => {
      return apiFetch<BranchSubscription>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/discount`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    [apiFetch]
  );

  const getSubscriptionHistory = useCallback(
    async (tenantId: string, branchId: string): Promise<SubscriptionHistory[]> => {
      return apiFetch<SubscriptionHistory[]>(
        `/subscriptions/tenants/${tenantId}/branches/${branchId}/history`
      );
    },
    [apiFetch]
  );

  // Memoize the returned object to prevent infinite loops when used in useEffect dependencies
  return useMemo(
    () => ({
      // Tenant
      listTenants,
      getTenant,
      createTenant,
      updateTenant,
      // Branch
      createBranch,
      updateBranch,
      // Owner
      createOwner,
      updateOwner,
      // Loyalty Config
      getLoyaltyConfig,
      updateLoyaltyConfig,
      // Upload
      uploadLogo,
      // Subscription Plans
      listPlans,
      getPlan,
      createPlan,
      updatePlan,
      // Subscriptions
      getBillingOverview,
      createSubscription,
      cancelSubscription,
      reactivateSubscription,
      // Admin subscription operations
      updateSubscriptionStatus,
      extendTrial,
      applyDiscount,
      getSubscriptionHistory,
    }),
    [
      listTenants,
      getTenant,
      createTenant,
      updateTenant,
      createBranch,
      updateBranch,
      createOwner,
      updateOwner,
      getLoyaltyConfig,
      updateLoyaltyConfig,
      uploadLogo,
      listPlans,
      getPlan,
      createPlan,
      updatePlan,
      getBillingOverview,
      createSubscription,
      cancelSubscription,
      reactivateSubscription,
      updateSubscriptionStatus,
      extendTrial,
      applyDiscount,
      getSubscriptionHistory,
    ]
  );
}
