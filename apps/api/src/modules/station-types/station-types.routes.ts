/**
 * Station Types Module Routes
 * All route definitions for the station types module using Zod type provider
 * Protected with authentication and role-based permission guards
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 13.1, 13.2, 13.3, 13.4
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate, requireRole } from '../../middleware';
import { stationTypesController } from './station-types.controller';

import {
  createStationTypeBodySchema,
  updateStationTypeBodySchema,
  stationTypeQuerySchema,
  idParamSchema,
  successResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './station-types.schema';

export default async function stationTypesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Station Types Routes
  // ============================================

  // GET /station-types - List all station types
  app.get(
    '/station-types',
    {
      schema: {
        description: 'Get all station types for the tenant',
        tags: ['Station Types'],
        security: [{ bearerAuth: [] }],
        querystring: stationTypeQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      return stationTypesController.getStationTypes(request as any, reply);
    }
  );

  // POST /station-types - Create a station type (super_owner only)
  app.post(
    '/station-types',
    {
      schema: {
        description: 'Create a new station type',
        tags: ['Station Types'],
        security: [{ bearerAuth: [] }],
        body: createStationTypeBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole(['super_owner'])],
    },
    async (request, reply) => {
      return stationTypesController.createStationType(request as any, reply);
    }
  );

  // GET /station-types/:id - Get a single station type
  app.get(
    '/station-types/:id',
    {
      schema: {
        description: 'Get a single station type by ID',
        tags: ['Station Types'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      return stationTypesController.getStationTypeById(request as any, reply);
    }
  );

  // PATCH /station-types/:id - Update a station type (super_owner only)
  app.patch(
    '/station-types/:id',
    {
      schema: {
        description: 'Update a station type',
        tags: ['Station Types'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateStationTypeBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole(['super_owner'])],
    },
    async (request, reply) => {
      return stationTypesController.updateStationType(request as any, reply);
    }
  );

  // DELETE /station-types/:id - Delete a station type (super_owner only)
  app.delete(
    '/station-types/:id',
    {
      schema: {
        description: 'Delete a station type',
        tags: ['Station Types'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole(['super_owner'])],
    },
    async (request, reply) => {
      return stationTypesController.deleteStationType(request as any, reply);
    }
  );
}
