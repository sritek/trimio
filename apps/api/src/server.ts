/**
 * Fastify Server Entry Point
 * Based on: .cursor/rules/00-architecture.mdc and .cursor/rules/13-backend-implementation.mdc
 */

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import Fastify from 'fastify';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './lib/error-handler';
import authRoutes from './modules/auth/auth.routes';
import servicesRoutes from './modules/services/services.routes';
import customersRoutes from './modules/customers/customers.routes';
import { appointmentsRoutes } from './modules/appointments';
import { billingRoutes } from './modules/billing';
import { staffRoutes } from './modules/staff';
import productRoutes from './modules/inventory/product.routes';
import vendorRoutes from './modules/inventory/vendor.routes';
import purchaseOrderRoutes from './modules/inventory/purchase-order.routes';
import goodsReceiptRoutes from './modules/inventory/goods-receipt.routes';
import stockRoutes from './modules/inventory/stock.routes';
import transferRoutes from './modules/inventory/transfer.routes';
import auditRoutes from './modules/inventory/audit.routes';
import serviceConsumableRoutes from './modules/inventory/service-consumable.routes';
import {
  membershipPlanRoutes,
  packageRoutes,
  customerMembershipRoutes,
  customerPackageRoutes,
  redemptionRoutes,
  membershipConfigRoutes,
} from './modules/memberships';
import { dashboardRoutes } from './modules/dashboard';
import { calendarRoutes } from './modules/calendar';
import { realTimeRoutes } from './modules/real-time';
import { searchRoutes } from './modules/search';
import { branchRoutes } from './modules/branches';
import { tenantRoutes } from './modules/tenant';
import { usersRoutes } from './modules/users';
import { stationTypesRoutes } from './modules/station-types';
import { stationsRoutes } from './modules/stations';
import { floorViewRoutes } from './modules/floor-view';
import { internalRoutes } from './modules/internal';
import { subscriptionsRoutes } from './modules/subscriptions';

// Import job workers (they self-initialize when Redis is enabled)
import './jobs/staff-jobs';
import './jobs/subscription-worker';
import { initializeScheduler } from './jobs/scheduler';
import { closeQueues } from './jobs/index';
import { closeStaffWorker } from './jobs/staff-jobs';
import { closeSubscriptionWorker } from './jobs/subscription-worker';

// Create Fastify instance with Zod type provider
const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
}).withTypeProvider<ZodTypeProvider>();

// Set Zod compilers for validation and serialization
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Global error handler
fastify.setErrorHandler(errorHandler);

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : [env.APP_URL],
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
      files: 1, // Only 1 file at a time
      fields: 10, // Allow up to 10 non-file fields
    },
    // Throw error when file size limit is reached (cleaner error handling)
    throwFileSizeLimit: true,
  });

  // Request timeout (30 seconds)
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.setTimeout(30000, () => {
      reply.status(408).send({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout',
        },
      });
    });
  });

  // Artificial delay for development testing (simulates real network latency)
  if (env.NODE_ENV === 'development' && env.API_DELAY_MS > 0) {
    fastify.addHook('preHandler', async () => {
      await new Promise((resolve) => setTimeout(resolve, env.API_DELAY_MS));
    });
    logger.info(`API delay enabled: ${env.API_DELAY_MS}ms per request`);
  }

  // Swagger documentation with Zod schema transform
  // Note: jsonSchemaTransform will be enabled after all routes are refactored to use Zod schemas
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Trimio API',
        description: 'API documentation for Trimio - Salon Management Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: env.API_URL,
          description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    // transform: jsonSchemaTransform, // Enable after all routes use Zod schemas
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

// Register routes
async function registerRoutes() {
  // Health check (no prefix)
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    features: {
      redis: env.ENABLE_REDIS,
      inventory: env.ENABLE_INVENTORY,
      memberships: env.ENABLE_MEMBERSHIPS,
    },
  }));

  // API v1 routes
  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  fastify.register(servicesRoutes, { prefix: '/api/v1' });
  fastify.register(customersRoutes, { prefix: '/api/v1' });
  fastify.register(appointmentsRoutes, { prefix: '/api/v1/appointments' });
  fastify.register(billingRoutes, { prefix: '/api/v1/invoices' });
  fastify.register(staffRoutes, { prefix: '/api/v1/staff' });

  // Inventory routes (conditionally enabled)
  if (env.ENABLE_INVENTORY) {
    fastify.register(productRoutes, { prefix: '/api/v1' });
    fastify.register(vendorRoutes, { prefix: '/api/v1' });
    fastify.register(purchaseOrderRoutes, { prefix: '/api/v1' });
    fastify.register(goodsReceiptRoutes, { prefix: '/api/v1' });
    fastify.register(stockRoutes, { prefix: '/api/v1' });
    fastify.register(transferRoutes, { prefix: '/api/v1' });
    fastify.register(auditRoutes, { prefix: '/api/v1' });
    fastify.register(serviceConsumableRoutes, { prefix: '/api/v1' });
    logger.info('Inventory module enabled');
  } else {
    logger.info('Inventory module disabled for pilot');
  }

  // Memberships & Packages routes (conditionally enabled)
  if (env.ENABLE_MEMBERSHIPS) {
    fastify.register(membershipPlanRoutes, { prefix: '/api/v1' });
    fastify.register(packageRoutes, { prefix: '/api/v1' });
    fastify.register(customerMembershipRoutes, { prefix: '/api/v1' });
    fastify.register(customerPackageRoutes, { prefix: '/api/v1' });
    fastify.register(redemptionRoutes, { prefix: '/api/v1' });
    fastify.register(membershipConfigRoutes, { prefix: '/api/v1' });
    logger.info('Memberships module enabled');
  } else {
    logger.info('Memberships module disabled for pilot');
  }

  // Dashboard routes
  fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });

  // Calendar routes
  fastify.register(calendarRoutes, { prefix: '/api/v1/calendar' });

  // Real-time events routes
  fastify.register(realTimeRoutes, { prefix: '/api/v1/events' });

  // Search routes
  fastify.register(searchRoutes, { prefix: '/api/v1' });

  // Branch routes
  fastify.register(branchRoutes, { prefix: '/api/v1/branches' });

  // Tenant routes
  fastify.register(tenantRoutes, { prefix: '/api/v1/tenant' });

  // Users routes
  fastify.register(usersRoutes, { prefix: '/api/v1/users' });

  // Station Types routes
  fastify.register(stationTypesRoutes, { prefix: '/api/v1' });

  // Stations routes
  fastify.register(stationsRoutes, { prefix: '/api/v1' });

  // Floor View routes
  fastify.register(floorViewRoutes, { prefix: '/api/v1' });

  // Internal Admin Portal routes (company-only)
  fastify.register(internalRoutes, { prefix: '/api/v1/internal' });

  // Subscriptions routes
  fastify.register(subscriptionsRoutes, { prefix: '/api/v1/subscriptions' });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    // Initialize job scheduler (no-op if Redis disabled)
    await initializeScheduler();

    await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`API documentation at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    // Close job queues and workers
    await closeStaffWorker();
    await closeSubscriptionWorker();
    await closeQueues();
    process.exit(0);
  });
});

start();
