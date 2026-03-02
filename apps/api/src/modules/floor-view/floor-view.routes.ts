/**
 * Floor View Module Routes
 * All route definitions for the floor view module using Zod type provider
 * Protected with authentication and branch access guards
 *
 * Requirements: 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 13.9
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate, requireBranchAccess } from '../../middleware';
import { floorViewController } from './floor-view.controller';

import {
  branchIdParamSchema,
  successResponseSchema,
  errorResponseSchema,
} from './floor-view.schema';

export default async function floorViewRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Floor View Routes
  // ============================================

  // GET /branches/:branchId/floor-view - Get floor view data
  app.get(
    '/branches/:branchId/floor-view',
    {
      schema: {
        description: 'Get floor view data for a branch with station statuses',
        tags: ['Floor View'],
        security: [{ bearerAuth: [] }],
        params: branchIdParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireBranchAccess('branchId')],
    },
    async (request, reply) => {
      return floorViewController.getFloorView(request as any, reply);
    }
  );
}
