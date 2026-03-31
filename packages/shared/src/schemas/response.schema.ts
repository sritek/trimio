/**
 * Shared Response Schemas
 * Common response wrappers for API endpoints
 */

import { z } from 'zod';

// =====================================================
// SUCCESS RESPONSE
// =====================================================

/**
 * Success response wrapper factory
 * @param dataSchema - The Zod schema for the data field
 */
export const successResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// =====================================================
// ERROR RESPONSE
// =====================================================

/**
 * Error detail schema
 */
export const errorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});

// =====================================================
// PAGINATION
// =====================================================

/**
 * Pagination meta schema
 */
export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

/**
 * Paginated response wrapper factory
 * @param itemSchema - The Zod schema for each item in the data array
 */
export const paginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// =====================================================
// MESSAGE RESPONSE
// =====================================================

/**
 * Simple message response schema (for delete operations, etc.)
 */
export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});
