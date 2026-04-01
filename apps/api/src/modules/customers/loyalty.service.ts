/**
 * Loyalty Service
 * Business logic for loyalty points management
 */

import { prisma } from '../../lib/prisma';

import type { LoyaltyConfig, AdjustLoyaltyBody, LoyaltyQuery } from './customers.schema';

export class LoyaltyService {
  /**
   * Get loyalty configuration for a tenant
   */
  async getLoyaltyConfig(tenantId: string) {
    let config = await prisma.loyaltyConfig.findUnique({
      where: { tenantId },
    });

    // Create default config if not exists
    if (!config) {
      config = await prisma.loyaltyConfig.create({
        data: {
          tenantId,
          pointsPerUnit: 0.01,
          redemptionValuePerPoint: 1, // 1 point = ₹1
          expiryDays: 365,
          isEnabled: true,
        },
      });
    }

    return config;
  }

  /**
   * Update loyalty configuration
   */
  async updateLoyaltyConfig(tenantId: string, data: Partial<LoyaltyConfig>) {
    return prisma.loyaltyConfig.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      },
    });
  }

  /**
   * Get loyalty balance and transaction history
   */
  async getLoyaltyBalance(tenantId: string, customerId: string, query: LoyaltyQuery) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const where = { customerId };
    const total = await prisma.loyaltyTransaction.count({ where });

    const transactions = await prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      balance: customer.loyaltyPoints,
      transactions: {
        data: transactions,
        total,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  /**
   * Manually adjust loyalty points (manager action)
   */
  async adjustLoyaltyPoints(
    tenantId: string,
    customerId: string,
    data: AdjustLoyaltyBody,
    adjustedBy: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const pointsChange = data.type === 'credit' ? data.points : -data.points;
    const newBalance = customer.loyaltyPoints + pointsChange;

    if (newBalance < 0) {
      throw new Error('Insufficient points balance');
    }

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'adjusted',
          points: pointsChange,
          balance: newBalance,
          reference: 'Manual adjustment',
          reason: data.reason,
          createdBy: adjustedBy,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: adjustedBy,
          action: 'loyalty.adjusted',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { loyaltyPoints: customer.loyaltyPoints },
          newValues: { loyaltyPoints: newBalance, reason: data.reason },
        },
      }),
    ]);

    return {
      newBalance,
      transaction,
    };
  }

  /**
   * Credit loyalty points (called after bill payment)
   */
  async creditLoyaltyPoints(
    tenantId: string,
    customerId: string,
    billAmount: number,
    billId: string,
    createdBy?: string
  ) {
    const config = await this.getLoyaltyConfig(tenantId);
    if (!config.isEnabled) return null;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) return null;

    const pointsEarned = Math.floor(billAmount * Number(config.pointsPerUnit));
    if (pointsEarned <= 0) return null;

    const newBalance = customer.loyaltyPoints + pointsEarned;

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'earned',
          points: pointsEarned,
          balance: newBalance,
          reference: `Bill #${billId}`,
          createdBy,
        },
      }),
    ]);

    return transaction;
  }

  /**
   * Redeem loyalty points (called during billing)
   */
  async redeemLoyaltyPoints(
    tenantId: string,
    customerId: string,
    points: number,
    billId: string,
    createdBy?: string
  ) {
    const config = await this.getLoyaltyConfig(tenantId);
    if (!config.isEnabled) {
      throw new Error('Loyalty program is not enabled');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.loyaltyPoints < points) {
      throw new Error('Insufficient points balance');
    }

    const newBalance = customer.loyaltyPoints - points;
    const discountValue = points * Number(config.redemptionValuePerPoint);

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'redeemed',
          points: -points,
          balance: newBalance,
          reference: `Bill #${billId}`,
          createdBy,
        },
      }),
    ]);

    return {
      transaction,
      discountValue,
      newBalance,
    };
  }
}

export const loyaltyService = new LoyaltyService();
