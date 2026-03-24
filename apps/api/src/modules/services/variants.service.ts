/**
 * Variants Service
 * Business logic for service variant management
 */

import { prisma } from '../../lib/prisma';

import type { ServiceVariant } from '@prisma/client';
import type { CreateVariantBody, UpdateVariantBody } from './services.schema';

export class VariantsService {
  /**
   * Get all variants for a service
   */
  async getVariants(tenantId: string, serviceId: string): Promise<ServiceVariant[]> {
    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    return prisma.serviceVariant.findMany({
      where: { serviceId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Create a new variant
   */
  async createVariant(
    tenantId: string,
    serviceId: string,
    data: CreateVariantBody
  ): Promise<ServiceVariant> {
    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.serviceVariant.aggregate({
        where: { serviceId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.serviceVariant.create({
      data: {
        tenantId,
        serviceId,
        name: data.name,
        priceAdjustmentType: data.priceAdjustmentType,
        priceAdjustment: data.priceAdjustment,
        durationAdjustment: data.durationAdjustment,
        displayOrder,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Update a variant
   */
  async updateVariant(
    tenantId: string,
    serviceId: string,
    variantId: string,
    data: UpdateVariantBody
  ): Promise<ServiceVariant> {
    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Verify variant exists
    const variant = await prisma.serviceVariant.findFirst({
      where: { id: variantId, serviceId },
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    return prisma.serviceVariant.update({
      where: { id: variantId },
      data,
    });
  }

  /**
   * Delete a variant
   */
  async deleteVariant(tenantId: string, serviceId: string, variantId: string): Promise<void> {
    // Verify service belongs to tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Verify variant exists
    const variant = await prisma.serviceVariant.findFirst({
      where: { id: variantId, serviceId },
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    await prisma.serviceVariant.delete({
      where: { id: variantId },
    });
  }
}

export const variantsService = new VariantsService();
