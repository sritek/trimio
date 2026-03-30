/**
 * Customers Routes
 * API route definitions for customer management using Zod type provider
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.guard';

import { customersController } from './customers.controller';
import { tagsService } from './tags.service';
import { loyaltyService } from './loyalty.service';
import { walletService } from './wallet.service';
import {
  // Input schemas
  createCustomerBodySchema,
  updateCustomerBodySchema,
  updateCustomerPhoneBodySchema,
  customerQuerySchema,
  customerSearchQuerySchema,
  phoneLookupQuerySchema,
  createNoteBodySchema,
  notesQuerySchema,
  createTagBodySchema,
  addTagsBodySchema,
  loyaltyConfigSchema,
  adjustLoyaltyBodySchema,
  loyaltyQuerySchema,
  adjustWalletBodySchema,
  walletQuerySchema,
  // Response schemas
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
  // Param schemas
  idParamSchema,
  customerTagParamsSchema,
  unblockBodySchema,
} from './customers.schema';

export default async function customersRoutes(fastify: FastifyInstance) {
  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Customer CRUD
  // ============================================

  // List customers
  app.get(
    '/customers',
    {
      schema: {
        description: 'Get paginated list of customers with optional filters',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        querystring: customerQuerySchema,
        response: {
          200: paginatedResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.getCustomers(request as any, reply);
    }
  );

  // Search customers (quick lookup)
  app.get(
    '/customers/search',
    {
      schema: {
        description: 'Quick search customers for autocomplete',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        querystring: customerSearchQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.searchCustomers(request as any, reply);
    }
  );

  // Lookup customer by phone (exact match)
  // Note: Using /phone-lookup path to avoid conflict with /customers/:id route
  app.get(
    '/customers/phone-lookup',
    {
      schema: {
        description: 'Check if customer exists by exact phone number',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        querystring: phoneLookupQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.lookupByPhone(request as any, reply);
    }
  );

  // Get single customer
  app.get(
    '/customers/:id',
    {
      schema: {
        description: 'Get customer by ID',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.getCustomerById(request as any, reply);
    }
  );

  // Create customer
  app.post(
    '/customers',
    {
      schema: {
        description: 'Create a new customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        body: createCustomerBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:write')],
    },
    async (request, reply) => {
      return customersController.createCustomer(request as any, reply);
    }
  );

  // Update customer
  app.patch(
    '/customers/:id',
    {
      schema: {
        description: 'Update customer details (phone cannot be changed here)',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateCustomerBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:write')],
    },
    async (request, reply) => {
      return customersController.updateCustomer(request as any, reply);
    }
  );

  // Update customer phone (manager only)
  app.patch(
    '/customers/:id/phone',
    {
      schema: {
        description: 'Update customer phone number (requires manager permission)',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateCustomerPhoneBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      return customersController.updateCustomerPhone(request as any, reply);
    }
  );

  // Delete (deactivate) customer
  app.delete(
    '/customers/:id',
    {
      schema: {
        description: 'Soft delete (deactivate) a customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      return customersController.deleteCustomer(request as any, reply);
    }
  );

  // Reactivate customer
  app.post(
    '/customers/:id/reactivate',
    {
      schema: {
        description: 'Reactivate a deactivated customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      return customersController.reactivateCustomer(request as any, reply);
    }
  );

  // Unblock customer from booking restrictions
  app.post(
    '/customers/:id/unblock',
    {
      schema: {
        description: 'Unblock customer from booking restrictions (reset no-show count)',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: unblockBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      return customersController.unblockCustomer(request as any, reply);
    }
  );

  // ============================================
  // Customer Notes
  // ============================================

  // Get customer notes
  app.get(
    '/customers/:id/notes',
    {
      schema: {
        description: 'Get paginated notes for a customer',
        tags: ['Customer Notes'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: notesQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.getCustomerNotes(request as any, reply);
    }
  );

  // Add customer note
  app.post(
    '/customers/:id/notes',
    {
      schema: {
        description: 'Add a note to a customer',
        tags: ['Customer Notes'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: createNoteBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:write')],
    },
    async (request, reply) => {
      return customersController.addCustomerNote(request as any, reply);
    }
  );

  // ============================================
  // Customer Stats
  // ============================================

  app.get(
    '/customers/:id/stats',
    {
      schema: {
        description: 'Get customer statistics (visits, spend, etc.)',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      return customersController.getCustomerStats(request as any, reply);
    }
  );

  // ============================================
  // Tags
  // ============================================

  // Get custom tags
  app.get(
    '/tags',
    {
      schema: {
        description: 'Get all custom tags for the tenant',
        tags: ['Tags'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const tags = await tagsService.getCustomTags(tenantId);
      return reply.send({ success: true, data: tags });
    }
  );

  // Create custom tag
  app.post(
    '/tags',
    {
      schema: {
        description: 'Create a new custom tag',
        tags: ['Tags'],
        security: [{ bearerAuth: [] }],
        body: createTagBodySchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      try {
        const { tenantId, sub } = (request as any).user;
        const tag = await tagsService.createCustomTag(tenantId, request.body, sub);
        return reply.code(201).send({ success: true, data: tag });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create tag';
        return reply.code(400).send({
          success: false,
          error: { code: 'CREATE_TAG_FAILED', message },
        });
      }
    }
  );

  // Delete custom tag
  app.delete(
    '/tags/:id',
    {
      schema: {
        description: 'Delete a custom tag',
        tags: ['Tags'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      try {
        const { tenantId } = (request as any).user;
        await tagsService.deleteCustomTag(tenantId, request.params.id);
        return reply.send({ success: true, data: { message: 'Tag deleted' } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete tag';
        return reply.code(400).send({
          success: false,
          error: { code: 'DELETE_TAG_FAILED', message },
        });
      }
    }
  );

  // Add tags to customer
  app.post(
    '/customers/:id/tags',
    {
      schema: {
        description: 'Add tags to a customer',
        tags: ['Customer Tags'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: addTagsBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:write')],
    },
    async (request, reply) => {
      try {
        const { tenantId, sub } = (request as any).user;
        const customer = await tagsService.addTagsToCustomer(
          tenantId,
          request.params.id,
          request.body.tags,
          sub
        );
        return reply.send({ success: true, data: customer });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add tags';
        return reply.code(400).send({
          success: false,
          error: { code: 'ADD_TAGS_FAILED', message },
        });
      }
    }
  );

  // Remove tag from customer
  app.delete(
    '/customers/:id/tags/:tag',
    {
      schema: {
        description: 'Remove a tag from a customer',
        tags: ['Customer Tags'],
        security: [{ bearerAuth: [] }],
        params: customerTagParamsSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:write')],
    },
    async (request, reply) => {
      try {
        const { tenantId, sub } = (request as any).user;
        const customer = await tagsService.removeTagFromCustomer(
          tenantId,
          request.params.id,
          request.params.tag,
          sub
        );
        return reply.send({ success: true, data: customer });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove tag';
        return reply.code(400).send({
          success: false,
          error: { code: 'REMOVE_TAG_FAILED', message },
        });
      }
    }
  );

  // ============================================
  // Loyalty
  // ============================================

  // Get loyalty config
  app.get(
    '/loyalty/config',
    {
      schema: {
        description: 'Get loyalty program configuration',
        tags: ['Loyalty'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const config = await loyaltyService.getLoyaltyConfig(tenantId);
      return reply.send({ success: true, data: config });
    }
  );

  // Update loyalty config
  app.patch(
    '/loyalty/config',
    {
      schema: {
        description: 'Update loyalty program configuration',
        tags: ['Loyalty'],
        security: [{ bearerAuth: [] }],
        body: loyaltyConfigSchema.partial(),
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const config = await loyaltyService.updateLoyaltyConfig(tenantId, request.body);
      return reply.send({ success: true, data: config });
    }
  );

  // Get customer loyalty balance and history
  app.get(
    '/customers/:id/loyalty',
    {
      schema: {
        description: 'Get customer loyalty points balance and transaction history',
        tags: ['Customer Loyalty'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: loyaltyQuerySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      try {
        const { tenantId } = (request as any).user;
        const result = await loyaltyService.getLoyaltyBalance(
          tenantId,
          request.params.id,
          request.query
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get loyalty';
        return reply.code(400).send({
          success: false,
          error: { code: 'GET_LOYALTY_FAILED', message },
        });
      }
    }
  );

  // Adjust loyalty points (manager only)
  app.post(
    '/customers/:id/loyalty/adjust',
    {
      schema: {
        description: 'Manually adjust customer loyalty points (requires manager permission)',
        tags: ['Customer Loyalty'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: adjustLoyaltyBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      try {
        const { tenantId, sub } = (request as any).user;
        const result = await loyaltyService.adjustLoyaltyPoints(
          tenantId,
          request.params.id,
          request.body,
          sub
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to adjust loyalty';
        return reply.code(400).send({
          success: false,
          error: { code: 'ADJUST_LOYALTY_FAILED', message },
        });
      }
    }
  );

  // ============================================
  // Wallet
  // ============================================

  // Get customer wallet balance and history
  app.get(
    '/customers/:id/wallet',
    {
      schema: {
        description: 'Get customer wallet balance and transaction history',
        tags: ['Customer Wallet'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: walletQuerySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:read')],
    },
    async (request, reply) => {
      try {
        const { tenantId } = (request as any).user;
        const result = await walletService.getWalletBalance(
          tenantId,
          request.params.id,
          request.query
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get wallet';
        return reply.code(400).send({
          success: false,
          error: { code: 'GET_WALLET_FAILED', message },
        });
      }
    }
  );

  // Adjust wallet balance (manager only)
  app.post(
    '/customers/:id/wallet/adjust',
    {
      schema: {
        description: 'Manually adjust customer wallet balance (requires manager permission)',
        tags: ['Customer Wallet'],
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: adjustWalletBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requirePermission('customers:manage')],
    },
    async (request, reply) => {
      try {
        const { tenantId, sub } = (request as any).user;
        const result = await walletService.adjustWalletBalance(
          tenantId,
          request.params.id,
          request.body,
          sub
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to adjust wallet';
        return reply.code(400).send({
          success: false,
          error: { code: 'ADJUST_WALLET_FAILED', message },
        });
      }
    }
  );
}
