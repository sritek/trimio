/**
 * Tenant Service
 * Business logic for tenant operations
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { UpdateTenantBody } from './tenant.schema';

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
        billingEmail: true,
        billingAddress: true,
        gstin: true,
        volumeDiscountEnabled: true,
        volumeDiscountPercentage: true,
        volumeDiscountMinBranches: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Get usage statistics
    const [branchCount, userCount, activeBranchSubscriptions] = await Promise.all([
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
      prisma.branchSubscription.count({
        where: {
          tenantId,
          status: { in: ['active', 'trial'] },
        },
      }),
    ]);

    return {
      ...tenant,
      volumeDiscountPercentage: Number(tenant.volumeDiscountPercentage),
      usage: {
        branches: {
          current: branchCount,
          active: activeBranchSubscriptions,
        },
        users: {
          current: userCount,
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
        billingEmail: true,
        billingAddress: true,
        gstin: true,
        volumeDiscountEnabled: true,
        volumeDiscountPercentage: true,
        volumeDiscountMinBranches: true,
      },
    });

    // Get usage statistics for response
    const [branchCount, userCount, activeBranchSubscriptions] = await Promise.all([
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
      prisma.branchSubscription.count({
        where: {
          tenantId,
          status: { in: ['active', 'trial'] },
        },
      }),
    ]);

    return {
      ...updated,
      volumeDiscountPercentage: Number(updated.volumeDiscountPercentage),
      usage: {
        branches: {
          current: branchCount,
          active: activeBranchSubscriptions,
        },
        users: {
          current: userCount,
        },
      },
    };
  }
}

export const tenantService = new TenantService();
