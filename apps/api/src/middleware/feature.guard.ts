/**
 * Feature Guard Middleware
 * Protects routes based on subscription plan features
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FeatureKey } from '../lib/feature-access';
import { requireFeatureAccess, getSubscriptionAccess } from '../lib/feature-access';
import { ForbiddenError } from '../lib/errors';

/**
 * Create a feature guard that checks if the user's branch has access to a feature
 *
 * Usage:
 * ```typescript
 * app.get('/inventory', { preHandler: [authenticate, featureGuard('inventory')] }, handler);
 * ```
 */
export function featureGuard(feature: FeatureKey) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      throw new ForbiddenError('UNAUTHORIZED', 'Authentication required');
    }

    // Get the branch ID from the request
    // Priority: query param > body > user's primary branch
    const branchId = getBranchIdFromRequest(request);

    if (!branchId) {
      throw new ForbiddenError('BRANCH_REQUIRED', 'Branch ID is required');
    }

    // Check feature access
    await requireFeatureAccess(branchId, feature);
  };
}

/**
 * Middleware to attach subscription access info to the request
 * Useful for routes that need to check multiple features or limits
 *
 * Usage:
 * ```typescript
 * app.get('/dashboard', { preHandler: [authenticate, attachSubscriptionAccess] }, handler);
 * // Then in handler: request.subscriptionAccess.features.inventory
 * ```
 */
export async function attachSubscriptionAccess(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user;

  if (!user) {
    return;
  }

  const branchId = getBranchIdFromRequest(request);

  if (branchId) {
    const access = await getSubscriptionAccess(branchId);
    // Attach to request for use in handlers
    (request as any).subscriptionAccess = access;
  }
}

/**
 * Extract branch ID from request (query, body, or user context)
 */
function getBranchIdFromRequest(request: FastifyRequest): string | null {
  // From query string
  const query = request.query as Record<string, unknown>;
  if (query.branchId && typeof query.branchId === 'string') {
    return query.branchId;
  }

  // From request body
  const body = request.body as Record<string, unknown> | null;
  if (body?.branchId && typeof body.branchId === 'string') {
    return body.branchId;
  }

  // From URL params
  const params = request.params as Record<string, unknown>;
  if (params.branchId && typeof params.branchId === 'string') {
    return params.branchId;
  }

  // From user's branch context (first branch in their list)
  const user = request.user;
  if (user?.branchIds && user.branchIds.length > 0) {
    return user.branchIds[0];
  }

  return null;
}

// Extend FastifyRequest to include subscriptionAccess
declare module 'fastify' {
  interface FastifyRequest {
    subscriptionAccess?: Awaited<ReturnType<typeof getSubscriptionAccess>>;
  }
}
