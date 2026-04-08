/**
 * Package Routes
 * API route definitions for package management
 * Requirements: 2.1, 2.2
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission, requireBranchAccess } from '../../middleware';
import * as controller from './package.controller';
import {
  createPackageBodySchema,
  updatePackageBodySchema,
  packageQuerySchema,
  idParamSchema,
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
} from './package.schema';

export default async function packageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /packages - List all packages
  app.get(
    '/packages',
    {
      schema: {
        description: 'Get all packages with filtering and pagination',
        tags: ['Packages'],
        security: [{ bearerAuth: [] }],
        querystring: packageQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    controller.listPackages as any
  );

  // POST /packages - Create a new package
  app.post(
    '/packages',
    {
      schema: {
        description: 'Create a new package',
        tags: ['Packages'],
        security: [{ bearerAuth: [] }],
        body: createPackageBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    controller.createPackage as any
  );

  // GET /packages/:id - Get a single package
  app.get(
    '/packages/:id',
    {
      schema: {
        description: 'Get a single package by ID',
        tags: ['Packages'],
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
    controller.getPackageById as any
  );

  // PATCH /packages/:id - Update a package
  app.patch(
    '/packages/:id',
    {
      schema: {
        description: 'Update a package',
        tags: ['Packages'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updatePackageBodySchema,
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
    controller.updatePackage as any
  );

  // DELETE /packages/:id - Deactivate a package
  app.delete(
    '/packages/:id',
    {
      schema: {
        description: 'Deactivate a package',
        tags: ['Packages'],
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
    controller.deletePackage as any
  );

  // GET /branches/:branchId/packages - Get packages available at a branch
  app.get(
    '/branches/:branchId/packages',
    {
      schema: {
        description: 'Get packages available at a specific branch',
        tags: ['Packages'],
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
    controller.getPackagesForBranch as any
  );
}
