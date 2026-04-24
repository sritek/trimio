/**
 * Internal Admin Routes
 * Protected routes for company-only tenant provisioning
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { env } from '../../config/env';
import { successResponse, paginatedResponse } from '../../lib/response';
import { errorResponseSchema } from '../../lib/fastify-zod';
import { uploadToS3, generateLogoKey } from '../../lib/s3';
import { internalService } from './internal.service';
import { verifyAdminCredentials, authenticateAdmin } from './internal.middleware';
import {
  adminLoginBodySchema,
  adminLoginResponseSchema,
  createTenantBodySchema,
  createBranchBodySchema,
  createSuperOwnerBodySchema,
  listTenantsQuerySchema,
  updateTenantBodySchema,
  updateBranchBodySchema,
  updateSuperOwnerBodySchema,
  updateLoyaltyConfigBodySchema,
  createSubscriptionBodySchema,
  cancelSubscriptionBodySchema,
  reactivateSubscriptionBodySchema,
  createPlanBodySchema,
  updatePlanBodySchema,
  listPlansQuerySchema,
  updateSubscriptionStatusBodySchema,
  extendTrialBodySchema,
  applyDiscountBodySchema,
} from './internal.schema';
import { subscriptionsService } from '../subscriptions/subscriptions.service';

export default async function internalRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /internal/login - Admin login
  app.post(
    '/login',
    {
      schema: {
        description: 'Internal admin login',
        tags: ['Internal Admin'],
        body: adminLoginBodySchema,
        response: {
          200: adminLoginResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      if (!verifyAdminCredentials(email, password)) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid admin credentials',
          },
        });
      }

      // Generate admin JWT token
      const accessToken = app.jwt.sign(
        {
          type: 'internal_admin',
          email,
        },
        { expiresIn: env.INTERNAL_ADMIN_TOKEN_EXPIRY }
      );

      return reply.send({
        success: true,
        data: {
          accessToken,
          admin: { email },
        },
      });
    }
  );

  // All routes below require admin authentication
  app.register(async (protectedRoutes) => {
    const protectedApp = protectedRoutes.withTypeProvider<ZodTypeProvider>();

    // Add admin auth to all routes in this scope
    protectedApp.addHook('preHandler', authenticateAdmin);

    // GET /internal/tenants - List all tenants
    protectedApp.get(
      '/tenants',
      {
        schema: {
          description: 'List all tenants',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          querystring: listTenantsQuerySchema,
        },
      },
      async (request, reply) => {
        const result = await internalService.listTenants(request.query);
        return reply.send(paginatedResponse(result.data as any[], result.meta));
      }
    );

    // GET /internal/tenants/:id - Get tenant details
    protectedApp.get(
      '/tenants/:id',
      {
        schema: {
          description: 'Get tenant details with branches and owners',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const tenant = await internalService.getTenantById(id);
        return reply.send(successResponse(tenant));
      }
    );

    // POST /internal/tenants - Create tenant
    protectedApp.post(
      '/tenants',
      {
        schema: {
          description: 'Create a new tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: createTenantBodySchema,
        },
      },
      async (request, reply) => {
        const tenant = await internalService.createTenant(request.body);
        return reply.status(201).send(successResponse(tenant));
      }
    );

    // PATCH /internal/tenants/:id - Update tenant
    protectedApp.patch(
      '/tenants/:id',
      {
        schema: {
          description: 'Update a tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: updateTenantBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const tenant = await internalService.updateTenant(id, request.body);
        return reply.send(successResponse(tenant));
      }
    );

    // POST /internal/branches - Create branch
    protectedApp.post(
      '/branches',
      {
        schema: {
          description: 'Create a branch for a tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: createBranchBodySchema,
        },
      },
      async (request, reply) => {
        const branch = await internalService.createBranch(request.body);
        return reply.status(201).send(successResponse(branch));
      }
    );

    // PATCH /internal/branches/:id - Update branch
    protectedApp.patch(
      '/branches/:id',
      {
        schema: {
          description: 'Update a branch',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: updateBranchBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const branch = await internalService.updateBranch(id, request.body);
        return reply.send(successResponse(branch));
      }
    );

    // POST /internal/users - Create super owner
    protectedApp.post(
      '/users',
      {
        schema: {
          description: 'Create a super owner user for a tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: createSuperOwnerBodySchema,
        },
      },
      async (request, reply) => {
        const user = await internalService.createSuperOwner(request.body);
        return reply.status(201).send(successResponse(user));
      }
    );

    // PATCH /internal/users/:id - Update super owner
    protectedApp.patch(
      '/users/:id',
      {
        schema: {
          description: 'Update a super owner user',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: updateSuperOwnerBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = await internalService.updateSuperOwner(id, request.body);
        return reply.send(successResponse(user));
      }
    );

    // GET /internal/tenants/:tenantId/loyalty-config - Get loyalty config
    protectedApp.get(
      '/tenants/:tenantId/loyalty-config',
      {
        schema: {
          description: 'Get loyalty configuration for a tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        const config = await internalService.getLoyaltyConfig(tenantId);
        return reply.send(successResponse(config));
      }
    );

    // PATCH /internal/tenants/:tenantId/loyalty-config - Update loyalty config
    protectedApp.patch(
      '/tenants/:tenantId/loyalty-config',
      {
        schema: {
          description: 'Update loyalty configuration for a tenant',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
          body: updateLoyaltyConfigBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        const config = await internalService.updateLoyaltyConfig(tenantId, request.body);
        return reply.send(successResponse(config));
      }
    );

    // ============================================
    // SUBSCRIPTION MANAGEMENT ROUTES
    // ============================================

    // GET /internal/subscriptions/plans - List all subscription plans
    protectedApp.get(
      '/subscriptions/plans',
      {
        schema: {
          description: 'List all subscription plans',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          querystring: listPlansQuerySchema,
        },
      },
      async (request, reply) => {
        const plans = await subscriptionsService.listPlans(request.query);
        return reply.send(successResponse(plans));
      }
    );

    // GET /internal/subscriptions/plans/:id - Get a subscription plan by ID
    protectedApp.get(
      '/subscriptions/plans/:id',
      {
        schema: {
          description: 'Get a subscription plan by ID',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const plan = await subscriptionsService.getPlanById(id);
        return reply.send(successResponse(plan));
      }
    );

    // POST /internal/subscriptions/plans - Create a new subscription plan
    protectedApp.post(
      '/subscriptions/plans',
      {
        schema: {
          description: 'Create a new subscription plan',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: createPlanBodySchema,
        },
      },
      async (request, reply) => {
        const plan = await subscriptionsService.createPlan(request.body);
        return reply.status(201).send(successResponse(plan));
      }
    );

    // PATCH /internal/subscriptions/plans/:id - Update a subscription plan
    protectedApp.patch(
      '/subscriptions/plans/:id',
      {
        schema: {
          description: 'Update a subscription plan',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: updatePlanBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const plan = await subscriptionsService.updatePlan(id, request.body);
        return reply.send(successResponse(plan));
      }
    );

    // GET /internal/subscriptions/tenants/:tenantId/billing - Get billing overview for tenant
    protectedApp.get(
      '/subscriptions/tenants/:tenantId/billing',
      {
        schema: {
          description: 'Get billing overview for a tenant',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        const overview = await subscriptionsService.getBillingOverview(tenantId);
        return reply.send(successResponse(overview));
      }
    );

    // POST /internal/subscriptions/tenants/:tenantId/subscriptions - Create subscription for branch
    protectedApp.post(
      '/subscriptions/tenants/:tenantId/subscriptions',
      {
        schema: {
          description: 'Create a subscription for a branch',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: createSubscriptionBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        // Use 'internal-admin' as the userId for audit purposes
        const subscription = await subscriptionsService.createSubscription(
          tenantId,
          request.body,
          'internal-admin'
        );
        return reply.status(201).send(successResponse(subscription));
      }
    );

    // POST /internal/subscriptions/tenants/:tenantId/branches/:branchId/cancel - Cancel subscription
    protectedApp.post(
      '/subscriptions/tenants/:tenantId/branches/:branchId/cancel',
      {
        schema: {
          description: 'Cancel a branch subscription',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: cancelSubscriptionBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const subscription = await subscriptionsService.cancelSubscription(
          tenantId,
          branchId,
          request.body,
          'internal-admin'
        );
        return reply.send(successResponse(subscription));
      }
    );

    // POST /internal/subscriptions/tenants/:tenantId/branches/:branchId/reactivate - Reactivate subscription
    protectedApp.post(
      '/subscriptions/tenants/:tenantId/branches/:branchId/reactivate',
      {
        schema: {
          description: 'Reactivate a cancelled or suspended subscription',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: reactivateSubscriptionBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const subscription = await subscriptionsService.reactivateSubscription(
          tenantId,
          branchId,
          request.body,
          'internal-admin'
        );
        return reply.send(successResponse(subscription));
      }
    );

    // PATCH /internal/subscriptions/tenants/:tenantId/branches/:branchId/status - Update subscription status
    protectedApp.patch(
      '/subscriptions/tenants/:tenantId/branches/:branchId/status',
      {
        schema: {
          description: 'Manually update subscription status (admin only)',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: updateSubscriptionStatusBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const subscription = await subscriptionsService.updateSubscriptionStatus(
          tenantId,
          branchId,
          request.body,
          'internal-admin'
        );
        return reply.send(successResponse(subscription));
      }
    );

    // POST /internal/subscriptions/tenants/:tenantId/branches/:branchId/extend-trial - Extend trial
    protectedApp.post(
      '/subscriptions/tenants/:tenantId/branches/:branchId/extend-trial',
      {
        schema: {
          description: 'Extend trial period for a subscription (admin only)',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: extendTrialBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const subscription = await subscriptionsService.extendTrial(
          tenantId,
          branchId,
          request.body,
          'internal-admin'
        );
        return reply.send(successResponse(subscription));
      }
    );

    // PATCH /internal/subscriptions/tenants/:tenantId/branches/:branchId/discount - Apply discount
    protectedApp.patch(
      '/subscriptions/tenants/:tenantId/branches/:branchId/discount',
      {
        schema: {
          description: 'Apply or update discount on a subscription (admin only)',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
          body: applyDiscountBodySchema,
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const subscription = await subscriptionsService.applyDiscount(
          tenantId,
          branchId,
          request.body,
          'internal-admin'
        );
        return reply.send(successResponse(subscription));
      }
    );

    // GET /internal/subscriptions/tenants/:tenantId/branches/:branchId/history - Get subscription history
    protectedApp.get(
      '/subscriptions/tenants/:tenantId/branches/:branchId/history',
      {
        schema: {
          description: 'Get subscription history for a branch',
          tags: ['Internal Admin - Subscriptions'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { tenantId, branchId } = request.params as { tenantId: string; branchId: string };
        const history = await subscriptionsService.getSubscriptionHistory(tenantId, branchId);
        return reply.send(successResponse(history));
      }
    );

    // POST /internal/upload/logo - Upload tenant logo
    // Requires tenantId - upload after tenant is created
    protectedApp.post(
      '/upload/logo',
      {
        schema: {
          description: 'Upload a tenant logo image. Requires tenantId field.',
          tags: ['Internal Admin'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        request.log.info('[Upload] Starting logo upload...');

        try {
          const data = await request.file();

          if (!data) {
            return reply.status(400).send({
              success: false,
              error: {
                code: 'NO_FILE',
                message: 'No file uploaded',
              },
            });
          }

          // tenantId is required - no temp IDs allowed
          const tenantIdField = data.fields.tenantId as { value?: string } | undefined;
          const tenantId = tenantIdField?.value;

          if (!tenantId) {
            // Must consume the file stream to prevent hanging
            await data.toBuffer();
            return reply.status(400).send({
              success: false,
              error: {
                code: 'MISSING_TENANT_ID',
                message: 'tenantId is required. Create the tenant first, then upload the logo.',
              },
            });
          }

          request.log.info(
            { filename: data.filename, mimetype: data.mimetype, tenantId },
            '[Upload] File received'
          );

          // Validate file type
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
          if (!allowedTypes.includes(data.mimetype)) {
            await data.toBuffer();
            return reply.status(400).send({
              success: false,
              error: {
                code: 'INVALID_FILE_TYPE',
                message: 'Only JPEG, PNG, WebP, and SVG images are allowed',
              },
            });
          }

          // Convert stream to buffer
          const buffer = await data.toBuffer();

          // Generate key and upload
          const key = generateLogoKey(tenantId, data.filename);
          request.log.info({ key }, '[Upload] Uploading to S3');

          const result = await uploadToS3(buffer, key, data.mimetype);
          request.log.info({ url: result.url }, '[Upload] Success!');

          return reply.send(
            successResponse({
              key: result.key,
              url: result.url,
              filename: data.filename,
              mimetype: data.mimetype,
              size: buffer.length,
            })
          );
        } catch (err) {
          request.log.error({ err }, '[Upload] Error');
          return reply.status(500).send({
            success: false,
            error: {
              code: 'UPLOAD_FAILED',
              message: err instanceof Error ? err.message : 'Failed to upload file',
            },
          });
        }
      }
    );
  });
}
