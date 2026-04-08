---
# Backend implementation patterns - Prisma, BullMQ, Redis, S3, and external integrations
inclusion: fileMatch
fileMatchPattern: 'apps/api/**/*.ts, **/lib/**/*.ts, **/jobs/**/*.ts'
---

# Backend Implementation Guide

## Overview

This document provides implementation patterns and setup guides for backend infrastructure components including Prisma ORM, BullMQ job queues, Redis caching, S3 file uploads, external service integrations, and operational concerns.

---

## 1. Prisma ORM Setup

### Schema Organization

```
prisma/
├── schema.prisma           # Main schema file with datasource and generator
├── migrations/             # Generated migrations
├── seed.ts                 # Database seeding script
└── schema/                 # Modular schema files (if using prisma-merge)
    ├── tenant.prisma
    ├── appointment.prisma
    ├── customer.prisma
    └── ...
```

### Main Schema Configuration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions"]
}

// Enable required PostgreSQL extensions
generator dbExtensions {
  provider = "prisma-client-js"
}
```

### Multi-Tenant RLS Integration

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Execute queries with tenant context (RLS)
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`
    );
    return callback(tx as PrismaClient);
  });
}

/**
 * Execute queries with tenant and branch context
 */
export async function withTenantAndBranch<T>(
  tenantId: string,
  branchId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_branch_id = '${branchId}'`
    );
    return callback(tx as PrismaClient);
  });
}
```

### Migration Workflow

```bash
# Development: Create migration after schema changes
npx prisma migrate dev --name <migration_name>

# Naming conventions for migrations:
# - add_<table>_table
# - add_<column>_to_<table>
# - create_<feature>_schema
# - alter_<table>_<change>
# - add_index_on_<table>_<columns>

# Production: Apply pending migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate
```

### Migration with RLS Policies

```sql
-- migrations/YYYYMMDDHHMMSS_add_customers_table/migration.sql

-- Create table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, phone)
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation ON customers
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create indexes
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_deleted ON customers(tenant_id, deleted_at) WHERE deleted_at IS NULL;
```

### Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create default roles and permissions
  const roles = await seedRoles();
  console.log(`✅ Created ${roles.length} roles`);

  // 2. Create demo tenant (development only)
  if (process.env.NODE_ENV === 'development') {
    const tenant = await seedDemoTenant();
    console.log(`✅ Created demo tenant: ${tenant.businessName}`);

    // 3. Create demo users
    const users = await seedDemoUsers(tenant.id);
    console.log(`✅ Created ${users.length} demo users`);

    // 4. Create demo services
    const services = await seedDemoServices(tenant.id);
    console.log(`✅ Created ${services.length} demo services`);
  }

  console.log('🎉 Seed completed successfully!');
}

async function seedRoles() {
  const roles = [
    { name: 'super_owner', displayName: 'Super Owner' },
    { name: 'regional_manager', displayName: 'Regional Manager' },
    { name: 'branch_manager', displayName: 'Branch Manager' },
    { name: 'receptionist', displayName: 'Receptionist' },
    { name: 'stylist', displayName: 'Stylist' },
    { name: 'accountant', displayName: 'Accountant' },
  ];

  return Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      })
    )
  );
}

async function seedDemoTenant() {
  const passwordHash = await hash('demo123', 10);

  return prisma.tenant.upsert({
    where: { slug: 'demo-salon' },
    update: {},
    create: {
      businessName: 'Demo Salon',
      slug: 'demo-salon',
      email: 'demo@salon.com',
      phone: '9876543210',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      branches: {
        create: {
          name: 'Main Branch',
          code: 'MAIN',
          address: '123 Demo Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9876543210',
          isActive: true,
        },
      },
    },
    include: { branches: true },
  });
}

async function seedDemoUsers(tenantId: string) {
  const passwordHash = await hash('demo123', 10);
  const branch = await prisma.branch.findFirst({ where: { tenantId } });

  const users = [
    {
      email: 'owner@demo.com',
      name: 'Demo Owner',
      role: 'super_owner',
    },
    {
      email: 'manager@demo.com',
      name: 'Demo Manager',
      role: 'branch_manager',
    },
    {
      email: 'stylist@demo.com',
      name: 'Demo Stylist',
      role: 'stylist',
    },
  ];

  return Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          tenantId,
          email: user.email,
          name: user.name,
          passwordHash,
          role: user.role,
          isActive: true,
          branchAssignments: branch
            ? {
                create: {
                  branchId: branch.id,
                  isPrimary: true,
                },
              }
            : undefined,
        },
      })
    )
  );
}

