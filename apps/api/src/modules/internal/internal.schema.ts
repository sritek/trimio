/**
 * Internal Admin Portal Schemas
 * For company-only tenant provisioning
 */

import { z } from 'zod';

// Admin login
export const adminLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;

export const adminLoginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    admin: z.object({
      email: z.string(),
    }),
  }),
});

// Indian phone number regex: 10 digits starting with 6-9
const indianPhoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

// Create tenant
export const createTenantBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  legalName: z.string().max(255).optional(),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9').optional(),
  logoUrl: z.string().url().optional(),
  subscriptionPlan: z.enum(['trial', 'basic', 'professional', 'enterprise']).default('trial'),
  trialDays: z.number().int().min(0).max(90).default(14),
  // Loyalty configuration
  loyaltyEnabled: z.boolean().default(true),
  loyaltyPointsPerUnit: z.number().min(0).max(1).default(0.01), // Points earned per ₹1 spent
  loyaltyRedemptionValue: z.number().min(0).max(100).default(1), // ₹ value per point redeemed
  loyaltyExpiryDays: z.number().int().min(0).max(3650).default(365), // 0 = no expiry
});

export type CreateTenantBody = z.infer<typeof createTenantBodySchema>;

// Create branch
export const createBranchBodySchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().regex(pincodeRegex, 'Pincode must be 6 digits'),
  phone: z
    .string()
    .regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  gstin: z.string().max(20).optional(),
});

export type CreateBranchBody = z.infer<typeof createBranchBodySchema>;

// Create super owner
// Note: branchId is optional - super_owners are auto-assigned to ALL branches
export const createSuperOwnerBodySchema = z.object({
  tenantId: z.string().uuid(),
  branchId: z.string().uuid().optional(), // Optional - ignored for super_owner
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export type CreateSuperOwnerBody = z.infer<typeof createSuperOwnerBodySchema>;

// List tenants query
export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

// Update tenant
export const updateTenantBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  email: z.string().email('Invalid email format').optional(),
  phone: z
    .string()
    .regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9')
    .optional()
    .nullable(),
  logoUrl: z.string().url().optional().nullable(),
  subscriptionPlan: z.enum(['trial', 'basic', 'professional', 'enterprise']).optional(),
  subscriptionStatus: z.enum(['active', 'inactive', 'suspended', 'cancelled']).optional(),
});

export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>;

// Update branch
export const updateBranchBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z
    .string()
    .regex(pincodeRegex, 'Pincode must be 6 digits')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  gstin: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateBranchBody = z.infer<typeof updateBranchBodySchema>;

// Update super owner
export const updateSuperOwnerBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(indianPhoneRegex, 'Phone must be 10 digits starting with 6-9').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSuperOwnerBody = z.infer<typeof updateSuperOwnerBodySchema>;

// Update loyalty config (for internal admin)
export const updateLoyaltyConfigBodySchema = z.object({
  isEnabled: z.boolean().optional(),
  pointsPerUnit: z.number().min(0).max(1).optional(),
  redemptionValuePerPoint: z.number().min(0).max(100).optional(),
  expiryDays: z.number().int().min(0).max(3650).optional(),
});

export type UpdateLoyaltyConfigBody = z.infer<typeof updateLoyaltyConfigBodySchema>;

// Response schemas
export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  legalName: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  subscriptionPlan: z.string(),
  subscriptionStatus: z.string(),
  trialEndsAt: z.string().nullable(),
  createdAt: z.string(),
});

export const branchResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  gstin: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const userResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
