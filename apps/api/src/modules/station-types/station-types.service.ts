/**
 * Station Types Service
 * Business logic for station type management
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../lib/errors';

import type { StationType } from '@prisma/client';
import type { CreateStationTypeBody, UpdateStationTypeBody } from './station-types.schema';

export class StationTypesService {
  /**
   * Get all station types for a tenant
   */
  async getStationTypes(tenantId: string, branchId?: string): Promise<StationType[]> {
    return prisma.stationType.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            stations: branchId
              ? { where: { branchId, deletedAt: null } }
              : { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }) as unknown as StationType[];
  }

  /**
   * Get a single station type by ID
   */
  async getStationTypeById(tenantId: string, id: string): Promise<StationType> {
    const stationType = await prisma.stationType.findFirst({
      where: { id, tenantId },
    });

    if (!stationType) {
      throw new NotFoundError('STATION_TYPE_NOT_FOUND', 'Station type not found');
    }

    return stationType;
  }

  /**
   * Create a new station type
   */
  async createStationType(tenantId: string, data: CreateStationTypeBody): Promise<StationType> {
    // Check for duplicate name
    const existing = await prisma.stationType.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
    });

    if (existing) {
      throw new ConflictError('DUPLICATE_NAME', 'Station type with this name already exists');
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.stationType.aggregate({
        where: { tenantId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.stationType.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color ?? '#6B7280',
        displayOrder,
        isDefault: false,
      },
    });
  }

  /**
   * Update a station type
   */
  async updateStationType(
    tenantId: string,
    id: string,
    data: UpdateStationTypeBody
  ): Promise<StationType> {
    const existing = await prisma.stationType.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('STATION_TYPE_NOT_FOUND', 'Station type not found');
    }

    // Check name uniqueness if changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.stationType.findFirst({
        where: {
          tenantId,
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictError('DUPLICATE_NAME', 'Station type with this name already exists');
      }
    }

    return prisma.stationType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    });
  }

  /**
   * Delete a station type
   */
  async deleteStationType(tenantId: string, id: string): Promise<void> {
    const stationType = await prisma.stationType.findFirst({
      where: { id, tenantId },
      include: {
        stations: {
          where: { deletedAt: null },
          take: 1,
        },
      },
    });

    if (!stationType) {
      throw new NotFoundError('STATION_TYPE_NOT_FOUND', 'Station type not found');
    }

    // Prevent deletion if stations exist
    if (stationType.stations.length > 0) {
      throw new ConflictError(
        'STATION_TYPE_IN_USE',
        'Cannot delete station type with existing stations'
      );
    }

    await prisma.stationType.delete({
      where: { id },
    });
  }
}

export const stationTypesService = new StationTypesService();