async function seedDemoServices(tenantId: string) {
  const categories = [
    {
      name: 'Hair Services',
      services: [
        { name: 'Haircut - Men', duration: 30, price: 300 },
        { name: 'Haircut - Women', duration: 45, price: 500 },
        { name: 'Hair Color', duration: 90, price: 1500 },
        { name: 'Hair Spa', duration: 60, price: 800 },
      ],
    },
    {
      name: 'Skin Services',
      services: [
        { name: 'Facial - Basic', duration: 45, price: 600 },
        { name: 'Facial - Premium', duration: 60, price: 1200 },
        { name: 'Cleanup', duration: 30, price: 400 },
      ],
    },
  ];

  const createdServices = [];

  for (const category of categories) {
    const cat = await prisma.serviceCategory.create({
      data: {
        tenantId,
        name: category.name,
        isActive: true,
      },
    });

    for (const service of category.services) {
      const svc = await prisma.service.create({
        data: {
          tenantId,
          categoryId: cat.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          isActive: true,
        },
      });
      createdServices.push(svc);
    }
  }

  return createdServices;
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

---

## 2. BullMQ Job Queues

### Queue Configuration

```typescript
// src/lib/queue/connection.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Shared Redis connection for queues
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60, // 24 hours
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 60 * 60, // 7 days
      },
    },
  });
};

export const createWorker = <T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: Partial<WorkerOptions>
) => {
  return new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency: 5,
    ...options,
  });
};

export { redisConnection };
```

### Queue Definitions

```typescript
// src/lib/queue/queues.ts
import { createQueue } from './connection';

// Define all application queues
export const queues = {
  // Notification queues
  notifications: createQueue('notifications'),
  emailNotifications: createQueue('email-notifications'),
  smsNotifications: createQueue('sms-notifications'),
  whatsappNotifications: createQueue('whatsapp-notifications'),

  // Appointment queues
  appointmentReminders: createQueue('appointment-reminders'),
  
  // Marketing queues
  campaigns: createQueue('campaigns'),
  triggers: createQueue('marketing-triggers'),

  // Reports queues
  reportGeneration: createQueue('report-generation'),
  dataSnapshots: createQueue('data-snapshots'),

  // Inventory queues
  stockAlerts: createQueue('stock-alerts'),
  expiryAlerts: createQueue('expiry-alerts'),

  // Payroll queues
  payrollGeneration: createQueue('payroll-generation'),

  // Recurring tasks
  recurringExpenses: createQueue('recurring-expenses'),
};
```

### Job Definitions

```typescript
// src/lib/queue/jobs/notification.job.ts
import { Job } from 'bullmq';

export interface NotificationJobData {
  tenantId: string;
  type: 'email' | 'sms' | 'whatsapp';
  templateId: string;
  recipientId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  variables: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

export const processNotification = async (job: Job<NotificationJobData>) => {
  const { type, templateId, recipientPhone, recipientEmail, variables } = job.data;

  try {
    switch (type) {
      case 'email':
        await sendEmail(recipientEmail!, templateId, variables);
        break;
      case 'sms':
        await sendSms(recipientPhone!, templateId, variables);
        break;
      case 'whatsapp':
        await sendWhatsapp(recipientPhone!, templateId, variables);
        break;
    }

    await job.updateProgress(100);
    return { success: true, sentAt: new Date() };
  } catch (error) {
    // Log error and let BullMQ retry
    console.error(`Notification job ${job.id} failed:`, error);
    throw error;
  }
};
```

```typescript
// src/lib/queue/jobs/appointment-reminder.job.ts
import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { queues } from '../queues';

export interface AppointmentReminderJobData {
  appointmentId: string;
  reminderType: '24h' | '1h' | '30m';
}

export const processAppointmentReminder = async (
  job: Job<AppointmentReminderJobData>
) => {
  const { appointmentId, reminderType } = job.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
      branch: true,
      services: { include: { service: true } },
    },
  });

  if (!appointment || appointment.status === 'cancelled') {
    return { skipped: true, reason: 'Appointment cancelled or not found' };
  }

  // Queue notification
  await queues.whatsappNotifications.add(
    'appointment-reminder',
    {
      tenantId: appointment.tenantId,
      type: 'whatsapp',
      templateId: `appointment_reminder_${reminderType}`,
      recipientId: appointment.customerId,
      recipientPhone: appointment.customer.phone,
      variables: {
        customerName: appointment.customer.name || 'Customer',
        branchName: appointment.branch.name,
        appointmentDate: formatDate(appointment.appointmentDate),
        appointmentTime: formatTime(appointment.startTime),
        services: appointment.services.map(s => s.service.name).join(', '),
      },
    },
    { priority: reminderType === '30m' ? 1 : 2 }
  );

  return { sent: true, reminderType };
};
```

### Worker Setup

```typescript
// src/lib/queue/workers/index.ts
import { createWorker } from '../connection';
import { processNotification } from '../jobs/notification.job';
import { processAppointmentReminder } from '../jobs/appointment-reminder.job';
import { processCampaign } from '../jobs/campaign.job';
import { processDataSnapshot } from '../jobs/snapshot.job';

export const startWorkers = () => {
  const workers = [
    // Notification workers
    createWorker('notifications', processNotification, { concurrency: 10 }),
    createWorker('email-notifications', processNotification, { concurrency: 5 }),
    createWorker('sms-notifications', processNotification, { concurrency: 5 }),
    createWorker('whatsapp-notifications', processNotification, { concurrency: 5 }),

    // Appointment workers
    createWorker('appointment-reminders', processAppointmentReminder, { concurrency: 10 }),

    // Marketing workers
    createWorker('campaigns', processCampaign, { concurrency: 3 }),

    // Report workers
    createWorker('data-snapshots', processDataSnapshot, { concurrency: 2 }),
  ];

  // Error handling for all workers
  workers.forEach((worker) => {
    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} in ${worker.name} failed:`, err.message);
      // Send to error tracking (Sentry)
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} in ${worker.name} completed`);
    });
  });

  console.log(`Started ${workers.length} queue workers`);
  return workers;
};
```

