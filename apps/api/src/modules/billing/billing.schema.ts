/**
 * Billing Module - Zod Schemas
 * Validation schemas for invoice, payment, and billing operations
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const InvoiceStatus = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const PaymentStatus = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
  WALLET: 'wallet',
  LOYALTY: 'loyalty',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
} as const;

export const ItemType = {
  SERVICE: 'service',
  PRODUCT: 'product',
  COMBO: 'combo',
  PACKAGE: 'package',
} as const;

export const DiscountType = {
  AUTO_PROMO: 'auto_promo',
  MANUAL: 'manual',
  COUPON: 'coupon',
  MEMBERSHIP: 'membership',
  LOYALTY: 'loyalty',
  REFERRAL: 'referral',
} as const;

export const RefundMethod = {
  ORIGINAL_METHOD: 'original_method',
  WALLET: 'wallet',
  CASH: 'cash',
} as const;

export const DayClosureStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  RECONCILED: 'reconciled',
} as const;

// ============================================
// Invoice Item Schema
// ============================================

export const invoiceItemInputSchema = z.object({
  itemType: z.enum(['service', 'product', 'combo', 'package']),
  referenceId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  stylistId: z.string().uuid().optional(),
  assistantId: z.string().uuid().optional(),
  isPackageRedemption: z.boolean().default(false),
  packageRedemptionId: z.string().uuid().optional(),
});

// ============================================
// Discount Schema
// ============================================

export const discountInputSchema = z.object({
  discountType: z.enum(['auto_promo', 'manual', 'coupon', 'membership', 'loyalty', 'referral']),
  discountSource: z.string().optional(),
  calculationType: z.enum(['percentage', 'flat']),
  calculationValue: z.number().min(0),
  appliedTo: z.enum(['subtotal', 'item']),
  appliedItemIndex: z.number().int().min(0).optional(),
  reason: z.string().max(255).optional(),
});

// ============================================
// Create Invoice Schema
// ============================================

export const createInvoiceSchema = z
  .object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().min(2).max(255).optional(),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
      .optional(),
    customerEmail: z.string().email().optional(),
    appointmentId: z.string().uuid().optional(),
    items: z.array(invoiceItemInputSchema).min(1),
    discounts: z.array(discountInputSchema).optional(),
    redeemLoyaltyPoints: z.number().int().min(0).optional(),
    useWalletAmount: z.number().min(0).optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .optional(),
    placeOfSupply: z.string().max(50).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: 'Either customerId or customerName is required',
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ============================================
// Update Invoice Schema
// ============================================

export const updateInvoiceSchema = z.object({
  customerName: z.string().min(2).max(255).optional(),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  customerEmail: z.string().email().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .nullable(),
  placeOfSupply: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  internalNotes: z.string().max(1000).optional().nullable(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ============================================
// Add Item Schema
// ============================================

export const addItemSchema = invoiceItemInputSchema;
export type AddItemInput = z.infer<typeof addItemSchema>;

// ============================================
// Update Item Schema
// ============================================

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  stylistId: z.string().uuid().optional().nullable(),
  assistantId: z.string().uuid().optional().nullable(),
  discountType: z.enum(['percentage', 'flat']).optional().nullable(),
  discountValue: z.number().min(0).optional(),
  discountReason: z.string().max(255).optional().nullable(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// ============================================
// Payment Schema
// ============================================

export const paymentInputSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'upi', 'wallet', 'loyalty', 'bank_transfer', 'cheque']),
  amount: z.number().min(0.01),
  cardLastFour: z.string().length(4).optional(),
  cardType: z.enum(['visa', 'mastercard', 'rupay', 'amex']).optional(),
  upiId: z.string().max(100).optional(),
  transactionId: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  chequeNumber: z.string().max(50).optional(),
  chequeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const addPaymentSchema = z.object({
  payments: z.array(paymentInputSchema).min(1),
});

export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

// ============================================
// Apply Discount Schema
// ============================================

export const applyDiscountSchema = z
  .object({
    discountType: z.enum(['auto_promo', 'manual', 'coupon', 'membership', 'loyalty', 'referral']),
    discountSource: z.string().optional(),
    calculationType: z.enum(['percentage', 'flat']),
    calculationValue: z.number().min(0),
    appliedTo: z.enum(['subtotal', 'item']),
    appliedItemId: z.string().uuid().optional(),
    reason: z.string().max(255).optional(),
  })
  .refine((data) => !(data.appliedTo === 'item' && !data.appliedItemId), {
    message: 'appliedItemId is required when appliedTo is "item"',
  });

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

// ============================================
// Finalize Invoice Schema
// ============================================

export const finalizeInvoiceSchema = z.object({
  payments: z.array(paymentInputSchema).optional(),
  completedAt: z.string().datetime().optional(), // ISO datetime for appointment completion
});

export type FinalizeInvoiceInput = z.infer<typeof finalizeInvoiceSchema>;

// ============================================
// Cancel Invoice Schema
// ============================================

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

// ============================================
// Credit Note Schema
// ============================================

export const createCreditNoteSchema = z.object({
  originalInvoiceId: z.string().uuid(),
  items: z
    .array(
      z.object({
        originalItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  refundMethod: z.enum(['original_method', 'wallet', 'cash']),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  notes: z.string().max(1000).optional(),
});

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;

// ============================================
// Day Closure Schema
// ============================================

export const openDaySchema = z.object({
  branchId: z.string().uuid(),
  openingCash: z.number().min(0).optional(),
});

export type OpenDayInput = z.infer<typeof openDaySchema>;

export const closeDaySchema = z.object({
  actualCash: z.number().min(0),
  notes: z.string().max(1000).optional(),
});

export type CloseDayInput = z.infer<typeof closeDaySchema>;

// ============================================
// Cash Drawer Schema
// ============================================

export const cashAdjustmentSchema = z.object({
  amount: z.number(),
  description: z.string().min(5).max(255),
  transactionType: z.enum(['deposit', 'withdrawal', 'adjustment']),
});

export type CashAdjustmentInput = z.infer<typeof cashAdjustmentSchema>;

// ============================================
// Query Schemas
// ============================================

export const listInvoicesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(['draft', 'finalized', 'cancelled', 'refunded']).optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['invoiceDate', 'grandTotal', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const listPaymentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  paymentMethod: z
    .enum(['cash', 'card', 'upi', 'wallet', 'loyalty', 'bank_transfer', 'cheque'])
    .optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

// ============================================
// Quick Bill Schema
// ============================================

export const quickBillSchema = z
  .object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().min(2).max(255).optional(),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
      .optional(),
    customerEmail: z.string().email().optional(),
    appointmentId: z.string().uuid().optional(),
    completedAt: z.string().datetime().optional(), // ISO datetime for appointment completion
    items: z.array(invoiceItemInputSchema).min(1),
    discounts: z.array(discountInputSchema).optional(),
    redeemLoyaltyPoints: z.number().int().min(0).optional(),
    useWalletAmount: z.number().min(0).optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .optional(),
    placeOfSupply: z.string().max(50).optional(),
    notes: z.string().max(1000).optional(),
    payments: z.array(paymentInputSchema).min(1),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: 'Either customerId or customerName is required',
  });

export type QuickBillInput = z.infer<typeof quickBillSchema>;

// ============================================
// Calculate Schema (preview without saving)
// ============================================

export const calculateSchema = z.object({
  branchId: z.string().uuid(),
  items: z.array(invoiceItemInputSchema).min(1),
  discounts: z.array(discountInputSchema).optional(),
  redeemLoyaltyPoints: z.number().int().min(0).optional(),
  useWalletAmount: z.number().min(0).optional(),
  isIgst: z.boolean().default(false),
});

export type CalculateInput = z.infer<typeof calculateSchema>;
