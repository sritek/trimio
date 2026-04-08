---
# Testing patterns - unit tests, integration tests, E2E tests, and CI integration
inclusion: fileMatch
fileMatchPattern: '**/*.test.ts, **/*.spec.ts, **/tests/**/*.ts, **/__tests__/**/*.ts'
---

# Testing Guide

## Overview

This document provides comprehensive testing patterns, setup guides, and best practices for the Salon Management SaaS platform including unit tests, integration tests, E2E tests, and CI integration.

---

## 1. Testing Framework Setup

### Tech Stack

| Type | Framework | Purpose |
|------|-----------|---------|
| Unit Tests | Vitest | Fast unit testing with TypeScript support |
| Integration Tests | Vitest + Supertest | API and database integration tests |
| E2E Tests | Playwright | Browser-based end-to-end tests |
| Mocking | Vitest mocks, MSW | External service mocking |
| Coverage | V8 (via Vitest) | Code coverage reporting |

### Directory Structure

```
trimio-backend/
├── src/
├── tests/
│   ├── unit/                    # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── integration/             # Integration tests
│   │   ├── api/
│   │   ├── repositories/
│   │   └── services/
│   ├── e2e/                     # E2E tests
│   │   ├── appointments.spec.ts
│   │   ├── billing.spec.ts
│   │   └── booking.spec.ts
│   ├── fixtures/                # Test data factories
│   │   ├── tenant.fixture.ts
│   │   ├── user.fixture.ts
│   │   └── appointment.fixture.ts
│   ├── mocks/                   # Mock implementations
│   │   ├── payment-gateway.mock.ts
│   │   ├── messaging.mock.ts
│   │   └── s3.mock.ts
│   ├── helpers/                 # Test utilities
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   └── api-client.ts
│   └── setup.ts                 # Global test setup
├── vitest.config.ts
└── playwright.config.ts
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

### Global Test Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanupDatabase } from './helpers/database';
import { setupMocks, teardownMocks } from './mocks';

// Setup test database before all tests
beforeAll(async () => {
  await setupTestDatabase();
  setupMocks();
});

// Cleanup database after each test
afterEach(async () => {
  await cleanupDatabase();
});

// Teardown after all tests
afterAll(async () => {
  teardownMocks();
  await teardownTestDatabase();
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ci": "vitest run --coverage --reporter=junit --outputFile=test-results/junit.xml"
  }
}
```

---

## 2. Test Database Setup

### Database Helper

```typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Use test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL 
    || 'postgresql://postgres:postgres@localhost:5432/trimio_test';

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
  });

  prisma = new PrismaClient();
  await prisma.$connect();

  return prisma;
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
}

export async function cleanupDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}

export function getTestPrisma(): PrismaClient {
  return prisma;
}

/**
 * Execute with tenant context for RLS
 */
export async function withTestTenant<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await prisma.$executeRawUnsafe(
    `SET LOCAL app.current_tenant_id = '${tenantId}'`
  );
  return callback();
}
```

### Redis Test Helper

```typescript
// tests/helpers/redis.ts
import Redis from 'ioredis';

let redis: Redis;

export function setupTestRedis() {
  redis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:6379/1');
  return redis;
}

export async function cleanupRedis() {
  await redis.flushdb();
}

export async function teardownRedis() {
  await redis.quit();
}

export function getTestRedis(): Redis {
  return redis;
}
```

---

## 3. Test Fixtures & Factories

### Base Factory Pattern

```typescript
// tests/fixtures/base.fixture.ts
import { v4 as uuidv4 } from 'uuid';

export interface FactoryOptions<T> {
  overrides?: Partial<T>;
  traits?: string[];
}

export abstract class BaseFactory<T> {
  protected abstract defaults(): T;
  protected traits: Record<string, Partial<T>> = {};

  build(options: FactoryOptions<T> = {}): T {
    let data = this.defaults();

    // Apply traits
    if (options.traits) {
      for (const trait of options.traits) {
        if (this.traits[trait]) {
          data = { ...data, ...this.traits[trait] };
        }
      }
    }

    // Apply overrides
    if (options.overrides) {
      data = { ...data, ...options.overrides };
    }

    return data;
  }

  buildMany(count: number, options: FactoryOptions<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(options));
  }

  protected generateId(): string {
    return uuidv4();
  }
}
```