### Scheduled Jobs (Cron)

```typescript
// src/lib/queue/schedulers.ts
import { queues } from './queues';

export const setupScheduledJobs = async () => {
  // Daily data snapshots at 2 AM
  await queues.dataSnapshots.add(
    'daily-snapshot',
    { snapshotType: 'daily' },
    {
      repeat: {
        pattern: '0 2 * * *',
        tz: 'Asia/Kolkata',
      },
    }
  );

  // Appointment reminders check every 5 minutes
  await queues.appointmentReminders.add(
    'check-upcoming',
    { checkType: 'upcoming' },
    {
      repeat: {
        pattern: '*/5 * * * *',
      },
    }
  );

  // Stock alerts daily at 8 AM
  await queues.stockAlerts.add(
    'daily-stock-check',
    {},
    {
      repeat: {
        pattern: '0 8 * * *',
        tz: 'Asia/Kolkata',
      },
    }
  );

  // Expiry alerts daily at 9 AM
  await queues.expiryAlerts.add(
    'daily-expiry-check',
    {},
    {
      repeat: {
        pattern: '0 9 * * *',
        tz: 'Asia/Kolkata',
      },
    }
  );

  // Recurring expenses on 1st of each month at 6 AM
  await queues.recurringExpenses.add(
    'monthly-recurring',
    {},
    {
      repeat: {
        pattern: '0 6 1 * *',
        tz: 'Asia/Kolkata',
      },
    }
  );

  console.log('Scheduled jobs configured');
};
```

---

## 3. Redis Caching

### Redis Client Setup

```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

export default redis;
```

### Cache Service

```typescript
// src/lib/cache.ts
import redis from './redis';

export const cache = {
  /**
   * Get cached value or fetch from source
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const value = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  },

  /**
   * Set cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  },

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete cache keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Invalidate all cache for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delByPattern(`tenant:${tenantId}:*`);
  },
};
```

### Cache Key Conventions

