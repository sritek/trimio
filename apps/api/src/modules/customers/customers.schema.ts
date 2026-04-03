/**
 * Customers Module - Zod Validation Schemas
 * Based on: .kiro/specs/customer-management/design.md
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Phone validation - supports Indian formats
const phoneRegex = /^[6-9]\d{9}$/;
export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, '')) // Remove non-digits
  .transform((val) => {
    // Handle +91 or 91 prefix
    if (val.length === 12 && val.startsWith('91')) {
      return val.slice(2);
    }
    return val;
  })
  .refine((val) => phoneRegex.test(val), {
    message: 'Invalid phone number. Must be a valid 10-digit Indian mobile number.',
  });

// ============================================
// Customer Schemas
// ============================================

export const createCustomerBodySchema = z.object({
  name: z.string().min(2).max(255),
  phone: phoneSchema,
  email: z.string().email().max(255).optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  dateOfBirth: z.string().date().optional().nullable(),
  anniversaryDate: z.string().date().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  referredBy: z.string().uuid().optional().nullable(),
  marketingConsent: z.boolean().default(true),
  preferences: z.record(z.unknown()).default({}),
  allergies: z.array(z.string()).default([]),
  source: z
    .enum(['manual', 'walk_in', 'online_booking', 'phone', 'import'])
    .optional()
    .default('manual'),
});

export const updateCustomerBodySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().max(255).optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  dateOfBirth: z.string().date().optional().nullable(),
  anniversaryDate: z.string().date().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  marketingConsent: z.boolean().optional(),
  preferences: z.record(z.unknown()).optional(),
  allergies: z.array(z.string()).optional(),
  // Phone change requires special handling - separate endpoint or manager approval
});

export const updateCustomerPhoneBodySchema = z.object({
  phone: phoneSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  gender: z.enum(['male', 'female', 'other']).optional(),
  bookingStatus: z.enum(['normal', 'prepaid_only', 'blocked']).optional(),
  branchId: z.string().uuid().optional(), // First visit branch
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'loyaltyPoints', 'walletBalance']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const customerSearchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

// Phone lookup - for checking if customer exists by phone
export const phoneLookupQuerySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
});

// ============================================
// Customer Notes Schemas
// ============================================

export const createNoteBodySchema = z.object({
  content: z.string().min(1).max(2000),
});

export const notesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ============================================
// Tags Schemas
// ============================================

export const createTagBodySchema = z.object({
  name: z.string().min(2).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .default('#6B7280'),
});

export const addTagsBodySchema = z.object({
  tags: z.array(z.string().min(1).max(50)).min(1).max(10),
});

// ============================================
// Loyalty Schemas
// ============================================

export const loyaltyConfigSchema = z.object({
  pointsPerUnit: z.number().min(0).max(1).default(0.01),
  redemptionValuePerPoint: z.number().min(0).max(100).default(1), // 1 point = ₹1
  expiryDays: z.number().int().min(0).max(3650).default(365), // 0 = no expiry
  isEnabled: z.boolean().default(true),
});

export const adjustLoyaltyBodySchema = z.object({
  type: z.enum(['credit', 'debit']),
  points: z.number().int().positive(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const loyaltyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ============================================
// Wallet Schemas
// ============================================

export const adjustWalletBodySchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.number().positive().max(1000000), // Max 10 lakh
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const walletQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ============================================
// Type Exports
// ============================================

export type CreateCustomerBody = z.input<typeof createCustomerBodySchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerBodySchema>;
export type UpdateCustomerPhoneBody = z.infer<typeof updateCustomerPhoneBodySchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
export type CustomerSearchQuery = z.infer<typeof customerSearchQuerySchema>;
export type PhoneLookupQuery = z.infer<typeof phoneLookupQuerySchema>;

export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;
export type NotesQuery = z.infer<typeof notesQuerySchema>;

export type CreateTagBody = z.infer<typeof createTagBodySchema>;
export type AddTagsBody = z.infer<typeof addTagsBodySchema>;

export type LoyaltyConfig = z.infer<typeof loyaltyConfigSchema>;
export type AdjustLoyaltyBody = z.infer<typeof adjustLoyaltyBodySchema>;
export type LoyaltyQuery = z.infer<typeof loyaltyQuerySchema>;

export type AdjustWalletBody = z.infer<typeof adjustWalletBodySchema>;
export type WalletQuery = z.infer<typeof walletQuerySchema>;

// ============================================
// Response Schemas
// ============================================

// Note: Response schemas are intentionally flexible to allow controllers
// to return full objects without strict serialization.

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.any()).optional(),
  }),
});

// ID param schema
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

// Customer ID + Tag params
export const customerTagParamsSchema = z.object({
  id: z.string().uuid(),
  tag: z.string(),
});

export type CustomerTagParams = z.infer<typeof customerTagParamsSchema>;

// Unblock body schema
export const unblockBodySchema = z.object({
  reason: z.string().min(1).max(255),
});

export type UnblockBody = z.infer<typeof unblockBodySchema>;
