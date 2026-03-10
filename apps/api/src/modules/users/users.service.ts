/**
 * Users Service
 * Business logic for user management operations
 */

import bcrypt from 'bcrypt';
import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../../lib/errors';
import { tenantService } from '../tenant/tenant.service';
import type { PaginatedResult } from '../../lib/types';
import type {
  CreateUserBody,
  UpdateUserBody,
  ListUsersQuery,
  ChangePasswordBody,
} from './users.schema';

export class UsersService {
  /**
   * List users with pagination
   */
  async listUsers(tenantId: string, query: ListUsersQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, branchId, role, search, isActive } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If filtering by branch, join with userBranches
    if (branchId) {
      where.branchAssignments = {
        some: { branchId },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          gender: true,
          isActive: true,
          createdAt: true,
          branchAssignments: {
            select: {
              branchId: true,
              isPrimary: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: serializeDecimals(users) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user by ID
   */
  async getUserById(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        gender: true,
        isActive: true,
        createdAt: true,
        branchAssignments: {
          select: {
            branchId: true,
            isPrimary: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  /**
   * Create a new user
   */
  async createUser(tenantId: string, data: CreateUserBody, _createdBy: string) {
    // Check user limit
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { subscriptionPlan: true },
    });

    if (!tenant) {
      throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
    }

    const limits = tenantService.getPlanLimits(tenant.subscriptionPlan);
    const currentUserCount = await prisma.user.count({
      where: { tenantId, deletedAt: null },
    });

    if (currentUserCount >= limits.users) {
      throw new ForbiddenError(
        'User limit reached. Please upgrade your plan.',
        'USER_LIMIT_REACHED'
      );
    }

    // Check for duplicate phone
    const existingPhone = await prisma.user.findFirst({
      where: {
        tenantId,
        phone: data.phone,
        deletedAt: null,
      },
    });

    if (existingPhone) {
      throw new ConflictError('DUPLICATE_PHONE', 'Phone number already registered');
    }

    // Check for duplicate email if provided
    if (data.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          tenantId,
          email: data.email,
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new ConflictError('DUPLICATE_EMAIL', 'Email already registered');
      }
    }

    // Verify all branch IDs belong to tenant
    const branchIds = data.branchAssignments.map((b) => b.branchId);
    const validBranches = await prisma.branch.count({
      where: {
        id: { in: branchIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (validBranches !== branchIds.length) {
      throw new BadRequestError('INVALID_BRANCH', 'One or more branch IDs are invalid');
    }

    // Ensure exactly one primary branch
    const primaryCount = data.branchAssignments.filter((b) => b.isPrimary).length;
    if (primaryCount === 0) {
      // Set first branch as primary
      data.branchAssignments[0].isPrimary = true;
    } else if (primaryCount > 1) {
      throw new BadRequestError(
        'MULTIPLE_PRIMARY_BRANCHES',
        'Only one branch can be marked as primary'
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user with branch assignments
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        passwordHash,
        role: data.role,
        gender: data.gender,
        isActive: true,
        branchAssignments: {
          create: data.branchAssignments.map((b) => ({
            branchId: b.branchId,
            isPrimary: b.isPrimary,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        gender: true,
        isActive: true,
        createdAt: true,
        branchAssignments: {
          select: {
            branchId: true,
            isPrimary: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  /**
   * Update a user
   */
  async updateUser(tenantId: string, userId: string, data: UpdateUserBody, _updatedBy: string) {
    // Verify user exists
    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    // Check if trying to change role of last super_owner
    // Note: data.role can only be non-super_owner roles (from schema), so if existing is super_owner
    // and we're changing the role, we need to check if this is the last super_owner
    if (data.role && existing.role === 'super_owner') {
      const superOwnerCount = await prisma.user.count({
        where: {
          tenantId,
          role: 'super_owner',
          deletedAt: null,
        },
      });

      if (superOwnerCount <= 1) {
        throw new BadRequestError(
          'CANNOT_CHANGE_LAST_SUPER_OWNER',
          'Cannot change role of the last super owner'
        );
      }
    }

    // Check for duplicate email if changing
    if (data.email && data.email !== existing.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          tenantId,
          email: data.email,
          deletedAt: null,
          id: { not: userId },
        },
      });

      if (existingEmail) {
        throw new ConflictError('DUPLICATE_EMAIL', 'Email already registered');
      }
    }

    // Handle branch assignments update
    if (data.branchAssignments) {
      // Verify all branch IDs belong to tenant
      const branchIds = data.branchAssignments.map((b) => b.branchId);
      const validBranches = await prisma.branch.count({
        where: {
          id: { in: branchIds },
          tenantId,
          deletedAt: null,
        },
      });

      if (validBranches !== branchIds.length) {
        throw new BadRequestError('INVALID_BRANCH', 'One or more branch IDs are invalid');
      }

      // Ensure exactly one primary branch
      const primaryCount = data.branchAssignments.filter((b) => b.isPrimary).length;
      if (primaryCount === 0) {
        data.branchAssignments[0].isPrimary = true;
      } else if (primaryCount > 1) {
        throw new BadRequestError(
          'MULTIPLE_PRIMARY_BRANCHES',
          'Only one branch can be marked as primary'
        );
      }

      // Delete existing assignments and create new ones
      await prisma.userBranch.deleteMany({
        where: { userId },
      });

      await prisma.userBranch.createMany({
        data: data.branchAssignments.map((b) => ({
          userId,
          branchId: b.branchId,
          isPrimary: b.isPrimary,
        })),
      });
    }

    // Update user (excluding branchAssignments which is handled above)
    const { branchAssignments: _, ...updateData } = data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        gender: true,
        isActive: true,
        createdAt: true,
        branchAssignments: {
          select: {
            branchId: true,
            isPrimary: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  /**
   * Delete (soft delete) a user
   */
  async deleteUser(tenantId: string, userId: string, deletedBy: string) {
    // Prevent self-delete
    if (userId === deletedBy) {
      throw new BadRequestError('CANNOT_DELETE_SELF', 'Cannot delete your own account');
    }

    // Verify user exists
    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    // Check if trying to delete last super_owner
    if (existing.role === 'super_owner') {
      const superOwnerCount = await prisma.user.count({
        where: {
          tenantId,
          role: 'super_owner',
          deletedAt: null,
        },
      });

      if (superOwnerCount <= 1) {
        throw new BadRequestError(
          'CANNOT_DELETE_LAST_SUPER_OWNER',
          'Cannot delete the last super owner'
        );
      }
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Change user's own password
   */
  async changePassword(tenantId: string, userId: string, data: ChangePasswordBody) {
    // Get user with password hash
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new BadRequestError('INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // Update password and invalidate all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);
  }
}

export const usersService = new UsersService();