### Tenant Factory

```typescript
// tests/fixtures/tenant.fixture.ts
import { BaseFactory } from './base.fixture';
import { getTestPrisma } from '../helpers/database';
import { hash } from 'bcrypt';

export interface TenantData {
  id: string;
  businessName: string;
  slug: string;
  email: string;
  phone: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isActive: boolean;
}

export class TenantFactory extends BaseFactory<TenantData> {
  protected traits = {
    inactive: { isActive: false },
    expired: { subscriptionStatus: 'expired' },
    enterprise: { subscriptionPlan: 'enterprise' },
  };

  protected defaults(): TenantData {
    const id = this.generateId();
    return {
      id,
      businessName: `Test Salon ${id.substring(0, 6)}`,
      slug: `test-salon-${id.substring(0, 6)}`,
      email: `tenant-${id.substring(0, 6)}@test.com`,
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      isActive: true,
    };
  }

  async create(options: FactoryOptions<TenantData> = {}): Promise<TenantData> {
    const data = this.build(options);
    const prisma = getTestPrisma();

    await prisma.tenant.create({ data });
    return data;
  }

  async createWithBranch(options: FactoryOptions<TenantData> = {}) {
    const tenant = await this.create(options);
    const prisma = getTestPrisma();

    const branch = await prisma.branch.create({
      data: {
        id: this.generateId(),
        tenantId: tenant.id,
        name: 'Main Branch',
        code: 'MAIN',
        address: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: tenant.phone,
        isActive: true,
      },
    });

    return { tenant, branch };
  }

  async createWithOwner(options: FactoryOptions<TenantData> = {}) {
    const { tenant, branch } = await this.createWithBranch(options);
    const prisma = getTestPrisma();
    const userFactory = new UserFactory();

    const owner = await userFactory.create({
      overrides: {
        tenantId: tenant.id,
        role: 'super_owner',
      },
    });

    await prisma.branchAssignment.create({
      data: {
        userId: owner.id,
        branchId: branch.id,
        isPrimary: true,
      },
    });

    return { tenant, branch, owner };
  }
}

export const tenantFactory = new TenantFactory();
```

### User Factory

```typescript
// tests/fixtures/user.fixture.ts
import { BaseFactory } from './base.fixture';
import { getTestPrisma } from '../helpers/database';
import { hash } from 'bcrypt';

export interface UserData {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
}

export class UserFactory extends BaseFactory<UserData> {
  protected traits = {
    inactive: { isActive: false },
    stylist: { role: 'stylist' },
    manager: { role: 'branch_manager' },
    receptionist: { role: 'receptionist' },
  };

  protected defaults(): UserData {
    const id = this.generateId();
    return {
      id,
      tenantId: '', // Must be provided
      email: `user-${id.substring(0, 6)}@test.com`,
      name: `Test User ${id.substring(0, 6)}`,
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'super_owner',
      passwordHash: '', // Will be set on create
      isActive: true,
    };
  }

  async create(options: FactoryOptions<UserData> = {}): Promise<UserData> {
    const data = this.build(options);
    data.passwordHash = await hash('Test123!', 10);
    
    const prisma = getTestPrisma();
    await prisma.user.create({ data });
    
    return data;
  }
}

export const userFactory = new UserFactory();
```

### Customer Factory

