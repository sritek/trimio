/**
 * Membership Config Routes
 * API route definitions for membership configuration
 * Requirements: 7.1
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import * as controller from './membership-config.controller';
import {
  updateMembershipConfigBodySchema,
  successResponseSchema,
  errorResponseSchema,
} from './membership-config.schema';

export default async function membershipConfigRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /membership-config - Get tenant membership configuration
  app.get(
    '/membership-config',
    {
      schema: {
        description: 'Get tenant membership configuration',
        tags: ['Membership Config'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    controller.getMembershipConfig as any
  );

  // PATCH /membership-config - Update tenant membership configuration
  app.patch(
    '/membership-config',
    {
      schema: {
        description: 'Update tenant membership configuration',
        tags: ['Membership Config'],
        security: [{ bearerAuth: [] }],
        body: updateMembershipConfigBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.updateMembershipConfig as any
  );

  // POST /membership-config/reset - Reset configuration to defaults
  app.post(
    '/membership-config/reset',
    {
      schema: {
        description: 'Reset membership configuration to defaults',
        tags: ['Membership Config'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.resetMembershipConfig as any
  );
}
