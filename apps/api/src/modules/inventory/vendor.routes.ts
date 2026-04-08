/**
 * Vendor Routes
 * API route definitions for vendor management
 * Requirements: 4.1-4.5, 5.1-5.5
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { PERMISSIONS } from '@trimio/shared';

import { authenticate, requirePermission } from '../../middleware';
import { vendorController } from './vendor.controller';

import {
  // Vendor schemas
  createVendorBodySchema,
  updateVendorBodySchema,
  vendorQuerySchema,
  // Vendor-Product mapping schemas
  createVendorProductBodySchema,
  updateVendorProductBodySchema,
  // Param schemas
  idParamSchema,
  vendorIdParamSchema,
  productIdParamSchema,
  mappingIdParamSchema,
  // Response schemas
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './vendor.schema';

export default async function vendorRoutes(fastify: FastifyInstance) {
  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Vendor Routes
  // ============================================

  // GET /inventory/vendors - List all vendors
  app.get(
    '/inventory/vendors',
    {
      schema: {
        description: 'Get all vendors with filtering and pagination',
        tags: ['Vendors'],
        security: [{ bearerAuth: [] }],
        querystring: vendorQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return vendorController.getVendors(request as any, reply);
    }
  );

  // POST /inventory/vendors - Create a new vendor
  app.post(
    '/inventory/vendors',
    {
      schema: {
        description: 'Create a new vendor',
        tags: ['Vendors'],
        security: [{ bearerAuth: [] }],
        body: createVendorBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return vendorController.createVendor(request as any, reply);
    }
  );

  // GET /inventory/vendors/:id - Get a single vendor
  app.get(
    '/inventory/vendors/:id',
    {
      schema: {
        description: 'Get a single vendor by ID',
        tags: ['Vendors'],
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
      return vendorController.getVendorById(request as any, reply);
    }
  );

  // PATCH /inventory/vendors/:id - Update a vendor
  app.patch(
    '/inventory/vendors/:id',
    {
      schema: {
        description: 'Update a vendor',
        tags: ['Vendors'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateVendorBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return vendorController.updateVendor(request as any, reply);
    }
  );

  // DELETE /inventory/vendors/:id - Delete a vendor
  app.delete(
    '/inventory/vendors/:id',
    {
      schema: {
        description: 'Delete a vendor',
        tags: ['Vendors'],
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
      return vendorController.deleteVendor(request as any, reply);
    }
  );

  // GET /inventory/vendors/:vendorId/products - Get all products for a vendor
  app.get(
    '/inventory/vendors/:vendorId/products',
    {
      schema: {
        description: 'Get all products mapped to a vendor',
        tags: ['Vendor Products'],
        security: [{ bearerAuth: [] }],
        params: vendorIdParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return vendorController.getVendorProducts(request as any, reply);
    }
  );

  // ============================================
  // Vendor-Product Mapping Routes
  // ============================================

  // GET /inventory/products/:productId/vendors - Get all vendors for a product
  app.get(
    '/inventory/products/:productId/vendors',
    {
      schema: {
        description: 'Get all vendors mapped to a product',
        tags: ['Vendor Products'],
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_READ)],
    },
    async (request, reply) => {
      return vendorController.getProductVendors(request as any, reply);
    }
  );

  // POST /inventory/vendor-products - Map a product to a vendor
  app.post(
    '/inventory/vendor-products',
    {
      schema: {
        description: 'Create a vendor-product mapping',
        tags: ['Vendor Products'],
        security: [{ bearerAuth: [] }],
        body: createVendorProductBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return vendorController.createVendorProduct(request as any, reply);
    }
  );

  // PATCH /inventory/vendor-products/:mappingId - Update a vendor-product mapping
  app.patch(
    '/inventory/vendor-products/:mappingId',
    {
      schema: {
        description: 'Update a vendor-product mapping',
        tags: ['Vendor Products'],
        security: [{ bearerAuth: [] }],
        params: mappingIdParamSchema,
        body: updateVendorProductBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_WRITE)],
    },
    async (request, reply) => {
      return vendorController.updateVendorProduct(request as any, reply);
    }
  );

  // DELETE /inventory/vendor-products/:mappingId - Delete a vendor-product mapping
  app.delete(
    '/inventory/vendor-products/:mappingId',
    {
      schema: {
        description: 'Delete a vendor-product mapping',
        tags: ['Vendor Products'],
        security: [{ bearerAuth: [] }],
        params: mappingIdParamSchema,
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
      return vendorController.deleteVendorProduct(request as any, reply);
    }
  );
}
