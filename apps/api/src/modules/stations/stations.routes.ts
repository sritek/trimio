/**
 * Stations Module Routes
 * All route definitions for the stations module using Zod type provider
 * Protected with authentication and role-based permission guards
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 13.5, 13.6, 13.7, 13.8
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate, requireRole, requireBranchAccess } from '../../middleware';
import { stationsController } from './stations.controller';

import {
  createStationBodySchema,
  updateStationBodySchema,
  bulkCreateStationsBodySchema,
  stationQuerySchema,
  idParamSchema,
  branchIdParamSchema,
  successResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './stations.schema';

export default async function stationsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Branch-scoped Station Routes
  // ============================================

  // GET /branches/:branchId/stations - List all stations for a branch
  app.get(
    '/branches/:branchId/stations',
    {
      schema: {
        description: 'Get all stations for a branch',
        tags: ['Stations'],
        security: [{ bearerAuth: [] }],
        params: branchIdParamSchema,
        querystring: stationQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireBranchAccess('branchId')],
    },
    async (request, reply) => {
      return stationsController.getStations(request as any, reply);
    }
  );

  // POST /branches/:branchId/stations - Create a station
  app.post(
    '/branches/:branchId/stations',
    {
      schema: {
        description: 'Create a new station in a branch',
        tags: ['Stations'],
        security: [{ bearerAuth: [] }],
        params: branchIdParamSchema,
        body: createStationBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requireRole(['super_owner', 'regional_manager', 'branch_manager']),
        requireBranchAccess('branchId'),
      ],
    },
    async (request, reply) => {
      return stationsController.createStation(request as any, reply);
    }
  );

  // POST /branches/:branchId/stations/bulk - Bulk create stations
  app.post(
    '/branches/:branchId/stations/bulk',
    {
      schema: {
        description: 'Bulk create stations in a branch',
        tags: ['Stations'],
        security: [{ bearerAuth: [] }],
        params: branchIdParamSchema,
        body: bulkCreateStationsBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requireRole(['super_owner', 'regional_manager', 'branch_manager']),
        requireBranchAccess('branchId'),
      ],
    },
    async (request, reply) => {
      return stationsController.bulkCreateStations(request as any, reply);
    }
  );

  // ============================================
  // Station-specific Routes
  // ============================================

  // GET /stations/:id - Get a single station
  app.get(
    '/stations/:id',
    {
      schema: {
        description: 'Get a single station by ID',
        tags: ['Stations'],
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
      return stationsController.getStationById(request as any, reply);
    }
  );

  // PATCH /stations/:id - Update a station
  app.patch(
    '/stations/:id',
    {
      schema: {
        description: 'Update a station',
        tags: ['Stations'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateStationBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requireRole(['super_owner', 'regional_manager', 'branch_manager']),
      ],
    },
    async (request, reply) => {
      return stationsController.updateStation(request as any, reply);
    }
  );

  // DELETE /stations/:id - Delete a station (soft delete)
  app.delete(
    '/stations/:id',
    {
      schema: {
        description: 'Delete a station (soft delete)',
        tags: ['Stations'],
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
      preHandler: [
        authenticate,
        requireRole(['super_owner', 'regional_manager', 'branch_manager']),
      ],
    },
    async (request, reply) => {
      return stationsController.deleteStation(request as any, reply);
    }
  );
}