```typescript
// src/lib/cache-keys.ts

/**
 * Cache key naming convention:
 * {scope}:{identifier}:{resource}:{sub-resource}
 * 
 * Scopes:
 * - tenant:{tenantId}  - Tenant-scoped data
 * - branch:{branchId}  - Branch-scoped data
 * - user:{userId}      - User-scoped data
 * - global             - Global/shared data
 * - session:{sessionId} - Session data
 */

export const cacheKeys = {
  // Tenant configuration
  tenantConfig: (tenantId: string) => `tenant:${tenantId}:config`,
  tenantTheme: (tenantId: string) => `tenant:${tenantId}:theme`,
  tenantSubscription: (tenantId: string) => `tenant:${tenantId}:subscription`,

  // Branch data
  branchConfig: (branchId: string) => `branch:${branchId}:config`,
  branchWorkingHours: (branchId: string, date: string) => 
    `branch:${branchId}:hours:${date}`,
  branchServices: (branchId: string) => `branch:${branchId}:services`,

  // User data
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  userTheme: (userId: string) => `user:${userId}:theme`,
  userSession: (sessionId: string) => `session:${sessionId}`,

  // Customer data
  customerProfile: (customerId: string) => `customer:${customerId}:profile`,
  customerMembership: (customerId: string) => `customer:${customerId}:membership`,
  customerPackages: (customerId: string) => `customer:${customerId}:packages`,

  // Online booking
  bookingConfig: (tenantId: string) => `tenant:${tenantId}:booking:config`,
  slotLock: (branchId: string, date: string, time: string) => 
    `branch:${branchId}:slot:${date}:${time}`,
  blacklist: (tenantId: string, phone: string) => 
    `tenant:${tenantId}:blacklist:${phone}`,

  // Marketing
  campaignStatus: (campaignId: string) => `campaign:${campaignId}:status`,
  throttle: (customerId: string, channel: string) => 
    `throttle:${customerId}:${channel}`,
};

// TTL values in seconds
export const cacheTTL = {
  config: 5 * 60,           // 5 minutes
  theme: 10 * 60,           // 10 minutes
  permissions: 5 * 60,      // 5 minutes
  workingHours: 60 * 60,    // 1 hour
  services: 5 * 60,         // 5 minutes
  customerProfile: 2 * 60,  // 2 minutes
  slotLock: 5 * 60,         // 5 minutes (slot lock duration)
  blacklist: 10 * 60,       // 10 minutes
  session: 24 * 60 * 60,    // 24 hours
};
```

### Cache Usage Examples

```typescript
// Example: Caching tenant configuration
async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  return cache.getOrSet(
    cacheKeys.tenantConfig(tenantId),
    async () => {
      const config = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true, settings: true },
      });
      return transformToConfig(config);
    },
    cacheTTL.config
  );
}

// Example: Cache invalidation on update
async function updateTenantConfig(
  tenantId: string,
  data: UpdateTenantConfigDto
): Promise<TenantConfig> {
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data,
  });

  // Invalidate cache
  await cache.del(cacheKeys.tenantConfig(tenantId));

  return transformToConfig(updated);
}

// Example: Rate limiting with Redis
async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + ttl * 1000;

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt,
  };
}
```

---

## 4. S3 File Uploads

### S3 Client Setup

