/**
 * Stations Service
 * Business logic for station management
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../../lib/errors';

import type { Prisma, Station } from '@prisma/client';
import type {
  CreateStationBody,
  UpdateStationBody,
  BulkCreateStationsBody,
  StationQuery,
} from './stations.schema';

export class StationsService {
  /**
   * Get all stations for a branch
   */
  async getStations(tenantId: string, branchId: string, query: StationQuery): Promise<Station[]> {
    const where: Prisma.StationWhereInput = {
      tenantId,
      branchId,
    };

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.stationTypeId) {
      where.stationTypeId = query.stationTypeId;
    }

    return prisma.station.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        stationType: true,
      },
    });
  }

  /**
   * Get a single station by ID
   */
  async getStationById(tenantId: string, id: string): Promise<Station> {
    const station = await prisma.station.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        stationType: true,
      },
    });

    if (!station) {
      throw new NotFoundError('STATION_NOT_FOUND', 'Station not found');
    }

    return station;
  }

  /**
   * Create a new station
   */
  async createStation(
    tenantId: string,
    branchId: string,
    data: CreateStationBody
  ): Promise<Station> {
    // Verify station type exists and belongs to tenant
    const stationType = await prisma.stationType.findFirst({
      where: { id: data.stationTypeId, tenantId },
    });

    if (!stationType) {
      throw new BadRequestError('STATION_TYPE_NOT_FOUND', 'Station type not found');
    }

    // Check for duplicate name in branch
    const existing = await prisma.station.findFirst({
      where: {
        branchId,
        name: data.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        'DUPLICATE_NAME',
        'Station with this name already exists in this branch'
      );
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.station.aggregate({
        where: { branchId, deletedAt: null },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.station.create({
      data: {
        tenantId,
        branchId,
        stationTypeId: data.stationTypeId,
        name: data.name,
        displayOrder,
        notes: data.notes,
        status: 'active',
      },
      include: {
        stationType: true,
      },
    });
  }

  /**
   * Bulk create stations
   */
  async bulkCreateStations(
    tenantId: string,
    branchId: string,
    data: BulkCreateStationsBody
  ): Promise<Station[]> {
    const createdStations: Station[] = [];

    // Get current max display order
    const maxOrder = await prisma.station.aggregate({
      where: { branchId, deletedAt: null },
      _max: { displayOrder: true },
    });
    let currentOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    for (const item of data.stations) {
      // Verify station type exists
      const stationType = await prisma.stationType.findFirst({
        where: { id: item.stationTypeId, tenantId },
      });

      if (!stationType) {
        throw new BadRequestError(
          'STATION_TYPE_NOT_FOUND',
          `Station type ${item.stationTypeId} not found`
        );
      }

      // Get existing station count for this type in branch to determine naming
      const existingCount = await prisma.station.count({
        where: {
          branchId,
          stationTypeId: item.stationTypeId,
          deletedAt: null,
        },
      });

      // Create stations with auto-generated names
      for (let i = 0; i < item.count; i++) {
        const stationNumber = existingCount + i + 1;
        const name = `${stationType.name} ${stationNumber}`;

        // Check if name already exists (edge case)
        const existing = await prisma.station.findFirst({
          where: { branchId, name, deletedAt: null },
        });

        const finalName = existing ? `${name} (${Date.now()})` : name;

        const station = await prisma.station.create({
          data: {
            tenantId,
            branchId,
            stationTypeId: item.stationTypeId,
            name: finalName,
            displayOrder: currentOrder++,
            status: 'active',
          },
          include: {
            stationType: true,
          },
        });

        createdStations.push(station);
      }
    }

    return createdStations;
  }

  /**
   * Update a station
   */
  async updateStation(tenantId: string, id: string, data: UpdateStationBody): Promise<Station> {
    const existing = await prisma.station.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('STATION_NOT_FOUND', 'Station not found');
    }

    // Check name uniqueness if changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.station.findFirst({
        where: {
          branchId: existing.branchId,
          name: data.name,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new ConflictError(
          'DUPLICATE_NAME',
          'Station with this name already exists in this branch'
        );
      }
    }

    // Verify station type if changed
    if (data.stationTypeId && data.stationTypeId !== existing.stationTypeId) {
      const stationType = await prisma.stationType.findFirst({
        where: { id: data.stationTypeId, tenantId },
      });

      if (!stationType) {
        throw new BadRequestError('STATION_TYPE_NOT_FOUND', 'Station type not found');
      }
    }

    return prisma.station.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.stationTypeId !== undefined && { stationTypeId: data.stationTypeId }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        stationType: true,
      },
    });
  }

  /**
   * Delete a station (soft delete)
   */
  async deleteStation(tenantId: string, id: string): Promise<void> {
    const station = await prisma.station.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        appointments: {
          where: {
            status: { in: ['checked_in', 'in_progress'] },
          },
          take: 1,
        },
      },
    });

    if (!station) {
      throw new NotFoundError('STATION_NOT_FOUND', 'Station not found');
    }

    // Prevent deletion if station has active appointments
    if (station.appointments.length > 0) {
      throw new ConflictError(
        'STATION_HAS_APPOINTMENT',
        'Cannot delete station with active appointments'
      );
    }

    await prisma.station.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const stationsService = new StationsService();
