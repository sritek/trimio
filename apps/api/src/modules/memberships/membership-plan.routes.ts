/**
 * Membership Plan Routes
 * API route definitions for membership plan management
 * Requirements: 1.1, 1.2
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission, requireBranchAccess } from '../../middleware';
import * as controller from './membership-plan.controller';
import {
  createMembershipPlanBodySchema,
  updateMembershipPlanBodySchema,
  membershipPlanQuerySchema,
  createBenefitBodySchema,
  updateBenefitBodySchema,
  idParamSchema,
  planBenefitParamsSchema,
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './membership-plan.schema';

export default async function membershipPlanRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Membership Plan Routes
  // ============================================

  // GET /membership-plans - List all membership plans
  app.get(
    '/membership-plans',
    {
      schema: {
        description: 'Get all membership plans with filtering and pagination',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        querystring: membershipPlanQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    controller.listMembershipPlans as any
  );

  // POST /membership-plans - Create a new membership plan
  app.post(
    '/membership-plans',
    {
      schema: {
        description: 'Create a new membership plan',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        body: createMembershipPlanBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.createMembershipPlan as any
  );

  // GET /membership-plans/:id - Get a single membership plan
  app.get(
    '/membership-plans/:id',
    {
      schema: {
        description: 'Get a single membership plan by ID',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    controller.getMembershipPlanById as any
  );

  // PATCH /membership-plans/:id - Update a membership plan
  app.patch(
    '/membership-plans/:id',
    {
      schema: {
        description: 'Update a membership plan',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateMembershipPlanBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.updateMembershipPlan as any
  );

  // DELETE /membership-plans/:id - Deactivate a membership plan
  app.delete(
    '/membership-plans/:id',
    {
      schema: {
        description: 'Deactivate a membership plan',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.deleteMembershipPlan as any
  );

  // GET /branches/:branchId/membership-plans - Get plans available at a branch
  app.get(
    '/branches/:branchId/membership-plans',
    {
      schema: {
        description: 'Get membership plans available at a specific branch',
        tags: ['Membership Plans'],
        security: [{ bearerAuth: [] }],
        params: z.object({ branchId: z.string().uuid() }),
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        requireBranchAccess('branchId'),
      ],
    },
    controller.getPlansForBranch as any
  );

  // ============================================
  // Benefit Routes
  // ============================================

  // POST /membership-plans/:id/benefits - Add a benefit to a plan
  app.post(
    '/membership-plans/:id/benefits',
    {
      schema: {
        description: 'Add a benefit to a membership plan',
        tags: ['Membership Benefits'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: createBenefitBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.addBenefit as any
  );

  // PATCH /membership-plans/:id/benefits/:benefitId - Update a benefit
  app.patch(
    '/membership-plans/:id/benefits/:benefitId',
    {
      schema: {
        description: 'Update a benefit',
        tags: ['Membership Benefits'],
        security: [{ bearerAuth: [] }],
        params: planBenefitParamsSchema,
        body: updateBenefitBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.updateBenefit as any
  );

  // DELETE /membership-plans/:id/benefits/:benefitId - Remove a benefit
  app.delete(
    '/membership-plans/:id/benefits/:benefitId',
    {
      schema: {
        description: 'Remove a benefit from a membership plan',
        tags: ['Membership Benefits'],
        security: [{ bearerAuth: [] }],
        params: planBenefitParamsSchema,
        response: {
          200: messageResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.removeBenefit as any
  );
}
