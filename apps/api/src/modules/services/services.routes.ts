/**
 * Services Module Routes
 * All route definitions for the services module using Zod type provider
 * Protected with authentication and role-based permission guards
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { PERMISSIONS } from '@trimio/shared';

import { authenticate, requirePermission, requireBranchAccess } from '../../middleware';
import { addOnsController } from './addons.controller';
import { branchPricingController } from './branch-pricing.controller';
import { categoriesController } from './categories.controller';
import { combosController } from './combos.controller';
import { priceEngine } from './price-engine';
import { servicesController } from './services.controller';
import { variantsController } from './variants.controller';

import {
  // Input schemas
  bulkUpdateBranchPricesBodySchema,
  calculatePriceBodySchema,
  catalogQuerySchema,
  categoryQuerySchema,
  createAddOnBodySchema,
  createCategoryBodySchema,
  createComboBodySchema,
  createServiceBodySchema,
  createVariantBodySchema,
  mapAddOnsToServiceBodySchema,
  reorderCategoriesBodySchema,
  serviceQuerySchema,
  updateAddOnBodySchema,
  updateBranchPriceBodySchema,
  updateCategoryBodySchema,
  updateComboBodySchema,
  updateServiceBodySchema,
  updateVariantBodySchema,
  // Response schemas
  successResponseSchema,
  paginatedResponseSchema,
  errorResponseSchema,
  // Param schemas
  idParamSchema,
  serviceVariantParamsSchema,
  branchServiceParamsSchema,
  includeInactiveQuerySchema,
} from './services.schema';

export default async function servicesRoutes(fastify: FastifyInstance) {
  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Categories Routes
  // ============================================

  // GET /service-categories
  app.get(
    '/service-categories',
    {
      schema: {
        description: 'Get all service categories',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
        querystring: categoryQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      return categoriesController.getCategories(request as any, reply);
    }
  );

  // POST /service-categories
  app.post(
    '/service-categories',
    {
      schema: {
        description: 'Create a new service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
        body: createCategoryBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return categoriesController.createCategory(request as any, reply);
    }
  );

  // GET /service-categories/:id
  app.get(
    '/service-categories/:id',
    {
      schema: {
        description: 'Get a single service category',
        tags: ['Service Categories'],
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
    async (request, reply) => {
      return categoriesController.getCategoryById(request as any, reply);
    }
  );

  // PATCH /service-categories/:id
  app.patch(
    '/service-categories/:id',
    {
      schema: {
        description: 'Update a service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateCategoryBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return categoriesController.updateCategory(request as any, reply);
    }
  );

  // DELETE /service-categories/:id
  app.delete(
    '/service-categories/:id',
    {
      schema: {
        description: 'Delete a service category',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return categoriesController.deleteCategory(request as any, reply);
    }
  );

  // PATCH /service-categories/reorder
  app.patch(
    '/service-categories/reorder',
    {
      schema: {
        description: 'Reorder service categories',
        tags: ['Service Categories'],
        security: [{ bearerAuth: [] }],
        body: reorderCategoriesBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return categoriesController.reorderCategories(request as any, reply);
    }
  );

  // ============================================
  // Services Routes
  // ============================================

  // GET /services
  app.get(
    '/services',
    {
      schema: {
        description: 'Get all services',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        querystring: serviceQuerySchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      return servicesController.getServices(request as any, reply);
    }
  );

  // POST /services
  app.post(
    '/services',
    {
      schema: {
        description: 'Create a new service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        body: createServiceBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return servicesController.createService(request as any, reply);
    }
  );

  // GET /services/catalog
  app.get(
    '/services/catalog',
    {
      schema: {
        description: 'Get service catalog (hierarchical view)',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        querystring: catalogQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      return servicesController.getServiceCatalog(request as any, reply);
    }
  );

  // POST /services/calculate-price
  app.post(
    '/services/calculate-price',
    {
      schema: {
        description: 'Calculate price for services',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        body: calculatePriceBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      try {
        const { tenantId } = (request as any).user;
        const result = await priceEngine.calculatePrice(tenantId, request.body);
        return reply.send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate price';
        return reply.code(400).send({
          success: false,
          error: { code: 'CALCULATION_FAILED', message },
        });
      }
    }
  );

  // GET /services/:id
  app.get(
    '/services/:id',
    {
      schema: {
        description: 'Get a single service',
        tags: ['Services'],
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
    async (request, reply) => {
      return servicesController.getServiceById(request as any, reply);
    }
  );

  // PATCH /services/:id
  app.patch(
    '/services/:id',
    {
      schema: {
        description: 'Update a service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateServiceBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return servicesController.updateService(request as any, reply);
    }
  );

  // DELETE /services/:id
  app.delete(
    '/services/:id',
    {
      schema: {
        description: 'Delete a service',
        tags: ['Services'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return servicesController.deleteService(request as any, reply);
    }
  );

  // ============================================
  // Variants Routes
  // ============================================

  // GET /services/:id/variants
  app.get(
    '/services/:id/variants',
    {
      schema: {
        description: 'Get all variants for a service',
        tags: ['Service Variants'],
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
    async (request, reply) => {
      return variantsController.getVariants(request as any, reply);
    }
  );

  // POST /services/:id/variants
  app.post(
    '/services/:id/variants',
    {
      schema: {
        description: 'Create a new variant for a service',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: createVariantBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return variantsController.createVariant(request as any, reply);
    }
  );

  // PATCH /services/:id/variants/:vid
  app.patch(
    '/services/:id/variants/:vid',
    {
      schema: {
        description: 'Update a variant',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
        params: serviceVariantParamsSchema,
        body: updateVariantBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return variantsController.updateVariant(request as any, reply);
    }
  );

  // DELETE /services/:id/variants/:vid
  app.delete(
    '/services/:id/variants/:vid',
    {
      schema: {
        description: 'Delete a variant',
        tags: ['Service Variants'],
        security: [{ bearerAuth: [] }],
        params: serviceVariantParamsSchema,
        response: {
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return variantsController.deleteVariant(request as any, reply);
    }
  );

  // ============================================
  // Service Add-ons Routes (mapping to services)
  // ============================================

  // POST /services/:id/add-ons
  app.post(
    '/services/:id/add-ons',
    {
      schema: {
        description: 'Map add-ons to a service',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: mapAddOnsToServiceBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return addOnsController.mapAddOnsToService(request as any, reply);
    }
  );

  // ============================================
  // Branch Pricing Routes
  // ============================================

  // GET /branches/:id/service-prices
  app.get(
    '/branches/:id/service-prices',
    {
      schema: {
        description: 'Get all service prices for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_READ),
        requireBranchAccess('id'),
      ],
    },
    async (request, reply) => {
      return branchPricingController.getBranchServicePrices(request as any, reply);
    }
  );

  // PATCH /branches/:id/service-prices
  app.patch(
    '/branches/:id/service-prices',
    {
      schema: {
        description: 'Bulk update service prices for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: bulkUpdateBranchPricesBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        requireBranchAccess('id'),
      ],
    },
    async (request, reply) => {
      return branchPricingController.bulkUpdateBranchServicePrices(request as any, reply);
    }
  );

  // PATCH /branches/:id/services/:sid/price
  app.patch(
    '/branches/:id/services/:sid/price',
    {
      schema: {
        description: 'Update a single service price for a branch',
        tags: ['Branch Pricing'],
        security: [{ bearerAuth: [] }],
        params: branchServiceParamsSchema,
        body: updateBranchPriceBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [
        authenticate,
        requirePermission(PERMISSIONS.SERVICES_WRITE),
        requireBranchAccess('id'),
      ],
    },
    async (request, reply) => {
      return branchPricingController.updateBranchServicePrice(request as any, reply);
    }
  );

  // ============================================
  // Add-ons Routes (CRUD)
  // ============================================

  // GET /service-add-ons
  app.get(
    '/service-add-ons',
    {
      schema: {
        description: 'Get all service add-ons',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
        querystring: includeInactiveQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      return addOnsController.getAddOns(request as any, reply);
    }
  );

  // POST /service-add-ons
  app.post(
    '/service-add-ons',
    {
      schema: {
        description: 'Create a new service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
        body: createAddOnBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return addOnsController.createAddOn(request as any, reply);
    }
  );

  // PATCH /service-add-ons/:id
  app.patch(
    '/service-add-ons/:id',
    {
      schema: {
        description: 'Update a service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateAddOnBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return addOnsController.updateAddOn(request as any, reply);
    }
  );

  // DELETE /service-add-ons/:id
  app.delete(
    '/service-add-ons/:id',
    {
      schema: {
        description: 'Delete a service add-on',
        tags: ['Service Add-ons'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return addOnsController.deleteAddOn(request as any, reply);
    }
  );

  // ============================================
  // Combo Services Routes
  // ============================================

  // GET /combo-services
  app.get(
    '/combo-services',
    {
      schema: {
        description: 'Get all combo services',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
        querystring: includeInactiveQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
    },
    async (request, reply) => {
      return combosController.getCombos(request as any, reply);
    }
  );

  // POST /combo-services
  app.post(
    '/combo-services',
    {
      schema: {
        description: 'Create a new combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
        body: createComboBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return combosController.createCombo(request as any, reply);
    }
  );

  // GET /combo-services/:id
  app.get(
    '/combo-services/:id',
    {
      schema: {
        description: 'Get a single combo service',
        tags: ['Combo Services'],
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
    async (request, reply) => {
      return combosController.getComboById(request as any, reply);
    }
  );

  // PATCH /combo-services/:id
  app.patch(
    '/combo-services/:id',
    {
      schema: {
        description: 'Update a combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateComboBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return combosController.updateCombo(request as any, reply);
    }
  );

  // DELETE /combo-services/:id
  app.delete(
    '/combo-services/:id',
    {
      schema: {
        description: 'Delete a combo service',
        tags: ['Combo Services'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_WRITE)],
    },
    async (request, reply) => {
      return combosController.deleteCombo(request as any, reply);
    }
  );
}
