/**
 * Combos Service
 * Business logic for combo service management
 */

import { prisma } from '../../lib/prisma';

import type { ComboService, ComboServiceItem, Prisma } from '@prisma/client';
import type { CreateComboBody, UpdateComboBody } from './services.schema';

interface ComboWithItems extends ComboService {
  items: Array<
    ComboServiceItem & {
      service: {
        id: string;
        sku: string;
        name: string;
        basePrice: Prisma.Decimal;
        durationMinutes: number;
      };
    }
  >;
}

export class CombosService {
  /**
   * Get all combos for a tenant
   */
  async getCombos(tenantId: string, includeInactive = false): Promise<ComboWithItems[]> {
    const where: Record<string, unknown> = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.comboService.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            service: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
          },
        },
      },
    }) as Promise<ComboWithItems[]>;
  }

  /**
   * Get a single combo by ID
   */
  async getComboById(tenantId: string, comboId: string): Promise<ComboWithItems | null> {
    return prisma.comboService.findFirst({
      where: { id: comboId, tenantId },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            service: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
          },
        },
      },
    }) as Promise<ComboWithItems | null>;
  }

  /**
   * Create a new combo
   */
  async createCombo(
    tenantId: string,
    data: CreateComboBody,
    createdBy?: string
  ): Promise<ComboWithItems> {
    // Check for duplicate SKU
    const existingSku = await prisma.comboService.findUnique({
      where: { tenantId_sku: { tenantId, sku: data.sku } },
    });

    if (existingSku) {
      throw new Error('Combo with this SKU already exists');
    }

    // Verify all services belong to tenant
    const serviceIds = data.items.map((i) => i.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId, deletedAt: null },
      select: { id: true, basePrice: true, durationMinutes: true },
    });

    if (services.length !== serviceIds.length) {
      throw new Error('Some services not found');
    }

    // Calculate original price and total duration
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    let originalPrice = 0;
    let totalDuration = 0;

    for (const item of data.items) {
      const service = serviceMap.get(item.serviceId)!;
      originalPrice += Number(service.basePrice) * (item.quantity || 1);
      totalDuration += service.durationMinutes * (item.quantity || 1);
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.comboService.aggregate({
        where: { tenantId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    // Create combo with items
    const combo = await prisma.comboService.create({
      data: {
        tenantId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        comboPrice: data.comboPrice,
        originalPrice,
        taxRate: data.taxRate,
        totalDurationMinutes: totalDuration,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        imageUrl: data.imageUrl,
        displayOrder,
        isActive: data.isActive,
        createdBy,
        items: {
          create: data.items.map((item, index) => ({
            tenantId,
            serviceId: item.serviceId,
            quantity: item.quantity || 1,
            displayOrder: item.displayOrder ?? index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            service: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
          },
        },
      },
    });

    return combo as ComboWithItems;
  }

  /**
   * Update a combo
   */
  async updateCombo(
    tenantId: string,
    comboId: string,
    data: UpdateComboBody
  ): Promise<ComboWithItems> {
    const existing = await prisma.comboService.findFirst({
      where: { id: comboId, tenantId },
    });

    if (!existing) {
      throw new Error('Combo not found');
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.comboService.findFirst({
        where: {
          tenantId,
          sku: data.sku,
          id: { not: comboId },
        },
      });
      if (duplicate) {
        throw new Error('Combo with this SKU already exists');
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.items;

    // Convert date strings to Date objects
    if (data.validFrom !== undefined) {
      updateData.validFrom = data.validFrom ? new Date(data.validFrom) : null;
    }
    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    }

    // Update items if provided
    if (data.items) {
      // Verify all services belong to tenant
      const serviceIds = data.items.map((i) => i.serviceId);
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId, deletedAt: null },
        select: { id: true, basePrice: true, durationMinutes: true },
      });

      if (services.length !== serviceIds.length) {
        throw new Error('Some services not found');
      }

      // Calculate original price and total duration
      const serviceMap = new Map(services.map((s) => [s.id, s]));
      let originalPrice = 0;
      let totalDuration = 0;

      for (const item of data.items) {
        const service = serviceMap.get(item.serviceId)!;
        originalPrice += Number(service.basePrice) * (item.quantity || 1);
        totalDuration += service.durationMinutes * (item.quantity || 1);
      }

      updateData.originalPrice = originalPrice;
      updateData.totalDurationMinutes = totalDuration;

      // Delete existing items and create new ones
      await prisma.$transaction([
        prisma.comboServiceItem.deleteMany({ where: { comboId } }),
        prisma.comboServiceItem.createMany({
          data: data.items.map((item, index) => ({
            tenantId,
            comboId,
            serviceId: item.serviceId,
            quantity: item.quantity || 1,
            displayOrder: item.displayOrder ?? index,
          })),
        }),
      ]);
    }

    // Update combo
    await prisma.comboService.update({
      where: { id: comboId },
      data: updateData,
    });

    // Return updated combo with items
    return prisma.comboService.findUnique({
      where: { id: comboId },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            service: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
          },
        },
      },
    }) as Promise<ComboWithItems>;
  }

  /**
   * Delete a combo
   */
  async deleteCombo(tenantId: string, comboId: string): Promise<void> {
    const combo = await prisma.comboService.findFirst({
      where: { id: comboId, tenantId },
    });

    if (!combo) {
      throw new Error('Combo not found');
    }

    // Delete items and combo in transaction
    await prisma.$transaction([
      prisma.comboServiceItem.deleteMany({ where: { comboId } }),
      prisma.comboService.delete({ where: { id: comboId } }),
    ]);
  }
}

export const combosService = new CombosService();
