/**
 * Tenant Service
 * Business logic for tenant operations
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { UpdateTenantBody } from './tenant.schema';

// Subscription plan limits
const PLAN_LIMITS: Record<string, { branches: number; users: number }> = {
  trial: { branches: 1, users: 5 },
  starter: { branches: 2, users: 10 },
  professional: { branches: 5, users: 25 },
  enterprise: { branches: 999, users: 999 },
};

export class TenantService {
  /**
   * Get tenant details with usage statistics
   */
  async getTenant(tenantId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        email: true,
        phone: true,
        logoUrl: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Get usage statistics
    const [branchCount, userCount] = await Promise.all([
      prisma.branch.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    const limits = PLAN_LIMITS[tenant.subscriptionPlan] || PLAN_LIMITS.trial;

    return {
      ...tenant,
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      usage: {
        branches: {
          current: branchCount,
          max: limits.branches,
        },
        users: {
          current: userCount,
          max: limits.users,
        },
      },
    };
  }

  /**
   * Update tenant details
   */
  async updateTenant(tenantId: string, data: UpdateTenantBody, _updatedBy: string) {
    // Verify tenant exists
    const existing = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        email: true,
        phone: true,
        logoUrl: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    // Get usage statistics for response
    const [branchCount, userCount] = await Promise.all([
      prisma.branch.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    const limits = PLAN_LIMITS[updated.subscriptionPlan] || PLAN_LIMITS.trial;

    return {
      ...updated,
      trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
      usage: {
        branches: {
          current: branchCount,
          max: limits.branches,
        },
        users: {
          current: userCount,
          max: limits.users,
        },
      },
    };
  }

  /**
   * Get plan limits for a subscription plan
   */
  getPlanLimits(plan: string) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  }
}

export const tenantService = new TenantService();
