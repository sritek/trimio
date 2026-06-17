/**
 * Authentication Middleware
 * Centralized JWT authentication for protected routes
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '@trimio/shared';

import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * JWT payload structure for access tokens
 */
export interface JwtUser {
  sub: string;
  tenantId: string;
  branchIds: string[];
  role: UserRole;
  permissions: string[];
}

/**
 * Augment @fastify/jwt to include our typed user for jwtVerify()
 * Note: We only augment the user type for verification, not the sign payload
 * This allows signing with different payload structures (access vs refresh tokens)
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtUser;
  }
}

/**
 * Subscription statuses that allow full access
 */
const FULL_ACCESS_STATUSES = ['trial', 'active', 'past_due'];

/**
 * Subscription statuses that allow read-only access
 */
const READ_ONLY_STATUSES = ['suspended', 'cancelled'];

/**
 * HTTP methods considered as write operations
 */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Routes exempt from subscription checks
 */
const SUBSCRIPTION_EXEMPT_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/internal',
  '/api/v1/subscriptions',
  '/api/v1/tenant',
  '/api/v1/branches',
];

/**
 * Authentication preHandler
 * Verifies JWT token, populates request.user, and enforces subscription access
 *
 * Usage:
 * ```typescript
 * fastify.get('/protected', {
 *   preHandler: [authenticate],
 * }, handler);
 * ```
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // After JWT verification, check subscription access
  await checkBranchSubscription(request);
}

/**
 * Check branch subscription status after authentication
 * Blocks write operations for suspended/cancelled branches
 * Blocks all operations for expired branches
 */
async function checkBranchSubscription(request: FastifyRequest): Promise<void> {
  // Skip exempt routes
  const url = request.url.split('?')[0];
  const isExempt = SUBSCRIPTION_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix));
  if (isExempt) {
    return;
  }

  // Get branchId from request (query, body, params, or JWT)
  const branchId = extractBranchId(request);
  if (!branchId) {
    return;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      isAccessible: true,
      subscriptionStatus: true,
      accessRestrictedReason: true,
    },
  });

  if (!branch) {
    return; // Branch not found - let the route handler deal with it
  }

  // Check if branch is accessible at all
  if (!branch.isAccessible) {
    throw new ForbiddenError(
      'BRANCH_ACCESS_RESTRICTED',
      branch.accessRestrictedReason || 'Branch access is restricted. Please contact support.'
    );
  }

  // No subscription status set - allow access (initial setup)
  if (!branch.subscriptionStatus) {
    return;
  }

  // Full access statuses - allow everything
  if (FULL_ACCESS_STATUSES.includes(branch.subscriptionStatus)) {
    return;
  }

  // Read-only statuses - block write operations
  if (READ_ONLY_STATUSES.includes(branch.subscriptionStatus)) {
    if (WRITE_METHODS.includes(request.method)) {
      throw new ForbiddenError(
        'SUBSCRIPTION_READ_ONLY',
        `Your subscription is ${branch.subscriptionStatus}. You can view data but cannot make changes. Please renew to continue.`
      );
    }
    return;
  }

  // Expired status - block all access
  if (branch.subscriptionStatus === 'expired') {
    throw new ForbiddenError(
      'SUBSCRIPTION_EXPIRED',
      'Your subscription has expired. Please renew to access this branch.'
    );
  }
}

/**
 * Extract branch ID from request (params, query, body, JWT)
 */
function extractBranchId(request: FastifyRequest): string | null {
  // Check route params
  const params = request.params as Record<string, string>;
  if (params?.branchId) {
    return params.branchId;
  }

  // Check query string
  const query = request.query as Record<string, string>;
  if (query?.branchId) {
    return query.branchId;
  }

  // Check request body
  const body = request.body as Record<string, unknown> | null;
  if (body?.branchId && typeof body.branchId === 'string') {
    return body.branchId;
  }

  // Fallback: use first branch from JWT
  const user = request.user;
  if (user?.branchIds?.length > 0) {
    return user.branchIds[0];
  }

  return null;
}

/**
 * Optional authentication preHandler
 * Verifies JWT if present, but doesn't fail if missing
 * Useful for endpoints that behave differently for authenticated users
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Token invalid or missing - that's okay for optional auth
    // request.user will be undefined
  }
}