```typescript
// src/lib/s3.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CDN_URL = process.env.CDN_URL; // CloudFront URL

export const s3 = {
  /**
   * Generate presigned URL for direct upload
   */
  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return { uploadUrl, key };
  },

  /**
   * Generate presigned URL for download
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // If CDN is configured, use it for public files
    if (CDN_URL && !key.startsWith('private/')) {
      return `${CDN_URL}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  },

  /**
   * Upload file directly (for server-side uploads)
   */
  async upload(
    key: string,
    body: Buffer | Readable,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    });

    await s3Client.send(command);
    return this.getPublicUrl(key);
  },

  /**
   * Delete file
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  },

  /**
   * Get public URL (via CloudFront or S3)
   */
  getPublicUrl(key: string): string {
    if (CDN_URL) {
      return `${CDN_URL}/${key}`;
    }
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  },
};
```

### File Upload Service

```typescript
// src/services/file-upload.service.ts
import { s3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * S3 folder structure:
 * {tenantId}/
 *   ├── profiles/           - User profile photos
 *   ├── services/           - Service images
 *   ├── products/           - Product images
 *   ├── invoices/           - Generated invoice PDFs
 *   ├── reports/            - Generated report files
 *   ├── expenses/           - Expense receipts/attachments
 *   └── marketing/          - Campaign images
 */

export class FileUploadService {
  /**
   * Request presigned URL for client-side upload
   */
  async requestUploadUrl(
    tenantId: string,
    folder: string,
    fileName: string,
    contentType: string,
    fileSize: number
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    // Validate file type
    this.validateFileType(folder, contentType);

    // Validate file size
    this.validateFileSize(folder, fileSize);

    // Generate unique key
    const ext = path.extname(fileName);
    const key = `${tenantId}/${folder}/${uuidv4()}${ext}`;

    // Get presigned URL
    const { uploadUrl } = await s3.getUploadUrl(key, contentType);
    const fileUrl = s3.getPublicUrl(key);

    return { uploadUrl, fileUrl, key };
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(
    tenantId: string,
    userId: string,
    file: Buffer,
    contentType: string
  ): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new Error('Invalid image type');
    }

    // Resize image if needed (using sharp)
    const processedImage = await this.processImage(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 80,
    });

    const key = `${tenantId}/profiles/${userId}.jpg`;
    return s3.upload(key, processedImage, 'image/jpeg');
  }

  /**
   * Upload expense attachment
   */
  async uploadExpenseAttachment(
    tenantId: string,
    expenseId: string,
    file: Buffer,
    contentType: string,
    originalName: string
  ): Promise<{ url: string; key: string }> {
    if (!ALLOWED_DOCUMENT_TYPES.includes(contentType)) {
      throw new Error('Invalid document type');
    }

    const ext = path.extname(originalName);
    const key = `${tenantId}/expenses/${expenseId}/${uuidv4()}${ext}`;
    const url = await s3.upload(key, file, contentType);

    return { url, key };
  }

  /**
   * Delete file
   */
  async deleteFile(key: string): Promise<void> {
    await s3.delete(key);
  }

  private validateFileType(folder: string, contentType: string): void {
    const imageOnlyFolders = ['profiles', 'services', 'products', 'marketing'];
    
    if (imageOnlyFolders.includes(folder)) {
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        throw new Error(`Invalid file type for ${folder}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      }
    } else {
      if (!ALLOWED_DOCUMENT_TYPES.includes(contentType)) {
        throw new Error(`Invalid file type. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
      }
    }
  }

  private validateFileSize(folder: string, size: number): void {
    const maxSize = folder === 'expenses' || folder === 'reports' 
      ? MAX_DOCUMENT_SIZE 
      : MAX_IMAGE_SIZE;

    if (size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }
  }

  private async processImage(
    buffer: Buffer,
    options: { maxWidth: number; maxHeight: number; quality: number }
  ): Promise<Buffer> {
    const sharp = (await import('sharp')).default;
    
    return sharp(buffer)
      .resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: options.quality })
      .toBuffer();
  }
}
```

---

## 5. External Service Integrations

### Payment Gateway Abstraction

```typescript
// src/lib/payment/types.ts
export interface PaymentOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: 'created' | 'paid' | 'failed';
}

export interface PaymentVerification {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number; // in paise
  reason?: string;
}

export interface RefundResponse {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}

export interface PaymentGateway {
  createOrder(amount: number, receipt: string, notes?: Record<string, string>): Promise<PaymentOrder>;
  verifyPayment(verification: PaymentVerification): Promise<boolean>;
  refund(request: RefundRequest): Promise<RefundResponse>;
  getPaymentDetails(paymentId: string): Promise<any>;
}
```

```typescript
// src/lib/payment/razorpay.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentGateway, PaymentOrder, PaymentVerification, RefundRequest, RefundResponse } from './types';

export class RazorpayGateway implements PaymentGateway {
  private client: Razorpay;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    this.keySecret = keySecret;
  }

  async createOrder(
    amount: number,
    receipt: string,
    notes?: Record<string, string>
  ): Promise<PaymentOrder> {
    const order = await this.client.orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes,
    });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: 'created',
    };
  }

  verifyPayment(verification: PaymentVerification): Promise<boolean> {
    const { orderId, paymentId, signature } = verification;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return Promise.resolve(expectedSignature === signature);
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refund = await this.client.payments.refund(request.paymentId, {
      amount: request.amount,
      notes: { reason: request.reason || 'Customer requested refund' },
    });

    return {
      id: refund.id,
      amount: refund.amount,
      status: refund.status === 'processed' ? 'processed' : 'pending',
    };
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    return this.client.payments.fetch(paymentId);
  }
}
```

```typescript
// src/lib/payment/factory.ts
import { PaymentGateway } from './types';
import { RazorpayGateway } from './razorpay';
import { PayUGateway } from './payu';
import { CashfreeGateway } from './cashfree';

