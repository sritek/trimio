/**
 * Fastify Zod Type Provider Setup
 * Provides type-safe request/response validation using Zod schemas
 */

import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

/**
 * Create a Fastify instance with Zod type provider
 */
export function createFastifyWithZod(options?: Parameters<typeof Fastify>[0]) {
  const app = Fastify(options);

  // Set Zod compilers for validation and serialization
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  return app.withTypeProvider<ZodTypeProvider>();
}

/**
 * Type for Fastify instance with Zod type provider
 */
export type FastifyZodInstance = ReturnType<typeof createFastifyWithZod>;

/**
 * Re-export jsonSchemaTransform for Swagger integration
 */
export { jsonSchemaTransform };

// =====================================================
// SHARED RESPONSE SCHEMAS
// =====================================================

/**
 * Success response wrapper factory
 */
export const successResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.any()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Pagination meta schema
 */
export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Paginated response wrapper factory
 */
export const paginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// =====================================================
// COMMON PARAM SCHEMAS
// =====================================================

/**
 * UUID param schema
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

/**
 * Pagination query schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Sort query schema
 */
export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SortQuery = z.infer<typeof sortQuerySchema>;

/**
 * Combined pagination and sort query schema
 */
export const listQuerySchema = paginationQuerySchema.merge(sortQuerySchema);

export type ListQuery = z.infer<typeof listQuerySchema>;

/**
 * Message response schema (for delete operations, etc.)
 */
export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;