```typescript
// tests/fixtures/customer.fixture.ts
import { BaseFactory } from './base.fixture';
import { getTestPrisma } from '../helpers/database';

export interface CustomerData {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  loyaltyPoints: number;
  walletBalance: number;
  totalVisits: number;
  isActive: boolean;
}

export class CustomerFactory extends BaseFactory<CustomerData> {
  protected traits = {
    vip: { totalVisits: 20, loyaltyPoints: 5000 },
    inactive: { isActive: false },
    withWallet: { walletBalance: 1000 },
    male: { gender: 'male' },
    female: { gender: 'female' },
  };

  protected defaults(): CustomerData {
    const id = this.generateId();
    return {
      id,
      tenantId: '', // Must be provided
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      name: `Test Customer ${id.substring(0, 6)}`,
      email: `customer-${id.substring(0, 6)}@test.com`,
      gender: null,
      dateOfBirth: null,
      loyaltyPoints: 0,
      walletBalance: 0,
      totalVisits: 0,
      isActive: true,
    };
  }

  async create(options: FactoryOptions<CustomerData> = {}): Promise<CustomerData> {
    const data = this.build(options);
    const prisma = getTestPrisma();
    
    await prisma.customer.create({ data });
    return data;
  }
}

export const customerFactory = new CustomerFactory();
```

### Appointment Factory

```typescript
// tests/fixtures/appointment.fixture.ts
import { BaseFactory } from './base.fixture';
import { getTestPrisma } from '../helpers/database';
import { addDays, format } from 'date-fns';

export interface AppointmentData {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  stylistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
}

export class AppointmentFactory extends BaseFactory<AppointmentData> {
  protected traits = {
    completed: { status: 'completed' },
    cancelled: { status: 'cancelled' },
    noShow: { status: 'no_show' },
    walkin: { type: 'walk_in' },
    online: { type: 'online' },
    tomorrow: {
      appointmentDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    },
    paid: { paidAmount: 1000 },
  };

  protected defaults(): AppointmentData {
    const id = this.generateId();
    return {
      id,
      tenantId: '', // Must be provided
      branchId: '', // Must be provided
      customerId: '', // Must be provided
      stylistId: '', // Must be provided
      appointmentDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      type: 'phone',
      totalAmount: 500,
      paidAmount: 0,
      notes: null,
    };
  }

  async create(options: FactoryOptions<AppointmentData> = {}): Promise<AppointmentData> {
    const data = this.build(options);
    const prisma = getTestPrisma();
    
    await prisma.appointment.create({ data });
    return data;
  }

  async createWithServices(
    options: FactoryOptions<AppointmentData> = {},
    services: { serviceId: string; price: number; duration: number }[] = []
  ) {
    const appointment = await this.create(options);
    const prisma = getTestPrisma();

    for (const service of services) {
      await prisma.appointmentService.create({
        data: {
          id: this.generateId(),
          appointmentId: appointment.id,
          serviceId: service.serviceId,
          price: service.price,
          duration: service.duration,
          commissionLocked: false,
        },
      });
    }

    return appointment;
  }
}

export const appointmentFactory = new AppointmentFactory();
```

### Service Factory

```typescript
// tests/fixtures/service.fixture.ts
import { BaseFactory } from './base.fixture';
import { getTestPrisma } from '../helpers/database';

export interface ServiceData {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  gstRate: number;
  isActive: boolean;
}

export class ServiceFactory extends BaseFactory<ServiceData> {
  protected traits = {
    inactive: { isActive: false },
    expensive: { price: 5000 },
    quick: { duration: 15 },
    long: { duration: 120 },
  };

  protected defaults(): ServiceData {
    const id = this.generateId();
    return {
      id,
      tenantId: '', // Must be provided
      categoryId: '', // Must be provided
      name: `Test Service ${id.substring(0, 6)}`,
      description: 'A test service',
      duration: 30,
      price: 500,
      gstRate: 18,
      isActive: true,
    };
  }

  async create(options: FactoryOptions<ServiceData> = {}): Promise<ServiceData> {
    const data = this.build(options);
    const prisma = getTestPrisma();
    
    await prisma.service.create({ data });
    return data;
  }

  async createWithCategory(options: FactoryOptions<ServiceData> = {}) {
    const prisma = getTestPrisma();
    
    // Create category first
    const category = await prisma.serviceCategory.create({
      data: {
        id: this.generateId(),
        tenantId: options.overrides?.tenantId || '',
        name: 'Test Category',
        isActive: true,
      },
    });

    // Create service with category
    const service = await this.create({
      ...options,
      overrides: {
        ...options.overrides,
        categoryId: category.id,
      },
    });

    return { category, service };
  }
}

export const serviceFactory = new ServiceFactory();
```

