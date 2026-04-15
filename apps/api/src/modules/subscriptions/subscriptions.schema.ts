/**
 * Subscriptions Module - Zod Schemas
 * Validation schemas for branch subscriptions, plans, and billing
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const SubscriptionPlanTier = {
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export const BillingCycle = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const;

export const BranchSubscriptionStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export const SubscriptionInvoiceStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;

export const PaymentGateway = {
  RAZORPAY: 'razorpay',
  STRIPE: 'stripe',
  MANUAL: 'manual',
} as const;

export const SubscriptionEventType = {
  CREATED: 'created',
  ACTIVATED: 'activated',
  RENEWED: 'renewed',
  UPGRADED: 'upgraded',
  DOWNGRADED: 'downgraded',
  PAYMENT_FAILED: 'payment_failed',
  GRACE_PERIOD_STARTED: 'grace_period_started',
  SUSPENDED: 'suspended',
  REACTIVATED: 'reactivated',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

// ============================================
// Subscription Plan Schemas
// ============================================

export const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
  tier: z.enum(['basic', 'professional', 'enterprise']),
  description: z.string().max(1000).optional(),
  monthlyPrice: z.number().min(0),
  annualPrice: z.number().min(0),
  currency: z.string().length(3).default('INR'),
  maxUsers: z.number().int(), // -1 for unlimited
  maxAppointmentsPerDay: z.number().int(),
  maxServices: z.number().int(),
  maxProducts: z.number().int(),
  features: z.record(z.unknown()).default({}),
  trialDays: z.number().int().min(0).default(14),
  gracePeriodDays: z.number().int().min(0).default(7),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial().omit({ code: true });

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const listPlansQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  tier: z.enum(['basic', 'professional', 'enterprise']).optional(),
});

export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;

// ============================================
// Branch Subscription Schemas
// ============================================

export const createSubscriptionSchema = z.object({
  branchId: z.string().uuid(),
  planId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']),
  startTrial: z.boolean().default(true),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountReason: z.string().max(255).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  autoRenew: z.boolean().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountReason: z.string().max(255).optional().nullable(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const changePlanSchema = z.object({
  newPlanId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  effectiveImmediately: z.boolean().default(false),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

export const cancelSubscriptionSchema = z.object({
  reason: z.string().min(10).max(500),
  cancelImmediately: z.boolean().default(false), // If false, cancel at period end
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const reactivateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(), // Optional: change plan on reactivation
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

export type ReactivateSubscriptionInput = z.infer<typeof reactivateSubscriptionSchema>;

// ============================================
// Subscription Invoice Schemas
// ============================================

export const listInvoicesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled']).optional(),
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
  sortBy: z.enum(['invoiceDate', 'dueDate', 'grandTotal', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

// ============================================
// Payment Schemas
// ============================================

export const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  gateway: z.enum(['razorpay', 'stripe']),
  returnUrl: z.string().url().optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const recordManualPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().min(0.01),
  transactionId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

// ============================================
// Billing Overview Query
// ============================================

export const billingOverviewQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export type BillingOverviewQuery = z.infer<typeof billingOverviewQuerySchema>;

// ============================================
// Tenant Billing Settings Schema
// ============================================

export const updateBillingSettingsSchema = z.object({
  billingEmail: z.string().email().optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .nullable(),
  volumeDiscountEnabled: z.boolean().optional(),
  volumeDiscountPercentage: z.number().min(0).max(100).optional(),
  volumeDiscountMinBranches: z.number().int().min(2).optional(),
});

export type UpdateBillingSettingsInput = z.infer<typeof updateBillingSettingsSchema>;
