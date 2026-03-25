/**
 * Environment Variable Validation
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 1580-1645
 */

import 'dotenv/config';

import { z } from 'zod';

/**
 * Custom boolean schema that properly handles string values from .env files.
 * z.coerce.boolean() doesn't work correctly because Boolean("false") === true in JS.
 * This schema treats "true", "1", "yes" as true, everything else as false.
 */
const booleanSchema = z.union([z.boolean(), z.string()]).transform((val) => {
  if (typeof val === 'boolean') return val;
  return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
});

const envSchema = z
  .object({
    // Application
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    API_URL: z.string().url(),
    APP_URL: z.string().url(),

    // Database
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MIN: z.coerce.number().default(2),
    DATABASE_POOL_MAX: z.coerce.number().default(10),

    // Redis (optional when ENABLE_REDIS is false)
    REDIS_URL: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // AWS (optional for local)
    AWS_REGION: z.string().default('ap-south-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    CDN_URL: z.string().url().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Feature Flags
    ENABLE_REDIS: booleanSchema.default(false),

    // Module Feature Flags (Phase 1 pilot: only core modules enabled)
    ENABLE_INVENTORY: booleanSchema.default(false),
    ENABLE_MEMBERSHIPS: booleanSchema.default(false),
    ENABLE_ONLINE_BOOKING: booleanSchema.default(false),
    ENABLE_MARKETING: booleanSchema.default(false),

    // WhatsApp Notifications (Meta Cloud API)
    // All optional — app starts and runs without them.
    // Absence of WHATSAPP_ACCESS_TOKEN disables the notification system entirely.
    // Absence of other vars while ACCESS_TOKEN is set = misconfigured (logged as failed).
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED: z.string().optional(),
    WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED: z.string().optional(),
    WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED: z.string().optional(),
    WHATSAPP_TEMPLATE_INVOICE_FINALIZED: z.string().optional(),

    // Internal Admin Portal
    INTERNAL_ADMIN_EMAIL: z.string().email().default('admin@trimio.com'),
    INTERNAL_ADMIN_PASSWORD: z.string().min(8).default('admin123456'),
  })
  .refine((data) => !data.ENABLE_REDIS || (data.ENABLE_REDIS && data.REDIS_URL), {
    message: 'REDIS_URL is required when ENABLE_REDIS is true',
    path: ['REDIS_URL'],
  });

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