---

## 4. Mock Implementations

### Payment Gateway Mock

```typescript
// tests/mocks/payment-gateway.mock.ts
import { vi } from 'vitest';

export const mockPaymentGateway = {
  createOrder: vi.fn().mockResolvedValue({
    id: 'order_mock_123',
    amount: 10000,
    currency: 'INR',
    receipt: 'mock_receipt',
    status: 'created',
  }),

  verifyPayment: vi.fn().mockResolvedValue(true),

  refund: vi.fn().mockResolvedValue({
    id: 'refund_mock_123',
    amount: 5000,
    status: 'processed',
  }),

  getPaymentDetails: vi.fn().mockResolvedValue({
    id: 'pay_mock_123',
    amount: 10000,
    status: 'captured',
    method: 'upi',
  }),
};

export function resetPaymentGatewayMock() {
  Object.values(mockPaymentGateway).forEach((mock) => mock.mockClear());
}

// Mock the payment factory
vi.mock('@/lib/payment/factory', () => ({
  createPaymentGateway: vi.fn(() => mockPaymentGateway),
}));
```

### Messaging Provider Mock

```typescript
// tests/mocks/messaging.mock.ts
import { vi } from 'vitest';

export const mockMessagingProvider = {
  send: vi.fn().mockResolvedValue({
    messageId: 'msg_mock_123',
    status: 'sent',
    provider: 'mock',
  }),

  getStatus: vi.fn().mockResolvedValue('delivered'),

  getBalance: vi.fn().mockResolvedValue(10000),
};

export function resetMessagingMock() {
  Object.values(mockMessagingProvider).forEach((mock) => mock.mockClear());
}

vi.mock('@/lib/messaging/factory', () => ({
  createMessagingProvider: vi.fn(() => mockMessagingProvider),
}));
```

### S3 Mock

```typescript
// tests/mocks/s3.mock.ts
import { vi } from 'vitest';

export const mockS3 = {
  getUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://s3.mock/upload?signature=xxx',
    key: 'mock/file.jpg',
  }),

  getDownloadUrl: vi.fn().mockResolvedValue(
    'https://cdn.mock/mock/file.jpg'
  ),

  upload: vi.fn().mockResolvedValue('https://cdn.mock/mock/file.jpg'),

  delete: vi.fn().mockResolvedValue(undefined),

  getPublicUrl: vi.fn().mockReturnValue('https://cdn.mock/mock/file.jpg'),
};

export function resetS3Mock() {
  Object.values(mockS3).forEach((mock) => mock.mockClear());
}

vi.mock('@/lib/s3', () => ({
  s3: mockS3,
}));
```

### MSW Server Setup (for API mocking)

```typescript
// tests/mocks/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Define handlers for external APIs
const handlers = [
  // Razorpay mock
  http.post('https://api.razorpay.com/v1/orders', () => {
    return HttpResponse.json({
      id: 'order_mock_123',
      amount: 10000,
      currency: 'INR',
      status: 'created',
    });
  }),

  // Gupshup WhatsApp mock
  http.post('https://api.gupshup.io/sm/api/v1/msg', () => {
    return HttpResponse.json({
      messageId: 'msg_mock_123',
      status: 'submitted',
    });
  }),

  // MSG91 SMS mock
  http.post('https://api.msg91.com/api/v5/flow/', () => {
    return HttpResponse.json({
      request_id: 'req_mock_123',
      type: 'success',
    });
  }),
];

export const mswServer = setupServer(...handlers);
```

### Global Mock Setup

