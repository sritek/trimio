/**
 * Redemption Routes
 * API route definitions for checking and applying membership/package benefits
 * Requirements: 5.1, 5.2, 5.3
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import * as controller from './redemption.controller';
import {
  checkBenefitsBodySchema,
  applyMembershipDiscountBodySchema,
  redeemPackageCreditsBodySchema,
  successResponseSchema,
  errorResponseSchema,
} from './redemption.schema';

export default async function redemptionRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /redemption/check - Check available benefits for services
  app.post(
    '/redemption/check',
    {
      schema: {
        description: 'Check available membership and package benefits for services',
        tags: ['Redemption'],
        security: [{ bearerAuth: [] }],
        body: checkBenefitsBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.BILLS_READ)],
    },
    controller.checkBenefits as any
  );

  // POST /redemption/apply-membership - Apply membership discount
  app.post(
    '/redemption/apply-membership',
    {
      schema: {
        description: 'Apply membership discount to an invoice item',
        tags: ['Redemption'],
        security: [{ bearerAuth: [] }],
        body: applyMembershipDiscountBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.BILLS_WRITE)],
    },
    controller.applyMembershipDiscount as any
  );

  // POST /redemption/redeem-package - Redeem package credits
  app.post(
    '/redemption/redeem-package',
    {
      schema: {
        description: 'Redeem package credits for a service',
        tags: ['Redemption'],
        security: [{ bearerAuth: [] }],
        body: redeemPackageCreditsBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.BILLS_WRITE)],
    },
    controller.redeemPackageCredits as any
  );

  // GET /customers/:customerId/benefits - Get customer's benefits summary
  app.get(
    '/customers/:customerId/benefits',
    {
      schema: {
        description: "Get a customer's available benefits summary at a branch",
        tags: ['Redemption'],
        security: [{ bearerAuth: [] }],
        params: z.object({ customerId: z.string().uuid() }),
        querystring: z.object({ branchId: z.string().uuid() }),
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_READ)],
    },
    controller.getCustomerBenefitsSummary as any
  );
}
