/**
 * Billing Service
 * Core business logic for invoice management, payments, and billing operations
 */

import { Prisma, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { env } from '../../config/env';
import { fifoEngine } from '../inventory/fifo-engine';
import { stockService } from '../inventory/stock.service';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  AddItemInput,
  AddPaymentInput,
  FinalizeInvoiceInput,
  CancelInvoiceInput,
  ListInvoicesQuery,
  QuickBillInput,
  CalculateInput,
} from './billing.schema';
import { InvoiceStatus, PaymentStatus } from './billing.schema';

// ============================================
// Types
// ============================================

interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
}

interface StockAvailabilityResult {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  shortfall: number;
}

interface CalculatedItem {
  itemType: string;
  referenceId: string;
  referenceSku?: string;
  name: string;
  description?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  taxRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  netAmount: number;
  hsnSacCode?: string;
  stylistId?: string;
  stylistName?: string;
  assistantId?: string;
  commissionType?: string;
  commissionRate?: number;
  commissionAmount?: number;
}

interface InvoiceCalculation {
  items: CalculatedItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  loyaltyDiscount: number;
  walletUsed: number;
  roundOff: number;
  grandTotal: number;
}

// ============================================
// Invoice Calculator
// ============================================

class InvoiceCalculator {
  /**
   * Calculate invoice totals
   */
  async calculate(
    items: AddItemInput[],
    tenantId: string,
    branchId: string,
    options: {
      isIgst?: boolean;
      loyaltyPointsToRedeem?: number;
      walletAmountToUse?: number;
      membershipId?: string;
      discounts?: Array<{
        discountType: string;
        calculationType: 'percentage' | 'flat';
        calculationValue: number;
        appliedTo: 'subtotal' | 'item';
        appliedItemIndex?: number;
        reason?: string;
      }>;
    } = {}
  ): Promise<InvoiceCalculation> {
    // 1. Fetch service details and calculate item amounts
    const calculatedItems = await this.calculateItems(
      items,
      tenantId,
      branchId,
      options.isIgst || false
    );

    // 2. Calculate subtotal
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0);

    // 3. Apply manual discounts
    let manualDiscountAmount = 0;
    if (options.discounts && options.discounts.length > 0) {
      for (const discount of options.discounts) {
        if (discount.appliedTo === 'subtotal') {
          // Apply to entire subtotal
          if (discount.calculationType === 'percentage') {
            manualDiscountAmount += (subtotal * discount.calculationValue) / 100;
          } else {
            manualDiscountAmount += discount.calculationValue;
          }
        } else if (discount.appliedTo === 'item' && discount.appliedItemIndex !== undefined) {
          // Apply to specific item
          const item = calculatedItems[discount.appliedItemIndex];
          if (item) {
            let itemDiscount = 0;
            if (discount.calculationType === 'percentage') {
              itemDiscount = (item.grossAmount * discount.calculationValue) / 100;
            } else {
              itemDiscount = discount.calculationValue;
            }
            item.discountAmount += itemDiscount;
            manualDiscountAmount += itemDiscount;
          }
        }
      }
      // Cap discount at subtotal
      manualDiscountAmount = Math.min(manualDiscountAmount, subtotal);
    }

    // 4. Calculate total discount (item-level + manual)
    const itemLevelDiscount = calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const discountAmount = itemLevelDiscount + (manualDiscountAmount - itemLevelDiscount);

    // 5. Calculate taxable amount
    const taxableAmount = subtotal - discountAmount;

