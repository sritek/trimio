/**
 * Customer Membership Routes
 * API route definitions for customer membership management
 * Requirements: 3.1, 3.2, 6.1
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import * as controller from './customer-membership.controller';
import {
  sellMembershipBodySchema,
  freezeMembershipBodySchema,
  cancelMembershipBodySchema,
  customerMembershipQuerySchema,
  membershipUsageQuerySchema,
  idParamSchema,
  customerIdParamSchema,
  successResponseSchema,
  paginatedResponseSchema,
  errorResponseSchema,
} from './customer-membership.schema';

export default async function customerMembershipRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /memberships - List all customer memberships
  app.get(
    '/memberships',
    {
      schema: {
        description: 'Get all customer memberships with filtering and pagination',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        querystring: customerMembershipQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.listMemberships as any
  );

  // POST /memberships - Sell a membership
  app.post(
    '/memberships',
    {
      schema: {
        description: 'Sell a membership to a customer',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        body: sellMembershipBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.BILLS_WRITE)],
    },
    controller.sellMembership as any
  );

  // GET /memberships/:id - Get a single membership
  app.get(
    '/memberships/:id',
    {
      schema: {
        description: 'Get a single customer membership by ID',
        tags: ['Customer Memberships'],
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
    controller.getMembershipById as any
  );

  // GET /memberships/:id/usage - Get membership usage history
  app.get(
    '/memberships/:id/usage',
    {
      schema: {
        description: 'Get usage history for a membership',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: membershipUsageQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getMembershipUsage as any
  );

  // POST /memberships/:id/freeze - Freeze a membership
  app.post(
    '/memberships/:id/freeze',
    {
      schema: {
        description: 'Freeze a membership',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: freezeMembershipBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_WRITE)],
    },
    controller.freezeMembership as any
  );

  // POST /memberships/:id/unfreeze - Unfreeze a membership
  app.post(
    '/memberships/:id/unfreeze',
    {
      schema: {
        description: 'Unfreeze a membership (end freeze early)',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_WRITE)],
    },
    controller.unfreezeMembership as any
  );

  // POST /memberships/:id/cancel - Cancel a membership
  app.post(
    '/memberships/:id/cancel',
    {
      schema: {
        description: 'Cancel a membership',
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: cancelMembershipBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_WRITE)],
    },
    controller.cancelMembership as any
  );

  // GET /customers/:customerId/memberships - Get customer's memberships
  app.get(
    '/customers/:customerId/memberships',
    {
      schema: {
        description: "Get a customer's active memberships",
        tags: ['Customer Memberships'],
        security: [{ bearerAuth: [] }],
        params: customerIdParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getCustomerMemberships as any
  );
}
