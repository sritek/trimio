/**
 * Prisma Client with RLS Support
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 48-100
 */

import { Prisma, PrismaClient } from '@prisma/client';

import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    log: ['error'],
    transactionOptions: {
      // Neon serverless has cold-start latency (5-10s on first connection).
      // 15s covers cold starts; subsequent requests use warm connections (~100ms).
      timeout: 15000,
      maxWait: 5000,
    },
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Recursively convert Prisma Decimal fields to JavaScript numbers.
 *
 * Prisma's Decimal type serializes to strings via JSON.stringify() to preserve
 * precision. Call this on query results before sending as JSON response to
 * ensure numeric fields are actual numbers in the API response.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check if it's a Prisma Decimal
  if (obj instanceof Prisma.Decimal) {
    return obj.toNumber() as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals) as T;
  }

  // Handle Date objects - return as-is
  if (obj instanceof Date) {
    return obj;
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }

  return obj;
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
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
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
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${branchId}'`);
    return callback(tx as PrismaClient);
  });
}

/**
 * Execute queries with full context (tenant, branch, user)
 */
export async function withFullContext<T>(
  tenantId: string,
  branchId: string | null,
  userId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    if (branchId) {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${branchId}'`);
    }
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
    return callback(tx as PrismaClient);
  });
}

export default prisma;