export function createPaymentGateway(
  provider: 'razorpay' | 'payu' | 'cashfree',
  credentials: { keyId: string; keySecret: string }
): PaymentGateway {
  switch (provider) {
    case 'razorpay':
      return new RazorpayGateway(credentials.keyId, credentials.keySecret);
    case 'payu':
      return new PayUGateway(credentials.keyId, credentials.keySecret);
    case 'cashfree':
      return new CashfreeGateway(credentials.keyId, credentials.keySecret);
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
```

### Messaging Provider Abstraction

```typescript
// src/lib/messaging/types.ts
export interface MessageRequest {
  to: string;
  templateId: string;
  variables: Record<string, string>;
  language?: 'en' | 'hi';
}

export interface MessageResponse {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  provider: string;
  cost?: number;
}

export interface MessagingProvider {
  send(request: MessageRequest): Promise<MessageResponse>;
  getStatus(messageId: string): Promise<string>;
  getBalance(): Promise<number>;
}
```

```typescript
// src/lib/messaging/whatsapp/gupshup.ts
import axios from 'axios';
import { MessagingProvider, MessageRequest, MessageResponse } from '../types';

export class GupshupWhatsApp implements MessagingProvider {
  private apiKey: string;
  private sourcePhone: string;
  private baseUrl = 'https://api.gupshup.io/sm/api/v1';

  constructor(apiKey: string, sourcePhone: string) {
    this.apiKey = apiKey;
    this.sourcePhone = sourcePhone;
  }

  async send(request: MessageRequest): Promise<MessageResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/msg`,
        new URLSearchParams({
          channel: 'whatsapp',
          source: this.sourcePhone,
          destination: `91${request.to}`,
          'src.name': this.sourcePhone,
          message: JSON.stringify({
            type: 'template',
            template: {
              name: request.templateId,
              language: { code: request.language || 'en' },
              components: this.buildComponents(request.variables),
            },
          }),
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apikey': this.apiKey,
          },
        }
      );

      return {
        messageId: response.data.messageId,
        status: 'sent',
        provider: 'gupshup',
      };
    } catch (error) {
      console.error('Gupshup WhatsApp error:', error);
      throw error;
    }
  }

  async getStatus(messageId: string): Promise<string> {
    // Implementation for status check
    return 'delivered';
  }

  async getBalance(): Promise<number> {
    // Implementation for balance check
    return 0;
  }

  private buildComponents(variables: Record<string, string>): any[] {
    const params = Object.entries(variables).map(([key, value]) => ({
      type: 'text',
      text: value,
    }));

    return [{ type: 'body', parameters: params }];
  }
}
```

```typescript
// src/lib/messaging/sms/msg91.ts
import axios from 'axios';
import { MessagingProvider, MessageRequest, MessageResponse } from '../types';

export class MSG91SMS implements MessagingProvider {
  private authKey: string;
  private senderId: string;
  private baseUrl = 'https://api.msg91.com/api/v5';

  constructor(authKey: string, senderId: string) {
    this.authKey = authKey;
    this.senderId = senderId;
  }

  async send(request: MessageRequest): Promise<MessageResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/flow/`,
        {
          flow_id: request.templateId,
          sender: this.senderId,
          mobiles: `91${request.to}`,
          ...request.variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'authkey': this.authKey,
          },
        }
      );

      return {
        messageId: response.data.request_id,
        status: 'sent',
        provider: 'msg91',
      };
    } catch (error) {
      console.error('MSG91 SMS error:', error);
      throw error;
    }
  }

  async getStatus(messageId: string): Promise<string> {
    return 'delivered';
  }

  async getBalance(): Promise<number> {
    const response = await axios.get(
      `${this.baseUrl}/balance.php?authkey=${this.authKey}&type=1`
    );
    return response.data.balance;
  }
}
```

```typescript
// src/lib/messaging/factory.ts
import { MessagingProvider } from './types';
import { GupshupWhatsApp } from './whatsapp/gupshup';
import { TwilioWhatsApp } from './whatsapp/twilio';
import { MSG91SMS } from './sms/msg91';
import { TwilioSMS } from './sms/twilio';
import { SendgridEmail } from './email/sendgrid';
import { SESEmail } from './email/ses';

export type ProviderType = 
  | 'gupshup_whatsapp' 
  | 'twilio_whatsapp'
  | 'msg91_sms' 
  | 'twilio_sms'
  | 'sendgrid_email'
  | 'ses_email';

