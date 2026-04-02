/**
 * Internal Admin Service
 * Business logic for tenant provisioning
 */

import bcrypt from 'bcrypt';

import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import type { PaginatedResult } from '../../lib/types';
import type {
  CreateTenantBody,
  CreateBranchBody,
  CreateSuperOwnerBody,
  ListTenantsQuery,
  UpdateTenantBody,
  UpdateBranchBody,
  UpdateSuperOwnerBody,
  UpdateLoyaltyConfigBody,
} from './internal.schema';

export class InternalService {
  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantBody) {
    // Check if email already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { email: data.email },
    });

    if (existingTenant) {
      throw new ConflictError('DUPLICATE_ENTRY', 'A tenant with this email already exists');
    }

    const slug = this.generateSlug(data.name);

    // Create tenant and loyalty config in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug,
          legalName: data.legalName,
          email: data.email,
          phone: data.phone,
          logoUrl: data.logoUrl,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionStatus: 'active',
          trialEndsAt:
            data.subscriptionPlan === 'trial'
              ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000)
              : null,
        },
      });

      // Create loyalty config for the tenant
      await tx.loyaltyConfig.create({
        data: {
          tenantId: newTenant.id,
          isEnabled: data.loyaltyEnabled ?? true,
          pointsPerUnit: data.loyaltyPointsPerUnit ?? 0.01,
          redemptionValuePerPoint: data.loyaltyRedemptionValue ?? 1,
          expiryDays: data.loyaltyExpiryDays ?? 365,
        },
      });

      return newTenant;
    });

    return tenant;
  }

  /**
   * Create a branch for a tenant
   * Also auto-assigns all super_owners to the new branch
   */
  async createBranch(data: CreateBranchBody) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Generate unique slug for branch within tenant
    const baseSlug = this.generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (
      await prisma.branch.findFirst({
        where: { tenantId: data.tenantId, slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create branch and auto-assign all super_owners in a transaction
    const branch = await prisma.$transaction(async (tx) => {
      // Create the branch
      const newBranch = await tx.branch.create({
        data: {
          tenantId: data.tenantId,
          name: data.name,
          slug,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          phone: data.phone,
          email: data.email,
          gstin: data.gstin,
          isActive: true,
        },
      });

      // Find all super_owners for this tenant
      const superOwners = await tx.user.findMany({
        where: {
          tenantId: data.tenantId,
          role: 'super_owner',
          deletedAt: null,
        },
        select: { id: true },
      });

      // Auto-assign all super_owners to the new branch
      if (superOwners.length > 0) {
        await tx.userBranch.createMany({
          data: superOwners.map((user) => ({
            userId: user.id,
            branchId: newBranch.id,
            isPrimary: false, // Not primary since they already have a primary branch
          })),
          skipDuplicates: true,
        });
      }

      return newBranch;
    });

    return branch;
  }

  /**
   * Create a super owner user for a tenant
   * Super owners are assigned to ALL existing branches (DB is source of truth)
   */
  async createSuperOwner(data: CreateSuperOwnerBody) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Get ALL branches for this tenant
    const branches = await prisma.branch.findMany({
      where: { tenantId: data.tenantId, deletedAt: null },
      select: { id: true },
    });

    if (branches.length === 0) {
      throw new NotFoundError(
        'BRANCH_NOT_FOUND',
        'No branches found for this tenant. Create a branch first.'
      );
    }

    // Check if email or phone already exists for this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: data.tenantId,
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictError(
        'DUPLICATE_ENTRY',
        'A user with this email or phone already exists for this tenant'
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Assign super_owner to ALL branches (first one is primary)
    const branchAssignments = branches.map((branch, index) => ({
      branchId: branch.id,
      isPrimary: index === 0,
    }));

    const user = await prisma.user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: 'super_owner',
        isActive: true,
        branchAssignments: {
          create: branchAssignments,
        },
      },
      include: {
        branchAssignments: true,
      },
    });

    return user;
  }

  /**
   * List all tenants with pagination
   */
  async listTenants(query: ListTenantsQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
          deletedAt: null,
        }
      : { deletedAt: null };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              branches: true,
              users: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get tenant by ID with branches and users count
   */
  async getTenantById(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          where: { deletedAt: null, role: 'super_owner' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, data: UpdateTenantBody) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== tenant.email) {
      const existingTenant = await prisma.tenant.findFirst({
        where: { email: data.email, id: { not: tenantId } },
      });

      if (existingTenant) {
        throw new ConflictError('DUPLICATE_ENTRY', 'A tenant with this email already exists');
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        legalName: data.legalName,
        email: data.email,
        phone: data.phone,
        logoUrl: data.logoUrl,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
      },
    });

    return updatedTenant;
  }

  /**
   * Update branch
   */
  async updateBranch(branchId: string, data: UpdateBranchBody) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode || null,
        phone: data.phone || null,
        email: data.email || null,
        gstin: data.gstin,
        isActive: data.isActive,
      },
    });

    return updatedBranch;
  }

  /**
   * Update super owner
   */
  async updateSuperOwner(userId: string, data: UpdateSuperOwnerBody) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    // Check if email is being changed and already exists for this tenant
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          email: data.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new ConflictError('DUPLICATE_ENTRY', 'A user with this email already exists');
      }
    }

    // Check if phone is being changed and already exists for this tenant
    if (data.phone && data.phone !== user.phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          phone: data.phone,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new ConflictError('DUPLICATE_ENTRY', 'A user with this phone already exists');
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        ...(passwordHash && { passwordHash }),
        isActive: data.isActive,
      },
    });

    return updatedUser;
  }

  /**
   * Get loyalty config for a tenant
   */
  async getLoyaltyConfig(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    let config = await prisma.loyaltyConfig.findUnique({
      where: { tenantId },
    });

    // Create default config if not exists
    if (!config) {
      config = await prisma.loyaltyConfig.create({
        data: {
          tenantId,
          pointsPerUnit: 0.01,
          redemptionValuePerPoint: 1,
          expiryDays: 365,
          isEnabled: true,
        },
      });
    }

    return config;
  }

  /**
   * Update loyalty config for a tenant
   */
  async updateLoyaltyConfig(tenantId: string, data: UpdateLoyaltyConfigBody) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    const config = await prisma.loyaltyConfig.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        isEnabled: data.isEnabled ?? true,
        pointsPerUnit: data.pointsPerUnit ?? 0.01,
        redemptionValuePerPoint: data.redemptionValuePerPoint ?? 1,
        expiryDays: data.expiryDays ?? 365,
      },
    });

    return config;
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }
}

export const internalService = new InternalService();
