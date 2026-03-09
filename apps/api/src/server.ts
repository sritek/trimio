/**
 * Fastify Server Entry Point
 * Based on: .cursor/rules/00-architecture.mdc and .cursor/rules/13-backend-implementation.mdc
 */

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
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
import { waitlistRoutes } from './modules/waitlist';
import { tenantRoutes } from './modules/tenant';
import { usersRoutes } from './modules/users';
import { stationTypesRoutes } from './modules/station-types';
import { stationsRoutes } from './modules/stations';
import { floorViewRoutes } from './modules/floor-view';

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

// Custom error handler for Zod validation errors
fastify.setErrorHandler((error, request, reply) => {
  // Handle Zod validation errors from fastify-type-provider-zod
  // The error.code is 'FST_ERR_VALIDATION' and error.message contains the Zod error JSON
  if (error.code === 'FST_ERR_VALIDATION') {
    let details: Array<{ field: string; message: string }> = [];

    try {
      // Parse the Zod error from the message
      const zodErrors = JSON.parse(error.message);
      details = zodErrors.map((err: any) => ({
        field: err.path?.join('.') || 'unknown',
        message: err.message || 'Validation failed',
      }));
    } catch {
      // If parsing fails, use the raw message
      details = [{ field: 'unknown', message: error.message }];
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details,
      },
    });
  }

  // Handle AJV validation errors (from inline JSON schemas)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.validation.map((err: any) => ({
          field: err.instancePath?.replace(/^\//, '') || err.params?.missingProperty || 'unknown',
          message: err.message || 'Validation failed',
        })),
      },
    });
  }

  // Handle other Fastify errors
  if (error.statusCode) {
    const response: any = {
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message,
      },
    };

    // Include details if present (e.g., conflict data from AppError)
    if ('details' in error && error.details) {
      response.error.details = error.details;
    }

    return reply.status(error.statusCode).send(response);
  }

  // Handle unexpected errors
  request.log.error(error);
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    },
  });
});

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

  // Swagger documentation with Zod schema transform
  // Note: jsonSchemaTransform will be enabled after all routes are refactored to use Zod schemas
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Salon Ops API',
        description: 'API documentation for Salon Management Platform',
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

  // Waitlist routes
  fastify.register(waitlistRoutes, { prefix: '/api/v1/waitlist' });

  // Station Types routes
  fastify.register(stationTypesRoutes, { prefix: '/api/v1' });

  // Stations routes
  fastify.register(stationsRoutes, { prefix: '/api/v1' });

  // Floor View routes
  fastify.register(floorViewRoutes, { prefix: '/api/v1' });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

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
    process.exit(0);
  });
});

start();