```typescript
// tests/mocks/index.ts
import { mswServer } from './msw-server';
import { resetPaymentGatewayMock } from './payment-gateway.mock';
import { resetMessagingMock } from './messaging.mock';
import { resetS3Mock } from './s3.mock';

export function setupMocks() {
  mswServer.listen({ onUnhandledRequest: 'bypass' });
}

export function teardownMocks() {
  mswServer.close();
}

export function resetAllMocks() {
  mswServer.resetHandlers();
  resetPaymentGatewayMock();
  resetMessagingMock();
  resetS3Mock();
}
```

---

## 5. Unit Test Examples

### Service Unit Test

```typescript
// tests/unit/services/appointment.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppointmentService } from '@/services/appointment.service';
import { appointmentFactory } from '@tests/fixtures/appointment.fixture';
import { customerFactory } from '@tests/fixtures/customer.fixture';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findConflicts: vi.fn().mockResolvedValue([]),
    };
    
    service = new AppointmentService(mockRepository);
  });

  describe('checkAvailability', () => {
    it('should return true when no conflicts exist', async () => {
      mockRepository.findConflicts.mockResolvedValue([]);

      const result = await service.checkAvailability(
        'branch-1',
        '2024-01-15',
        '10:00',
        60,
        'stylist-1'
      );

      expect(result).toBe(true);
      expect(mockRepository.findConflicts).toHaveBeenCalledWith(
        'branch-1',
        '2024-01-15',
        '10:00',
        '11:00',
        'stylist-1'
      );
    });

    it('should return false when conflicts exist', async () => {
      mockRepository.findConflicts.mockResolvedValue([{ id: 'apt-1' }]);

      const result = await service.checkAvailability(
        'branch-1',
        '2024-01-15',
        '10:00',
        60,
        'stylist-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('calculateEndTime', () => {
    it('should correctly calculate end time', () => {
      expect(service.calculateEndTime('10:00', 60)).toBe('11:00');
      expect(service.calculateEndTime('10:30', 45)).toBe('11:15');
      expect(service.calculateEndTime('23:30', 60)).toBe('00:30');
    });
  });

  describe('validateReschedule', () => {
    it('should allow reschedule within limit', async () => {
      const appointment = appointmentFactory.build({
        overrides: { rescheduleCount: 1 },
      });
      mockRepository.findById.mockResolvedValue(appointment);

      const result = await service.validateReschedule('apt-1', 3);

      expect(result.valid).toBe(true);
    });

    it('should reject reschedule beyond limit', async () => {
      const appointment = appointmentFactory.build({
        overrides: { rescheduleCount: 3 },
      });
      mockRepository.findById.mockResolvedValue(appointment);

      const result = await service.validateReschedule('apt-1', 3);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Maximum reschedules');
    });
  });
});
```

### Utility Unit Test

```typescript
// tests/unit/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  maskPhone,
  formatDuration,
} from '@/lib/format';

describe('formatCurrency', () => {
  it('should format currency in Indian format', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(100000)).toBe('₹1,00,000');
    expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89');
  });

  it('should handle compact format', () => {
    expect(formatCurrency(100000, true)).toBe('₹1.0L');
    expect(formatCurrency(1500, true)).toBe('₹1.5K');
    expect(formatCurrency(500, true)).toBe('₹500');
  });
});

describe('formatPhone', () => {
  it('should format Indian phone numbers', () => {
    expect(formatPhone('9876543210')).toBe('+91 98765 43210');
  });
});

describe('maskPhone', () => {
  it('should mask phone numbers for privacy', () => {
    expect(maskPhone('9876543210')).toBe('98XXXX3210');
  });
});

describe('formatDuration', () => {
  it('should format duration correctly', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
  });
});
```

### Validator Unit Test

