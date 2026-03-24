/**
 * Services Module - Zod Validation Schemas
 * Based on: .cursor/docs/design/04-services-pricing.md
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const uuidSchema = z.string().uuid();

// ============================================
// Category Schemas
// ============================================

export const createCategoryBodySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .default('#6B7280'),
  parentId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const updateCategoryBodySchema = createCategoryBodySchema.partial();

export const reorderCategoriesBodySchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0),
    })
  ),
});

export const categoryQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
  parentId: z.string().uuid().optional().nullable(),
  flat: z.coerce.boolean().default(false),
});

// ============================================
// Service Schemas
// ============================================

export const createServiceBodySchema = z.object({
  categoryId: z.string().uuid(),
  sku: z.string().min(1).max(50).optional(), // Auto-generated if not provided
  name: z.string().min(2).max(255),
  description: z.string().optional(),

  // Pricing
  basePrice: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(18),
  isTaxInclusive: z.boolean().default(false),

  // Duration
  durationMinutes: z.number().int().positive(),
  activeTimeMinutes: z.number().int().positive(),
  processingTimeMinutes: z.number().int().min(0).default(0),

  // Applicability
  genderApplicable: z.enum(['all', 'male', 'female']).default('all'),

  // Commission
  commissionType: z.enum(['percentage', 'fixed']).default('percentage'),
  commissionValue: z.number().min(0).default(0),

  // Display
  displayOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().url().max(500).optional().nullable(),

  // Status
  isActive: z.boolean().default(true),
});

export const updateServiceBodySchema = createServiceBodySchema.partial();

export const serviceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  genderApplicable: z.enum(['all', 'male', 'female']).optional(),
  sortBy: z.enum(['name', 'basePrice', 'displayOrder', 'createdAt']).default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const catalogQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().default(false),
});

// ============================================
// Variant Schemas
// ============================================

export const createVariantBodySchema = z.object({
  name: z.string().min(1).max(100),
  priceAdjustmentType: z.enum(['absolute', 'percentage']).default('absolute'),
  priceAdjustment: z.number(),
  durationAdjustment: z.number().int().default(0),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const updateVariantBodySchema = createVariantBodySchema.partial();

// ============================================
// Branch Pricing Schemas
// ============================================

export const updateBranchPriceBodySchema = z.object({
  price: z.number().positive().optional().nullable(),
  commissionType: z.enum(['percentage', 'fixed']).optional().nullable(),
  commissionValue: z.number().min(0).optional().nullable(),
  isAvailable: z.boolean().default(true),
});

export const bulkUpdateBranchPricesBodySchema = z.object({
  prices: z.array(
    z.object({
      serviceId: z.string().uuid(),
      price: z.number().positive().optional().nullable(),
      commissionType: z.enum(['percentage', 'fixed']).optional().nullable(),
      commissionValue: z.number().min(0).optional().nullable(),
      isAvailable: z.boolean().default(true),
    })
  ),
});

// ============================================
// Add-On Schemas
// ============================================

export const createAddOnBodySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  price: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(18),
  durationMinutes: z.number().int().min(0).default(0),
  applicableTo: z.enum(['all', 'category', 'service']).default('all'),
  applicableCategoryId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateAddOnBodySchema = createAddOnBodySchema.partial();

export const mapAddOnsToServiceBodySchema = z.object({
  addOns: z.array(
    z.object({
      addOnId: z.string().uuid(),
      overridePrice: z.number().positive().optional().nullable(),
      isDefault: z.boolean().default(false),
    })
  ),
});

// ============================================
// Combo Service Schemas
// ============================================

export const createComboBodySchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  comboPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(18),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        quantity: z.number().int().positive().default(1),
        displayOrder: z.number().int().min(0).optional(),
      })
    )
    .min(2, 'Combo must have at least 2 services'),
});

export const updateComboBodySchema = createComboBodySchema
  .partial()
  .omit({ items: true })
  .extend({
    items: z
      .array(
        z.object({
          serviceId: z.string().uuid(),
          quantity: z.number().int().positive().default(1),
          displayOrder: z.number().int().min(0).optional(),
        })
      )
      .min(2, 'Combo must have at least 2 services')
      .optional(),
  });

// ============================================
// Price Calculation Schemas
// ============================================

export const calculatePriceBodySchema = z.object({
  branchId: z.string().uuid(),
  services: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive().default(1),
        addOnIds: z.array(z.string().uuid()).optional(),
      })
    )
    .min(1),
  comboIds: z.array(z.string().uuid()).optional(),
});

// ============================================
// Type Exports
// ============================================

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
export type ReorderCategoriesBody = z.infer<typeof reorderCategoriesBodySchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;

export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;
export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export type CreateVariantBody = z.infer<typeof createVariantBodySchema>;
export type UpdateVariantBody = z.infer<typeof updateVariantBodySchema>;

export type UpdateBranchPriceBody = z.infer<typeof updateBranchPriceBodySchema>;
export type BulkUpdateBranchPricesBody = z.infer<typeof bulkUpdateBranchPricesBodySchema>;

export type CreateAddOnBody = z.infer<typeof createAddOnBodySchema>;
export type UpdateAddOnBody = z.infer<typeof updateAddOnBodySchema>;
export type MapAddOnsToServiceBody = z.infer<typeof mapAddOnsToServiceBodySchema>;

export type CreateComboBody = z.infer<typeof createComboBodySchema>;
export type UpdateComboBody = z.infer<typeof updateComboBodySchema>;

export type CalculatePriceBody = z.infer<typeof calculatePriceBodySchema>;

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
  message: z.string(),
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

// Service ID + Variant ID params
export const serviceVariantParamsSchema = z.object({
  id: z.string().uuid(),
  vid: z.string().uuid(),
});

export type ServiceVariantParams = z.infer<typeof serviceVariantParamsSchema>;

// Branch + Service params
export const branchServiceParamsSchema = z.object({
  id: z.string().uuid(),
  sid: z.string().uuid(),
});

export type BranchServiceParams = z.infer<typeof branchServiceParamsSchema>;

// Include inactive query
export const includeInactiveQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

export type IncludeInactiveQuery = z.infer<typeof includeInactiveQuerySchema>;
