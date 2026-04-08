/**
 * Product Routes
 * API route definitions for product catalog management
 * Requirements: 1.1-1.7, 2.1-2.10, 3.1-3.6
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { PERMISSIONS } from '@trimio/shared';

import { authenticate, requirePermission, requireBranchAccess } from '../../middleware';
import { productController } from './product.controller';

import {
  // Category schemas
  createCategoryBodySchema,
  updateCategoryBodySchema,
  categoryQuerySchema,
  // Product schemas
  createProductBodySchema,
  updateProductBodySchema,
  productQuerySchema,
  // Branch settings schemas
  updateBranchSettingsBodySchema,
  bulkUpdateBranchSettingsBodySchema,
  // Param schemas
  idParamSchema,
  productBranchParamsSchema,
  // Response schemas
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './product.schema';
import { z } from 'zod';

export default async function productRoutes(fastify: FastifyInstance) {
  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Product Category Routes
  // ============================================

  // GET /inventory/categories - List all categories
  app.get(
    '/inventory/categories',
    {
      schema: {
        description: 'Get all product categories',
        tags: ['Product Categories'],
        security: [{ bearerAuth: [] }],
        querystring: categoryQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return productController.getCategories(request as any, reply);
    }
  );

  // POST /inventory/categories - Create a new category
  app.post(
    '/inventory/categories',
    {
      schema: {
        description: 'Create a new product category',
        tags: ['Product Categories'],
        security: [{ bearerAuth: [] }],
        body: createCategoryBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.createCategory(request as any, reply);
    }
  );

  // GET /inventory/categories/:id - Get a single category
  app.get(
    '/inventory/categories/:id',
    {
      schema: {
        description: 'Get a single product category',
        tags: ['Product Categories'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return productController.getCategoryById(request as any, reply);
    }
  );

  // PATCH /inventory/categories/:id - Update a category
  app.patch(
    '/inventory/categories/:id',
    {
      schema: {
        description: 'Update a product category',
        tags: ['Product Categories'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateCategoryBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.updateCategory(request as any, reply);
    }
  );

  // DELETE /inventory/categories/:id - Delete a category
  app.delete(
    '/inventory/categories/:id',
    {
      schema: {
        description: 'Delete a product category',
        tags: ['Product Categories'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.deleteCategory(request as any, reply);
    }
  );

  // ============================================
  // Product Routes
  // ============================================

  // GET /inventory/products - List all products
  app.get(
    '/inventory/products',
    {
      schema: {
        description: 'Get all products with filtering and pagination',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        querystring: productQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return productController.getProducts(request as any, reply);
    }
  );

  // POST /inventory/products - Create a new product
  app.post(
    '/inventory/products',
    {
      schema: {
        description: 'Create a new product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        body: createProductBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.createProduct(request as any, reply);
    }
  );

  // GET /inventory/products/:id - Get a single product
  app.get(
    '/inventory/products/:id',
    {
      schema: {
        description: 'Get a single product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: z.object({
          branchId: z.string().uuid().optional(),
        }),
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return productController.getProductById(request as any, reply);
    }
  );

  // PATCH /inventory/products/:id - Update a product
  app.patch(
    '/inventory/products/:id',
    {
      schema: {
        description: 'Update a product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateProductBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.updateProduct(request as any, reply);
    }
  );

  // DELETE /inventory/products/:id - Delete a product
  app.delete(
    '/inventory/products/:id',
    {
      schema: {
        description: 'Delete a product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return productController.deleteProduct(request as any, reply);
    }
  );

  // ============================================
  // Branch Product Settings Routes
  // ============================================

  // GET /inventory/products/:id/branch-settings/:branchId - Get branch settings for a product
  app.get(
    '/inventory/products/:id/branch-settings/:branchId',
    {
      schema: {
        description: 'Get branch-specific settings for a product',
        tags: ['Branch Product Settings'],
        security: [{ bearerAuth: [] }],
        params: productBranchParamsSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.INVENTORY_READ),
        requireBranchAccess('branchId'),
      ],
    },
    async (request, reply) => {
      return productController.getBranchSettings(request as any, reply);
    }
  );

  // PATCH /inventory/products/:id/branch-settings/:branchId - Update branch settings for a product
  app.patch(
    '/inventory/products/:id/branch-settings/:branchId',
    {
      schema: {
        description: 'Update branch-specific settings for a product',
        tags: ['Branch Product Settings'],
        security: [{ bearerAuth: [] }],
        params: productBranchParamsSchema,
        body: updateBranchSettingsBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.INVENTORY_WRITE),
        requireBranchAccess('branchId'),
      ],
    },
    async (request, reply) => {
      return productController.updateBranchSettings(request as any, reply);
    }
  );

  // PATCH /inventory/branches/:branchId/product-settings - Bulk update branch settings
  app.patch(
    '/inventory/branches/:branchId/product-settings',
    {
      schema: {
        description: 'Bulk update branch-specific settings for multiple products',
        tags: ['Branch Product Settings'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          branchId: z.string().uuid(),
        }),
        body: bulkUpdateBranchSettingsBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.INVENTORY_WRITE),
        requireBranchAccess('branchId'),
      ],
    },
    async (request, reply) => {
      return productController.bulkUpdateBranchSettings(request as any, reply);
    }
  );
}