    // 6. Calculate taxes
    const cgstAmount = calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgstAmount = calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igstAmount = calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0);
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    // 7. Apply loyalty discount
    let loyaltyDiscount = 0;
    if (options.loyaltyPointsToRedeem && options.loyaltyPointsToRedeem > 0) {
      const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
        where: { tenantId },
      });
      if (loyaltyConfig && loyaltyConfig.isEnabled) {
        loyaltyDiscount =
          options.loyaltyPointsToRedeem * Number(loyaltyConfig.redemptionValuePerPoint);
      }
    }

    // 8. Calculate grand total before wallet
    let grandTotal = taxableAmount + totalTax - loyaltyDiscount;

    // 9. Apply wallet
    let walletUsed = 0;
    if (options.walletAmountToUse && options.walletAmountToUse > 0) {
      walletUsed = Math.min(options.walletAmountToUse, grandTotal);
      grandTotal -= walletUsed;
    }

    // 10. Round off to nearest rupee
    const roundOff = this.calculateRoundOff(grandTotal);
    grandTotal = Math.round(grandTotal);

    return {
      items: calculatedItems,
      subtotal: this.round(subtotal),
      discountAmount: this.round(discountAmount),
      taxableAmount: this.round(taxableAmount),
      cgstAmount: this.round(cgstAmount),
      sgstAmount: this.round(sgstAmount),
      igstAmount: this.round(igstAmount),
      totalTax: this.round(totalTax),
      loyaltyDiscount: this.round(loyaltyDiscount),
      walletUsed: this.round(walletUsed),
      roundOff: this.round(roundOff),
      grandTotal,
    };
  }

  /**
   * Calculate individual items with pricing from database
   */
  private async calculateItems(
    items: AddItemInput[],
    tenantId: string,
    branchId: string,
    isIgst: boolean
  ): Promise<CalculatedItem[]> {
    const calculatedItems: CalculatedItem[] = [];

    // Collect all stylist IDs to fetch names in one query
    const stylistIds = items
      .filter((item) => item.stylistId)
      .map((item) => item.stylistId as string);
    const uniqueStylistIds = [...new Set(stylistIds)];

    // Fetch stylist names
    const stylists =
      uniqueStylistIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: uniqueStylistIds }, tenantId },
            select: { id: true, name: true },
          })
        : [];
    const stylistMap = new Map(stylists.map((s) => [s.id, s.name]));

    for (const item of items) {
      if (item.itemType === 'service') {
        const service = await prisma.service.findFirst({
          where: { id: item.referenceId, tenantId, deletedAt: null },
          include: {
            branchPrices: { where: { branchId } },
          },
        });

        if (!service) {
          throw new NotFoundError('SERVICE_NOT_FOUND', `Service ${item.referenceId} not found`);
        }

        // Get price (branch override or base price)
        const branchPrice = service.branchPrices[0];
        const unitPrice = branchPrice?.price
          ? Number(branchPrice.price)
          : Number(service.basePrice);
        const quantity = item.quantity || 1;
        const grossAmount = unitPrice * quantity;
        const taxRate = Number(service.taxRate);

        // Calculate tax - handle tax-inclusive pricing
        let taxableAmount: number;
        let taxAmount: number;

        if (service.isTaxInclusive) {
          // Tax is already included in the price - no additional tax
          taxableAmount = grossAmount;
          taxAmount = 0;
        } else {
          // Tax is additional
          taxableAmount = grossAmount;
          taxAmount = taxableAmount * (taxRate / 100);
        }

        let cgstRate = 0,
          cgstAmount = 0,
          sgstRate = 0,
          sgstAmount = 0,
          igstRate = 0,
          igstAmount = 0;

        if (isIgst) {
          igstRate = taxRate;
          igstAmount = taxAmount;
        } else {
          cgstRate = taxRate / 2;
          sgstRate = taxRate / 2;
          cgstAmount = taxAmount / 2;
          sgstAmount = taxAmount / 2;
        }

        // Commission
        const commissionType = branchPrice?.commissionType || service.commissionType;
        const commissionValue = branchPrice?.commissionValue
          ? Number(branchPrice.commissionValue)
          : Number(service.commissionValue);
        let commissionAmount = 0;
        if (commissionType === 'percentage') {
          commissionAmount = (taxableAmount * commissionValue) / 100;
        } else if (commissionType === 'flat') {
          commissionAmount = commissionValue * quantity;
        }

        // Get stylist name
        const stylistName = item.stylistId ? stylistMap.get(item.stylistId) : undefined;

        calculatedItems.push({
          itemType: 'service',
          referenceId: service.id,
          referenceSku: service.sku,
          name: service.name,
          description: service.description || undefined,
          unitPrice,
          quantity,
          grossAmount,
          discountAmount: 0,
          taxRate,
          taxableAmount,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          totalTax: taxAmount,
          netAmount: taxableAmount + taxAmount,
          stylistId: item.stylistId,
          stylistName,
          assistantId: item.assistantId,
          commissionType,
          commissionRate: commissionValue,
          commissionAmount,
        });
      } else if (item.itemType === 'product') {
        // Calculate product item
        const calculatedProduct = await this.calculateProductItem(item, tenantId, branchId, isIgst);
        calculatedItems.push(calculatedProduct);
      }
      // TODO: Add support for combo, package item types
    }

    return calculatedItems;
  }

  /**
   * Calculate a product item with pricing from database
   * Requirements: 1.1, 1.2, 1.3, 1.5
   */
  private async calculateProductItem(
    item: AddItemInput,
    tenantId: string,
    branchId: string,
    isIgst: boolean
  ): Promise<CalculatedItem> {
    // Fetch product with branch settings
    const product = await prisma.product.findFirst({
      where: { id: item.referenceId, tenantId, deletedAt: null },
      include: {
        branchSettings: { where: { branchId } },
      },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product ${item.referenceId} not found`);
    }

    // Get price (branch override or default selling price)
    const branchSettings = product.branchSettings[0];
    const unitPrice = branchSettings?.sellingPriceOverride
      ? Number(branchSettings.sellingPriceOverride)
      : Number(product.defaultSellingPrice);

    const quantity = item.quantity || 1;
    const grossAmount = unitPrice * quantity;
    const taxRate = Number(product.taxRate);

    // Calculate tax
    const taxableAmount = grossAmount;
    const taxAmount = taxableAmount * (taxRate / 100);

    // GST split
    let cgstRate = 0,
      cgstAmount = 0,
      sgstRate = 0,
      sgstAmount = 0,
      igstRate = 0,
      igstAmount = 0;

    if (isIgst) {
      igstRate = taxRate;
      igstAmount = taxAmount;
    } else {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmount = taxAmount / 2;
      sgstAmount = taxAmount / 2;
    }

    // Products don't have commission configuration in the current schema
    // Commission for product sales can be added later if needed
    const commissionType = undefined;
    const commissionValue = 0;
    const commissionAmount = 0;

    return {
      itemType: 'product',
      referenceId: product.id,
      referenceSku: product.sku || undefined,
      name: product.name,
      description: product.description || undefined,
      unitPrice,
      quantity,
      grossAmount,
      discountAmount: 0,
      taxRate,
      taxableAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax: taxAmount,
      netAmount: taxableAmount + taxAmount,
      hsnSacCode: product.hsnCode || undefined,
      // Products don't require stylistId or assistantId (Requirement 1.4)
      commissionType,
      commissionRate: commissionValue,
      commissionAmount,
    };
  }

  private calculateRoundOff(amount: number): number {
    const rounded = Math.round(amount);
    return this.round(rounded - amount);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

const calculator = new InvoiceCalculator();

// ============================================
// Billing Service
// ============================================

export const billingService = {
  /**
   * Create a new invoice (draft)
   */
  async createInvoice(input: CreateInvoiceInput, ctx: TenantContext) {
    const { tenantId, userId } = ctx;
    const branchId = input.branchId;

    // Get customer info if customerId provided
    let customerName = input.customerName || 'Guest';
    let customerPhone = input.customerPhone;
    let customerEmail = input.customerEmail;

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, tenantId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      customerName = customer.name;
      customerPhone = customer.phone;
      customerEmail = customer.email || undefined;
    }

    // Calculate invoice with discounts
    const calculation = await calculator.calculate(input.items, tenantId, branchId, {
      isIgst: !!input.placeOfSupply,
      loyaltyPointsToRedeem: input.redeemLoyaltyPoints,
      walletAmountToUse: input.useWalletAmount,
      discounts: input.discounts,
    });

    // Create invoice with items and discounts
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        branchId,
        customerId: input.customerId,
        customerName,
        customerPhone,
        customerEmail,
        appointmentId: input.appointmentId,
        subtotal: calculation.subtotal,
        discountAmount: calculation.discountAmount,
        taxableAmount: calculation.taxableAmount,
        cgstAmount: calculation.cgstAmount,
        sgstAmount: calculation.sgstAmount,
        igstAmount: calculation.igstAmount,
        totalTax: calculation.totalTax,
        roundOff: calculation.roundOff,
        grandTotal: calculation.grandTotal,
        loyaltyPointsRedeemed: input.redeemLoyaltyPoints || 0,
        loyaltyDiscount: calculation.loyaltyDiscount,
        walletAmountUsed: calculation.walletUsed,
        gstin: input.gstin,
        placeOfSupply: input.placeOfSupply,
        isIgst: !!input.placeOfSupply,
        amountDue: calculation.grandTotal,
        notes: input.notes,
        createdBy: userId,
        items: {
          create: calculation.items.map((item, index) => ({
            tenantId,
            itemType: item.itemType,
            referenceId: item.referenceId,
            referenceSku: item.referenceSku,
            name: item.name,
            description: item.description,
            variantName: item.variantName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            grossAmount: item.grossAmount,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            taxableAmount: item.taxableAmount,
            cgstRate: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstRate: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstRate: item.igstRate,
            igstAmount: item.igstAmount,
            totalTax: item.totalTax,
            netAmount: item.netAmount,
            hsnSacCode: item.hsnSacCode,
            stylistId: item.stylistId,
            stylistName: item.stylistName,
            assistantId: item.assistantId,
            commissionType: item.commissionType,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            displayOrder: index,
          })),
        },
        // Create discount records if any discounts were applied
        ...(input.discounts && input.discounts.length > 0
          ? {
              discounts: {
                create: input.discounts.map((discount) => {
                  // Calculate the actual discount amount for this discount
                  let discountAmount = 0;
                  if (discount.appliedTo === 'subtotal') {
                    if (discount.calculationType === 'percentage') {
                      discountAmount = (calculation.subtotal * discount.calculationValue) / 100;
                    } else {
                      discountAmount = discount.calculationValue;
                    }
                  } else if (
                    discount.appliedTo === 'item' &&
                    discount.appliedItemIndex !== undefined
                  ) {
                    const item = calculation.items[discount.appliedItemIndex];
                    if (item) {
                      if (discount.calculationType === 'percentage') {
                        discountAmount = (item.grossAmount * discount.calculationValue) / 100;
                      } else {
                        discountAmount = discount.calculationValue;
                      }
                    }
                  }

                  return {
                    tenantId,
                    discountType: discount.discountType,
                    discountSource: discount.discountSource,
                    discountName: discount.reason || `${discount.discountType} discount`,
                    calculationType: discount.calculationType,
                    calculationValue: discount.calculationValue,
                    appliedTo: discount.appliedTo,
                    discountAmount: Math.round(discountAmount * 100) / 100,
                    requiresApproval: false,
                    createdBy: userId,
                  };
                }),
              },
            }
          : {}),
      },
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });

    return invoice;
  },

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string, tenantId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        discounts: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    return invoice;
  },

  /**
   * List invoices with filters
   */
  async listInvoices(query: ListInvoicesQuery, ctx: TenantContext) {
    const { tenantId, branchId: userBranchId } = ctx;
    const {
      branchId,
      status,
      paymentStatus,
      customerId,
      stylistId,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userBranchId && !branchId && { branchId: userBranchId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(customerId && { customerId }),
      ...(stylistId && { items: { some: { stylistId } } }),
      ...(dateFrom && { invoiceDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { invoiceDate: { lte: new Date(dateTo) } }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: { select: { id: true, name: true, netAmount: true, stylistId: true, stylistName: true, commissionAmount: true } },
          payments: { select: { id: true, paymentMethod: true, amount: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        // TODO: debug this properly
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Update draft invoice
   */
  async updateInvoice(id: string, input: UpdateInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(id, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    return prisma.invoice.update({
      where: { id },
      data: input,
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });
  },

  /**
   * Validate stock availability for a product
   * Requirements: 2.1, 2.2, 2.3
   */
  async validateProductStock(
    branchId: string,
    productId: string,
    quantity: number
  ): Promise<StockAvailabilityResult> {
    const availability = await fifoEngine.checkAvailability(branchId, productId, quantity);
    return {
      available: availability.available,
      currentStock: availability.currentStock,
      requestedQuantity: quantity,
      shortfall: availability.shortfall,
    };
  },

  /**
   * Add item to invoice
   */
  async addItem(invoiceId: string, input: AddItemInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    // Validate stock availability for product items (Requirements 2.1, 2.2)
    if (input.itemType === 'product') {
      const stockResult = await this.validateProductStock(
        invoice.branchId,
        input.referenceId,
        input.quantity || 1
      );
      if (!stockResult.available) {
        throw new BadRequestError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product. Available: ${stockResult.currentStock}, Requested: ${stockResult.requestedQuantity}`
        );
      }
    }

    // Calculate the new item
    const calculation = await calculator.calculate([input], ctx.tenantId, invoice.branchId, {
      isIgst: invoice.isIgst,
    });

    const itemData = calculation.items[0];
    const maxOrder =
      invoice.items.length > 0 ? Math.max(...invoice.items.map((i) => i.displayOrder)) : -1;

    // Create item and update invoice totals
    await prisma.$transaction([
      prisma.invoiceItem.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceId,
          itemType: itemData.itemType,
          referenceId: itemData.referenceId,
          referenceSku: itemData.referenceSku,
          name: itemData.name,
          description: itemData.description,
          unitPrice: itemData.unitPrice,
          quantity: itemData.quantity,
          grossAmount: itemData.grossAmount,
          discountAmount: itemData.discountAmount,
          taxRate: itemData.taxRate,
          taxableAmount: itemData.taxableAmount,
          cgstRate: itemData.cgstRate,
          cgstAmount: itemData.cgstAmount,
          sgstRate: itemData.sgstRate,
          sgstAmount: itemData.sgstAmount,
          igstRate: itemData.igstRate,
          igstAmount: itemData.igstAmount,
          totalTax: itemData.totalTax,
          netAmount: itemData.netAmount,
          hsnSacCode: itemData.hsnSacCode,
          stylistId: itemData.stylistId,
          stylistName: itemData.stylistName,
          assistantId: itemData.assistantId,
          commissionType: itemData.commissionType,
          commissionRate: itemData.commissionRate,
          commissionAmount: itemData.commissionAmount,
          displayOrder: maxOrder + 1,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: { increment: itemData.grossAmount },
          taxableAmount: { increment: itemData.taxableAmount },
          cgstAmount: { increment: itemData.cgstAmount },
          sgstAmount: { increment: itemData.sgstAmount },
          igstAmount: { increment: itemData.igstAmount },
          totalTax: { increment: itemData.totalTax },
          grandTotal: { increment: itemData.netAmount },
          amountDue: { increment: itemData.netAmount },
        },
      }),
    ]);

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Remove item from invoice
   */
  async removeItem(invoiceId: string, itemId: string, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be modified');
    }

    const item = invoice.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError('ITEM_NOT_FOUND', 'Invoice item not found');
    }

    if (invoice.items.length === 1) {
      throw new BadRequestError('LAST_ITEM', 'Cannot remove the last item from invoice');
    }

    await prisma.$transaction([
      prisma.invoiceItem.delete({ where: { id: itemId } }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: { decrement: Number(item.grossAmount) },
          taxableAmount: { decrement: Number(item.taxableAmount) },
          cgstAmount: { decrement: Number(item.cgstAmount) },
          sgstAmount: { decrement: Number(item.sgstAmount) },
          igstAmount: { decrement: Number(item.igstAmount) },
          totalTax: { decrement: Number(item.totalTax) },
          grandTotal: { decrement: Number(item.netAmount) },
          amountDue: { decrement: Number(item.netAmount) },
        },
      }),
    ]);

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Add payment to invoice
   */
  async addPayment(invoiceId: string, input: AddPaymentInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('INVOICE_CANCELLED', 'Cannot add payment to cancelled invoice');
    }

    const totalPayment = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const newAmountPaid = Number(invoice.amountPaid) + totalPayment;
    const newAmountDue = Number(invoice.grandTotal) - newAmountPaid;

    // Allow small tolerance for rounding differences (up to 1 rupee)
    if (newAmountDue < -1) {
      throw new BadRequestError('OVERPAYMENT', 'Payment amount exceeds invoice total');
    }

    // Determine new payment status
    let newPaymentStatus: PrismaPaymentStatus = PrismaPaymentStatus.partial;
    if (newAmountDue <= 0.01) {
      newPaymentStatus = PrismaPaymentStatus.paid;
    } else if (newAmountPaid === 0) {
      newPaymentStatus = PrismaPaymentStatus.pending;
    }

    // Create payments and update invoice
    await prisma.$transaction(async (tx) => {
      for (const payment of input.payments) {
        await tx.payment.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: invoice.branchId,
            invoiceId,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            cardLastFour: payment.cardLastFour,
            cardType: payment.cardType,
            upiId: payment.upiId,
            transactionId: payment.transactionId,
            bankName: payment.bankName,
            chequeNumber: payment.chequeNumber,
            chequeDate: payment.chequeDate ? new Date(payment.chequeDate) : undefined,
            createdBy: ctx.userId,
          },
        });
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          paymentStatus: newPaymentStatus,
        },
      });
    });

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Finalize invoice
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async finalizeInvoice(invoiceId: string, input: FinalizeInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be finalized');
    }

    // If payments provided, add them first
    if (input.payments && input.payments.length > 0) {
      await this.addPayment(invoiceId, { payments: input.payments }, ctx);
    }

    // Refresh invoice after payments
    const updatedInvoice = await this.getInvoice(invoiceId, ctx.tenantId);

    // Validate full payment
    if (Number(updatedInvoice.amountDue) > 0.01) {
      throw new BadRequestError(
        'INSUFFICIENT_PAYMENT',
        `Payment amount is less than invoice total. Due: ${updatedInvoice.amountDue}`
      );
    }

    // Validate stock availability for all product items (Requirement 3.4)
    // Only validate if inventory module is enabled
    const productItems = invoice.items.filter((item) => item.itemType === 'product');
    if (env.ENABLE_INVENTORY) {
      for (const item of productItems) {
        const stockResult = await this.validateProductStock(
          invoice.branchId,
          item.referenceId,
          item.quantity
        );
        if (!stockResult.available) {
          throw new BadRequestError(
            'INSUFFICIENT_STOCK',
            `Insufficient stock for product "${item.name}". Available: ${stockResult.currentStock}, Requested: ${item.quantity}`
          );
        }
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(ctx.tenantId, invoice.branchId);

    // Finalize invoice
    await prisma.$transaction(async (tx) => {
      // Update invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber,
          status: InvoiceStatus.FINALIZED,
          paymentStatus: PaymentStatus.PAID,
          finalizedAt: new Date(),
          finalizedBy: ctx.userId,
        },
      });

      // Deduct stock for product items (Requirements 3.1, 3.2, 3.3)
      // This must happen within the transaction for atomicity (Requirement 3.5)
      // Only deduct if inventory module is enabled
      if (env.ENABLE_INVENTORY) {
        for (const item of productItems) {
          try {
            await stockService.consumeForSale(
              ctx.tenantId,
              invoice.branchId,
              item.referenceId,
              item.quantity,
              invoiceId,
              ctx.userId
            );
          } catch (error) {
            // Re-throw with specific error code for stock consumption failure
            throw new BadRequestError(
              'FINALIZATION_STOCK_ERROR',
              `Failed to deduct stock for product "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      // Handle customer-related operations (loyalty, wallet) with a single fetch
      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });

        const loyaltyConfig = await tx.loyaltyConfig.findUnique({
          where: { tenantId: ctx.tenantId },
        });

        if (customer) {
          let currentLoyaltyPoints = customer.loyaltyPoints;

          // Award loyalty points
          if (loyaltyConfig && loyaltyConfig.isEnabled) {
            const pointsEarned = Math.floor(
              Number(invoice.taxableAmount) * Number(loyaltyConfig.pointsPerUnit)
            );

            if (pointsEarned > 0) {
              currentLoyaltyPoints += pointsEarned;

              await tx.loyaltyTransaction.create({
                data: {
                  tenantId: ctx.tenantId,
                  customerId: invoice.customerId,
                  type: 'earned',
                  points: pointsEarned,
                  balance: currentLoyaltyPoints,
                  reference: `Invoice #${invoiceNumber}`,
                  createdBy: ctx.userId,
                },
              });

              await tx.invoice.update({
                where: { id: invoiceId },
                data: { loyaltyPointsEarned: pointsEarned },
              });
            }
          }

          // Deduct loyalty points if redeemed
          if (Number(invoice.loyaltyPointsRedeemed) > 0) {
            const pointsToDeduct = Number(invoice.loyaltyPointsRedeemed);

            if (currentLoyaltyPoints < pointsToDeduct) {
              throw new BadRequestError(
                'INSUFFICIENT_LOYALTY_POINTS',
                `Customer has ${currentLoyaltyPoints} points but ${pointsToDeduct} are required`
              );
            }

            currentLoyaltyPoints -= pointsToDeduct;

            await tx.loyaltyTransaction.create({
              data: {
                tenantId: ctx.tenantId,
                customerId: invoice.customerId,
                type: 'redeemed',
                points: -pointsToDeduct,
                balance: currentLoyaltyPoints,
                reference: `Invoice #${invoiceNumber}`,
                createdBy: ctx.userId,
              },
            });
          }

          // Update customer loyalty points (single update instead of multiple)
          if (currentLoyaltyPoints !== customer.loyaltyPoints) {
            await tx.customer.update({
              where: { id: invoice.customerId },
              data: { loyaltyPoints: currentLoyaltyPoints },
            });
          }

          // Deduct wallet if used
          if (Number(invoice.walletAmountUsed) > 0) {
            const newWalletBalance =
              Number(customer.walletBalance) - Number(invoice.walletAmountUsed);

            await tx.customer.update({
              where: { id: invoice.customerId },
              data: { walletBalance: newWalletBalance },
            });

            await tx.walletTransaction.create({
              data: {
                tenantId: ctx.tenantId,
                customerId: invoice.customerId,
                type: 'debit',
                amount: -Number(invoice.walletAmountUsed),
                balance: newWalletBalance,
                reference: `Invoice #${invoiceNumber}`,
                createdBy: ctx.userId,
              },
            });
          }
        }
      }

      // Update appointment status if linked
      if (invoice.appointmentId) {
        await tx.appointment.update({
          where: { id: invoice.appointmentId },
          data: {
            status: 'completed',
            actualEndTime: input.completedAt ? new Date(input.completedAt) : new Date(),
          },
        });
      }

      // Create commission records in bulk (single DB call instead of N calls)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const commissionRecords: Prisma.CommissionCreateManyInput[] = [];

      for (const item of invoice.items) {
        if (item.stylistId && item.commissionAmount && Number(item.commissionAmount) > 0) {
          commissionRecords.push({
            tenantId: ctx.tenantId,
            branchId: invoice.branchId,
            userId: item.stylistId,
            invoiceId: invoiceId,
            invoiceItemId: item.id,
            serviceId: item.itemType === 'service' ? item.referenceId : null,
            serviceName: item.name,
            serviceAmount: item.netAmount,
            commissionType: item.commissionType || 'percentage',
            commissionRate: item.commissionRate || 0,
            commissionAmount: item.commissionAmount,
            roleType: 'primary',
            status: 'pending',
            commissionDate: today,
          });
        }

        if (
          item.assistantId &&
          item.assistantCommissionAmount &&
          Number(item.assistantCommissionAmount) > 0
        ) {
          commissionRecords.push({
            tenantId: ctx.tenantId,
            branchId: invoice.branchId,
            userId: item.assistantId,
            invoiceId: invoiceId,
            invoiceItemId: item.id,
            serviceId: item.itemType === 'service' ? item.referenceId : null,
            serviceName: item.name,
            serviceAmount: item.netAmount,
            commissionType: item.commissionType || 'percentage',
            commissionRate: item.commissionRate || 0,
            commissionAmount: item.assistantCommissionAmount,
            roleType: 'assistant',
            status: 'pending',
            commissionDate: today,
          });
        }
      }

      if (commissionRecords.length > 0) {
        await tx.commission.createMany({ data: commissionRecords });
      }
    });

    return this.getInvoice(invoiceId, ctx.tenantId);
  },

  /**
   * Generate sequential invoice number
   * Format: INV-{YYYYMM}-{SEQUENCE}
   */
  async generateInvoiceNumber(_tenantId: string, branchId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}`;

    // Get last invoice number for this branch and month
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        branchId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  },

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string, input: CancelInvoiceInput, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('ALREADY_CANCELLED', 'Invoice is already cancelled');
    }

    if (invoice.status === InvoiceStatus.FINALIZED) {
      throw new BadRequestError(
        'CANNOT_CANCEL_FINALIZED',
        'Finalized invoices cannot be cancelled. Create a credit note instead.'
      );
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: ctx.userId,
        cancellationReason: input.reason,
      },
      include: {
        items: true,
        payments: true,
        discounts: true,
      },
    });
  },

  /**
   * Delete draft invoice
   */
  async deleteInvoice(invoiceId: string, ctx: TenantContext) {
    const invoice = await this.getInvoice(invoiceId, ctx.tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError('INVOICE_NOT_DRAFT', 'Only draft invoices can be deleted');
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });
    return { success: true };
  },

  /**
   * Quick bill - create and finalize in one step
   * If a draft invoice already exists for the appointment, delete it and create a new one
   * to ensure discounts and loyalty points are properly applied
   */
  async quickBill(input: QuickBillInput, ctx: TenantContext) {
    // If there's an existing draft invoice for this appointment, delete it
    // This ensures we always use the latest discounts and loyalty points
    if (input.appointmentId) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          tenantId: ctx.tenantId,
          appointmentId: input.appointmentId,
          status: InvoiceStatus.DRAFT,
        },
      });

      if (existingInvoice) {
        // Delete existing draft invoice and its related records
        await prisma.$transaction([
          prisma.invoiceDiscount.deleteMany({ where: { invoiceId: existingInvoice.id } }),
          prisma.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } }),
          prisma.payment.deleteMany({ where: { invoiceId: existingInvoice.id } }),
          prisma.invoice.delete({ where: { id: existingInvoice.id } }),
        ]);
      }
    }

    // Create new invoice with the latest discounts and loyalty points
    const invoice = await this.createInvoice(input, ctx);

    // Finalize with payments and completion time
    return this.finalizeInvoice(
      invoice.id,
      { payments: input.payments, completedAt: input.completedAt },
      ctx
    );
  },

  /**
   * Calculate totals without saving (preview)
   */
  async calculate(input: CalculateInput, ctx: TenantContext) {
    return calculator.calculate(input.items, ctx.tenantId, input.branchId, {
      isIgst: input.isIgst,
      loyaltyPointsToRedeem: input.redeemLoyaltyPoints,
      walletAmountToUse: input.useWalletAmount,
      discounts: input.discounts,
    });
  },

  /**
   * Get next invoice number (preview)
   */
  async getNextInvoiceNumber(branchId: string, ctx: TenantContext) {
    return this.generateInvoiceNumber(ctx.tenantId, branchId);
  },
};