```typescript
// tests/unit/validators/appointment.validator.test.ts
import { describe, it, expect } from 'vitest';
import { createAppointmentSchema } from '@/validators/appointment.validator';

describe('createAppointmentSchema', () => {
  const validData = {
    branchId: '550e8400-e29b-41d4-a716-446655440000',
    customerId: '550e8400-e29b-41d4-a716-446655440001',
    appointmentDate: '2024-01-15',
    startTime: '10:00',
    services: [
      { serviceId: '550e8400-e29b-41d4-a716-446655440002' },
    ],
  };

  it('should validate correct data', () => {
    const result = createAppointmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const result = createAppointmentSchema.safeParse({
      ...validData,
      appointmentDate: '15-01-2024',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid time format', () => {
    const result = createAppointmentSchema.safeParse({
      ...validData,
      startTime: '10:00:00',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty services array', () => {
    const result = createAppointmentSchema.safeParse({
      ...validData,
      services: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional stylistId', () => {
    const result = createAppointmentSchema.safeParse({
      ...validData,
      stylistId: '550e8400-e29b-41d4-a716-446655440003',
    });
    expect(result.success).toBe(true);
  });
});
```

---

## 6. Integration Test Examples

### API Integration Test

```typescript
// tests/integration/api/appointments.api.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createTestApp } from '@tests/helpers/app';
import { tenantFactory } from '@tests/fixtures/tenant.fixture';
import { customerFactory } from '@tests/fixtures/customer.fixture';
import { serviceFactory } from '@tests/fixtures/service.fixture';
import { generateTestToken } from '@tests/helpers/auth';

describe('Appointments API', () => {
  let app: any;
  let tenant: any;
  let branch: any;
  let owner: any;
  let token: string;
  let customer: any;
  let service: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Setup test data
    const setup = await tenantFactory.createWithOwner();
    tenant = setup.tenant;
    branch = setup.branch;
    owner = setup.owner;
    
    token = generateTestToken(owner);

    customer = await customerFactory.create({
      overrides: { tenantId: tenant.id },
    });

    const serviceData = await serviceFactory.createWithCategory({
      overrides: { tenantId: tenant.id },
    });
    service = serviceData.service;
  });

  describe('POST /api/v1/appointments', () => {
    it('should create appointment successfully', async () => {
      const response = await supertest(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          branchId: branch.id,
          customerId: customer.id,
          appointmentDate: '2024-01-20',
          startTime: '10:00',
          services: [{ serviceId: service.id }],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should reject appointment with time conflict', async () => {
      // Create first appointment
      await supertest(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          branchId: branch.id,
          customerId: customer.id,
          stylistId: owner.id,
          appointmentDate: '2024-01-20',
          startTime: '10:00',
          services: [{ serviceId: service.id }],
        });

      // Try to create conflicting appointment
      const response = await supertest(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          branchId: branch.id,
          customerId: customer.id,
          stylistId: owner.id,
          appointmentDate: '2024-01-20',
          startTime: '10:15',
          services: [{ serviceId: service.id }],
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('TIME_SLOT_CONFLICT');
    });

    it('should return 401 without authentication', async () => {
      const response = await supertest(app)
        .post('/api/v1/appointments')
        .send({
          branchId: branch.id,
          customerId: customer.id,
          appointmentDate: '2024-01-20',
          startTime: '10:00',
          services: [{ serviceId: service.id }],
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/appointments', () => {
    it('should list appointments with pagination', async () => {
      // Create some appointments
      for (let i = 0; i < 5; i++) {
        await supertest(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            branchId: branch.id,
            customerId: customer.id,
            appointmentDate: `2024-01-${20 + i}`,
            startTime: '10:00',
            services: [{ serviceId: service.id }],
          });
      }

      const response = await supertest(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.page).toBe(1);
    });

    it('should filter by date', async () => {
      const response = await supertest(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .query({ date: '2024-01-20' });

      expect(response.status).toBe(200);
      expect(response.body.data.items.every(
        (apt: any) => apt.appointmentDate === '2024-01-20'
      )).toBe(true);
    });
  });

  describe('PATCH /api/v1/appointments/:id/cancel', () => {
    it('should cancel appointment successfully', async () => {
      // Create appointment
      const createResponse = await supertest(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          branchId: branch.id,
          customerId: customer.id,
          appointmentDate: '2024-01-25',
          startTime: '10:00',
          services: [{ serviceId: service.id }],
        });

      const appointmentId = createResponse.body.data.id;

      // Cancel appointment
      const response = await supertest(app)
        .patch(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Customer requested' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});
```