export function createMessagingProvider(
  type: ProviderType,
  credentials: Record<string, string>
): MessagingProvider {
  switch (type) {
    case 'gupshup_whatsapp':
      return new GupshupWhatsApp(credentials.apiKey, credentials.sourcePhone);
    case 'twilio_whatsapp':
      return new TwilioWhatsApp(credentials.accountSid, credentials.authToken, credentials.fromNumber);
    case 'msg91_sms':
      return new MSG91SMS(credentials.authKey, credentials.senderId);
    case 'twilio_sms':
      return new TwilioSMS(credentials.accountSid, credentials.authToken, credentials.fromNumber);
    case 'sendgrid_email':
      return new SendgridEmail(credentials.apiKey, credentials.fromEmail);
    case 'ses_email':
      return new SESEmail(credentials.region, credentials.fromEmail);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
```

### Messaging Service with Fallback

```typescript
// src/services/messaging.service.ts
import { createMessagingProvider, ProviderType } from '@/lib/messaging/factory';
import { MessageRequest, MessageResponse } from '@/lib/messaging/types';
import { prisma } from '@/lib/prisma';

export class MessagingService {
  /**
   * Send message with automatic fallback
   */
  async send(
    tenantId: string,
    channel: 'whatsapp' | 'sms' | 'email',
    request: MessageRequest
  ): Promise<MessageResponse> {
    const config = await this.getProviderConfig(tenantId, channel);
    
    // Try primary provider
    try {
      const provider = createMessagingProvider(
        config.primaryProvider as ProviderType,
        config.primaryCredentials
      );
      const result = await provider.send(request);
      await this.logMessage(tenantId, channel, request, result);
      return result;
    } catch (primaryError) {
      console.error(`Primary ${channel} provider failed:`, primaryError);

      // Try fallback provider if configured
      if (config.fallbackProvider) {
        try {
          const fallbackProvider = createMessagingProvider(
            config.fallbackProvider as ProviderType,
            config.fallbackCredentials
          );
          const result = await fallbackProvider.send(request);
          await this.logMessage(tenantId, channel, request, result, true);
          return result;
        } catch (fallbackError) {
          console.error(`Fallback ${channel} provider failed:`, fallbackError);
        }
      }

      throw new Error(`All ${channel} providers failed`);
    }
  }

  private async getProviderConfig(tenantId: string, channel: string) {
    const config = await prisma.marketingConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new Error('Marketing config not found');
    }

    // Return provider configuration based on channel
    switch (channel) {
      case 'whatsapp':
        return {
          primaryProvider: config.whatsappProvider,
          primaryCredentials: config.whatsappCredentials as Record<string, string>,
          fallbackProvider: config.whatsappFallbackProvider,
          fallbackCredentials: config.whatsappFallbackCredentials as Record<string, string>,
        };
      case 'sms':
        return {
          primaryProvider: config.smsProvider,
          primaryCredentials: config.smsCredentials as Record<string, string>,
          fallbackProvider: config.smsFallbackProvider,
          fallbackCredentials: config.smsFallbackCredentials as Record<string, string>,
        };
      case 'email':
        return {
          primaryProvider: config.emailProvider,
          primaryCredentials: config.emailCredentials as Record<string, string>,
          fallbackProvider: null,
          fallbackCredentials: null,
        };
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  private async logMessage(
    tenantId: string,
    channel: string,
    request: MessageRequest,
    response: MessageResponse,
    usedFallback: boolean = false
  ): Promise<void> {
    await prisma.messageLog.create({
      data: {
        tenantId,
        channel,
        recipientPhone: request.to,
        templateId: request.templateId,
        messageId: response.messageId,
        status: response.status,
        provider: response.provider,
        usedFallback,
        cost: response.cost,
      },
    });
  }
}
```

---

## 6. Environment Variables

### Environment Variable Schema

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_URL: z.string().url(),
  APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // AWS
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  CDN_URL: z.string().url().optional(),

  // Payment Gateways (optional, loaded from DB per tenant)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Messaging (optional, loaded from DB per tenant)
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_SOURCE_PHONE: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Feature Flags
  ENABLE_ONLINE_BOOKING: z.coerce.boolean().default(true),
  ENABLE_MARKETING: z.coerce.boolean().default(true),
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
```

### Example .env File

```bash
# .env.example

# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
APP_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/trimio?schema=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=trimio-dev
CDN_URL=https://cdn.trimio.com

# Payment Gateways (for testing)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Messaging (for testing)
GUPSHUP_API_KEY=xxx
GUPSHUP_SOURCE_PHONE=919876543210
MSG91_AUTH_KEY=xxx
MSG91_SENDER_ID=SALONOP
SENDGRID_API_KEY=SG.xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=debug

# Feature Flags
ENABLE_ONLINE_BOOKING=true
ENABLE_MARKETING=true
```

---

## 7. Logging

### Logger Setup

```typescript
// src/lib/logger.ts
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    remove: true,
  },
});

// Child logger with request context
export const createRequestLogger = (requestId: string, tenantId?: string) => {
  return logger.child({
    requestId,
    tenantId,
  });
};
```

### Request Logging Middleware

```typescript
// src/middleware/logging.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger, logger } from '@/lib/logger';

export async function requestLogging(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] as string || uuidv4();
  const tenantId = (request as any).tenantId;

  request.log = createRequestLogger(requestId, tenantId);

  // Set request ID header
  reply.header('x-request-id', requestId);

  const startTime = Date.now();

  // Log request
  request.log.info({
    type: 'request',
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
  });

  // Log response on finish
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;
    
    request.log.info({
      type: 'response',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
    });
  });
}
```

---

## 8. Rate Limiting

### Rate Limiter Implementation

```typescript
// src/middleware/rate-limit.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '@/lib/redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: FastifyRequest) => string;
  skip?: (req: FastifyRequest) => boolean;
}

const defaultKeyGenerator = (req: FastifyRequest): string => {
  const userId = (req as any).userId;
  if (userId) {
    return `ratelimit:user:${userId}`;
  }
  return `ratelimit:ip:${req.ip}`;
};

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    skip,
  } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (skip?.(request)) {
      return;
    }

    const key = keyGenerator(request);
    const windowSeconds = Math.ceil(windowMs / 1000);

    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, max - current);
    const resetAt = Date.now() + ttl * 1000;

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (current > max) {
      reply.header('Retry-After', ttl);
      reply.code(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: ttl,
        },
      });
      return;
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Standard API rate limit
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
  }),

  // Auth endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    keyGenerator: (req) => `ratelimit:auth:${req.ip}`,
  }),

  // Public booking (per IP)
  booking: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    keyGenerator: (req) => `ratelimit:booking:${req.ip}`,
  }),

  // Webhooks (high limit)
  webhook: createRateLimiter({
    windowMs: 60 * 1000,
    max: 1000,
    keyGenerator: (req) => `ratelimit:webhook:${req.ip}`,
  }),
};
```

---

## 9. Error Tracking (Sentry)

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node';
import { env } from './env';

export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Postgres(),
    ],
    beforeSend(event) {
      // Scrub sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  console.log('Sentry initialized');
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  console.error('Error:', error.message, context);
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  console.log(`[${level}] ${message}`);
}
```

---

## 10. API Versioning

### Version Prefix Strategy

```typescript
// src/routes/index.ts
import { FastifyInstance } from 'fastify';
import v1Routes from './v1';

export async function registerRoutes(app: FastifyInstance) {
  // API v1 routes
  app.register(v1Routes, { prefix: '/api/v1' });

  // Future versions
  // app.register(v2Routes, { prefix: '/api/v2' });

  // Health check (no version)
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date() }));
}
```

### Versioning Guidelines

```typescript
/**
 * API Versioning Strategy
 * 
 * 1. URL Path Versioning: /api/v1/..., /api/v2/...
 * 
 * 2. Breaking Changes (require new version):
 *    - Removing endpoints
 *    - Removing required fields from responses
 *    - Adding required fields to requests
 *    - Changing field types
 *    - Changing authentication/authorization
 * 
 * 3. Non-Breaking Changes (same version):
 *    - Adding new endpoints
 *    - Adding optional fields to requests
 *    - Adding fields to responses
 *    - Adding new enum values
 *    - Bug fixes
 * 
 * 4. Deprecation Policy:
 *    - Announce deprecation 6 months before removal
 *    - Add X-Deprecation-Warning header
 *    - Document migration path
 *    - Support old version for 12 months after new version
 */

// Deprecation middleware
export function deprecationWarning(
  message: string,
  sunsetDate: string
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Deprecation-Warning', message);
    reply.header('Sunset', sunsetDate);
  };
}
```
