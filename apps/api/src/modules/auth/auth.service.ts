/**
 * Auth Service
 * Business logic for authentication
 */

import bcrypt from 'bcrypt';

import { ROLE_PERMISSIONS, type UserRole } from '@trimio/shared';

import { prisma } from '../../lib/prisma';
import { BadRequestError } from '../../lib/errors';

import type { LoginBody, RegisterBody } from './auth.schema';

export class AuthService {
  /**
   * Login with email/phone and password
   */
  async login(data: LoginBody) {
    const { email, phone, password } = data;

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as {
          email?: string;
          phone?: string;
        }[],
        isActive: true,
        deletedAt: null,
      },
      include: {
        tenant: true,
        branchAssignments: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new BadRequestError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get branch IDs from explicit assignments (DB is source of truth)
    const branchIds = user.branchAssignments.map((ba) => ba.branchId);

    // Get permissions for user's role
    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        branchIds,
        permissions,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        logoUrl: user.tenant.logoUrl,
      },
    };
  }

  /**
   * Register a new tenant with owner
   */
  async register(data: RegisterBody) {
    const { businessName, email, phone, password, name } = data;

    // Check if email/phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestError(
        'DUPLICATE_ENTRY',
        'This email or phone number is already registered.'
      );
    }

    // Create tenant and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug: this.generateSlug(businessName),
          email,
          phone,
        },
      });

      // Create default branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Branch',
          slug: 'main-branch',
          isActive: true,
        },
      });

      // Create owner user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          phone,
          name,
          passwordHash,
          role: 'super_owner',
          isActive: true,
          branchAssignments: {
            create: {
              branchId: branch.id,
              isPrimary: true,
            },
          },
        },
      });

      return { tenant, branch, user };
    });

    // Get permissions for user's role (super_owner)
    const permissions = ROLE_PERMISSIONS[result.user.role as UserRole] || [];

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.phone,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        branchIds: [result.branch.id],
        permissions,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        branchAssignments: true,
      },
    });
  }

  /**
   * Generate URL-safe slug from business name
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }
}

export const authService = new AuthService();