### Repository Integration Test

```typescript
// tests/integration/repositories/customer.repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerRepository } from '@/repositories/customer.repository';
import { getTestPrisma, withTestTenant } from '@tests/helpers/database';
import { tenantFactory } from '@tests/fixtures/tenant.fixture';
import { customerFactory } from '@tests/fixtures/customer.fixture';

describe('CustomerRepository', () => {
  let repository: CustomerRepository;
  let tenant: any;

  beforeEach(async () => {
    tenant = await tenantFactory.create();
    repository = new CustomerRepository(getTestPrisma());
  });

  describe('findByPhone', () => {
    it('should find customer by phone number', async () => {
      const customer = await customerFactory.create({
        overrides: { tenantId: tenant.id, phone: '9876543210' },
      });

      const result = await withTestTenant(tenant.id, () =>
        repository.findByPhone('9876543210')
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(customer.id);
    });

    it('should return null for non-existent phone', async () => {
      const result = await withTestTenant(tenant.id, () =>
        repository.findByPhone('0000000000')
      );

      expect(result).toBeNull();
    });

    it('should not find customers from other tenants', async () => {
      const otherTenant = await tenantFactory.create();
      await customerFactory.create({
        overrides: { tenantId: otherTenant.id, phone: '9876543210' },
      });

      const result = await withTestTenant(tenant.id, () =>
        repository.findByPhone('9876543210')
      );

      expect(result).toBeNull();
    });
  });

  describe('searchByNameOrPhone', () => {
    beforeEach(async () => {
      await customerFactory.create({
        overrides: { tenantId: tenant.id, name: 'John Doe', phone: '9876543210' },
      });
      await customerFactory.create({
        overrides: { tenantId: tenant.id, name: 'Jane Smith', phone: '9876543211' },
      });
      await customerFactory.create({
        overrides: { tenantId: tenant.id, name: 'Bob Johnson', phone: '9999999999' },
      });
    });

    it('should search by name', async () => {
      const results = await withTestTenant(tenant.id, () =>
        repository.searchByNameOrPhone('John')
      );

      expect(results).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should search by phone', async () => {
      const results = await withTestTenant(tenant.id, () =>
        repository.searchByNameOrPhone('98765')
      );

      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', async () => {
      const results = await withTestTenant(tenant.id, () =>
        repository.searchByNameOrPhone('JANE')
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Jane Smith');
    });
  });
});
```

---

## 7. E2E Test Examples

### Appointment Booking E2E Test

```typescript
// tests/e2e/appointments.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsRole, createTestData } from './helpers';

test.describe('Appointment Booking', () => {
  test.beforeEach(async ({ page }) => {
    await createTestData();
    await loginAsRole(page, 'receptionist');
  });

  test('should create new appointment', async ({ page }) => {
    // Navigate to appointments
    await page.goto('/appointments');
    await page.click('button:has-text("New Appointment")');

    // Fill customer search
    await page.fill('[data-testid="customer-search"]', '98765');
    await page.click('[data-testid="customer-option"]:first-child');

    // Select date
    await page.click('[data-testid="date-picker"]');
    await page.click('.rdp-day:not(.rdp-day_disabled):first-child');

    // Select time
    await page.click('[data-testid="time-select"]');
    await page.click('[data-testid="time-option-10:00"]');

    // Select service
    await page.click('[data-testid="service-select"]');
    await page.click('[data-testid="service-option"]:first-child');

    // Submit
    await page.click('button:has-text("Create Appointment")');

    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page).toHaveURL(/\/appointments\/.+/);
  });

  test('should show conflict error for overlapping appointment', async ({ page }) => {
    // Create first appointment
    await page.goto('/appointments/new');
    // ... fill form ...
    await page.click('button:has-text("Create Appointment")');

    // Try to create overlapping appointment
    await page.goto('/appointments/new');
    // ... fill same time slot ...
    await page.click('button:has-text("Create Appointment")');

    // Verify error
    await expect(page.locator('[data-testid="toast-error"]')).toContainText('conflict');
  });

  test('should filter appointments by date', async ({ page }) => {
    await page.goto('/appointments');

    // Open date filter
    await page.click('[data-testid="date-filter"]');
    await page.click('.rdp-day:has-text("15")');

    // Verify filtered results
    await expect(page.locator('[data-testid="appointment-card"]')).toHaveCount(
      await page.locator('[data-testid="appointment-card"]').count()
    );
  });
});
```

