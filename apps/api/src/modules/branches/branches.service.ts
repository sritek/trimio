/**
 * Branch Service
 * Business logic for branch operations
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { UpdateBranchBody } from './branches.schema';

export class BranchesService {
  /**
   * Get branches by IDs for a tenant
   * Only returns branches the user has access to
   */
  async getBranchesByIds(tenantId: string, branchIds: string[]) {
    if (branchIds.length === 0) {
      return [];
    }

    const branches = await prisma.branch.findMany({
      where: {
        tenantId,
        id: { in: branchIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstin: true,
        timezone: true,
        currency: true,
        workingHours: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return branches;
  }

  /**
   * Get a single branch by ID
   */
  async getBranchById(tenantId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstin: true,
        timezone: true,
        currency: true,
        workingHours: true,
        isActive: true,
      },
    });

    return branch;
  }

  /**
   * Update a branch
   */
  async updateBranch(
    tenantId: string,
    branchId: string,
    data: UpdateBranchBody,
    _updatedBy: string
  ) {
    // Verify branch exists and belongs to tenant
    const existing = await prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    // Prepare update data - handle workingHours separately for Prisma JSON type
    const { workingHours, ...restData } = data;
    const updateData: any = {
      ...restData,
      updatedAt: new Date(),
    };

    // Only include workingHours if it's provided
    if (workingHours !== undefined) {
      updateData.workingHours = workingHours;
    }

    // Update branch
    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstin: true,
        timezone: true,
        currency: true,
        workingHours: true,
        isActive: true,
      },
    });

    return updated;
  }
}

export const branchesService = new BranchesService();
