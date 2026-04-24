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

    // Email (AWS SES)
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Development
    API_DELAY_MS: z.coerce.number().default(0), // Artificial delay for testing (ms)

    // Feature Flags
    ENABLE_REDIS: booleanSchema.default(false),

    // Module Feature Flags (Phase 1 pilot: only core modules enabled)
    ENABLE_INVENTORY: booleanSchema.default(false),
    ENABLE_MEMBERSHIPS: booleanSchema.default(false),
    ENABLE_ONLINE_BOOKING: booleanSchema.default(false),
    ENABLE_MARKETING: booleanSchema.default(false),

    // Internal Admin Portal
    INTERNAL_ADMIN_EMAIL: z.string().email().default('admin@trimio.com'),
    INTERNAL_ADMIN_PASSWORD: z.string().min(8).default('admin123456'),
    INTERNAL_ADMIN_TOKEN_EXPIRY: z.string().default('8h'),
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