### Online Booking E2E Test

```typescript
// tests/e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Online Booking', () => {
  const BOOKING_URL = '/book/demo-salon';

  test('should complete booking flow', async ({ page }) => {
    // Step 1: Landing page
    await page.goto(BOOKING_URL);
    await expect(page.locator('h1')).toContainText('Book an Appointment');

    // Step 2: Select branch
    await page.click('[data-testid="branch-card"]:first-child');
    await page.click('button:has-text("Continue")');

    // Step 3: Select services
    await page.click('[data-testid="service-card"]:first-child');
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 4: Select date and time
    await page.click('.rdp-day:not(.rdp-day_disabled):first-child');
    await page.click('[data-testid="time-slot"]:first-child');
    await page.click('button:has-text("Continue")');

    // Step 5: Enter customer details
    await page.fill('[name="name"]', 'Test Customer');
    await page.fill('[name="phone"]', '9876543210');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button:has-text("Book Now")');

    // Step 6: Confirmation
    await expect(page.locator('h2')).toContainText('Booking Confirmed');
    await expect(page.locator('[data-testid="booking-reference"]')).toBeVisible();
  });

  test('should show error for unavailable slot', async ({ page }) => {
    await page.goto(BOOKING_URL);
    // ... navigate to slot selection ...

    // Wait for slot to be taken by another user
    // Select unavailable slot
    await page.click('[data-testid="time-slot-unavailable"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'no longer available'
    );
  });

  test('should handle promo code', async ({ page }) => {
    await page.goto(BOOKING_URL);
    // ... select services ...

    // Enter promo code
    await page.fill('[name="promoCode"]', 'WELCOME10');
    await page.click('button:has-text("Apply")');

    // Verify discount
    await expect(page.locator('[data-testid="discount-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).not.toContainText(
      await page.locator('[data-testid="subtotal-amount"]').textContent() || ''
    );
  });
});
```

---

## 8. Test Helpers

### Auth Helper

```typescript
// tests/helpers/auth.ts
import jwt from 'jsonwebtoken';
import { UserData } from '@tests/fixtures/user.fixture';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-characters';

export function generateTestToken(user: UserData): string {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function generateExpiredToken(user: UserData): string {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );
}
```

### App Helper

```typescript
// tests/helpers/app.ts
import Fastify from 'fastify';
import { registerRoutes } from '@/routes';
import { registerPlugins } from '@/plugins';

let app: ReturnType<typeof Fastify> | null = null;

export async function createTestApp() {
  if (app) return app;

  app = Fastify({ logger: false });

  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();

  return app;
}

export async function closeTestApp() {
  if (app) {
    await app.close();
    app = null;
  }
}
```

---

## 9. CI Configuration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: trimio_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trimio_test

      - name: Run tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trimio_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key-min-32-characters

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 10. Coverage Requirements

### Minimum Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

### Coverage Exclusions

- Generated files (Prisma client)
- Type definitions (*.d.ts)
- Configuration files
- Test files themselves
- Migration files

### Coverage Report Example

```bash
# Generate coverage report
npm run test:coverage

# Output
 ----------|---------|----------|---------|---------|
 File      | % Stmts | % Branch | % Funcs | % Lines |
 ----------|---------|----------|---------|---------|
 All files |   85.32 |    78.45 |   82.10 |   85.32 |
  services |   88.50 |    82.30 |   85.00 |   88.50 |
  utils    |   92.10 |    88.00 |   90.50 |   92.10 |
  repos    |   80.25 |    72.50 |   78.00 |   80.25 |
 ----------|---------|----------|---------|---------|
```
