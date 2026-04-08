/**
 * Customer Package Routes
 * API route definitions for customer package management
 * Requirements: 4.1, 5.3
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import * as controller from './customer-package.controller';
import {
  sellPackageBodySchema,
  cancelPackageBodySchema,
  customerPackageQuerySchema,
  packageRedemptionQuerySchema,
  idParamSchema,
  customerIdParamSchema,
  successResponseSchema,
  paginatedResponseSchema,
  errorResponseSchema,
} from './customer-package.schema';

export default async function customerPackageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /customer-packages - List all customer packages
  app.get(
    '/customer-packages',
    {
      schema: {
        description: 'Get all customer packages with filtering and pagination',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        querystring: customerPackageQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.listCustomerPackages as any
  );

  // POST /customer-packages - Sell a package
  app.post(
    '/customer-packages',
    {
      schema: {
        description: 'Sell a package to a customer',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        body: sellPackageBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.BILLS_WRITE)],
    },
    controller.sellPackage as any
  );

  // GET /customer-packages/:id - Get a single customer package
  app.get(
    '/customer-packages/:id',
    {
      schema: {
        description: 'Get a single customer package by ID',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getCustomerPackageById as any
  );

  // GET /customer-packages/:id/credits - Get credit balance
  app.get(
    '/customer-packages/:id/credits',
    {
      schema: {
        description: 'Get credit balance for a customer package',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getPackageCredits as any
  );

  // GET /customer-packages/:id/redemptions - Get redemption history
  app.get(
    '/customer-packages/:id/redemptions',
    {
      schema: {
        description: 'Get redemption history for a customer package',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: packageRedemptionQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getPackageRedemptions as any
  );

  // POST /customer-packages/:id/cancel - Cancel a customer package
  app.post(
    '/customer-packages/:id/cancel',
    {
      schema: {
        description: 'Cancel a customer package',
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: cancelPackageBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_WRITE)],
    },
    controller.cancelCustomerPackage as any
  );

  // GET /customers/:customerId/packages - Get customer's packages
  app.get(
    '/customers/:customerId/packages',
    {
      schema: {
        description: "Get a customer's active packages",
        tags: ['Customer Packages'],
        security: [{ bearerAuth: [] }],
        params: customerIdParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getCustomerPackages as any
  );
}
