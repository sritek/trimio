/**
 * Subscription Guard Middleware
 * Checks branch subscription status and restricts access accordingly
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';

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
 * Check if branch has an active subscription
 * Use this for routes that require full access
 */
export async function requireActiveSubscription(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const branchId = getBranchIdFromRequest(request);

  if (!branchId) {
    // No branch context, skip check (tenant-level routes)
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
    throw new ForbiddenError('BRANCH_NOT_FOUND', 'Branch not found');
  }

  // Check if branch is accessible
  if (!branch.isAccessible) {
    throw new ForbiddenError(
      'BRANCH_ACCESS_RESTRICTED',
      branch.accessRestrictedReason || 'Branch access is restricted'
    );
  }

  // Check subscription status
  if (!branch.subscriptionStatus) {
    // No subscription yet - allow access (for initial setup)
    return;
  }

  if (!FULL_ACCESS_STATUSES.includes(branch.subscriptionStatus)) {
    throw new ForbiddenError(
      'SUBSCRIPTION_INACTIVE',
      `Your subscription is ${branch.subscriptionStatus}. Please renew to continue using this branch.`
    );
  }
}

/**
 * Check subscription status and allow read-only access for suspended/cancelled
 * Use this for routes that should allow viewing data even when subscription is inactive
 */
export async function checkSubscriptionAccess(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const branchId = getBranchIdFromRequest(request);

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
    throw new ForbiddenError('BRANCH_NOT_FOUND', 'Branch not found');
  }

  // Check if branch is accessible at all
  if (!branch.isAccessible) {
    throw new ForbiddenError(
      'BRANCH_ACCESS_RESTRICTED',
      branch.accessRestrictedReason || 'Branch access is restricted'
    );
  }

  // No subscription yet - allow access
  if (!branch.subscriptionStatus) {
    return;
  }

  // Check if this is a write operation
  const isWriteOperation = WRITE_METHODS.includes(request.method);

  // Full access statuses can do anything
  if (FULL_ACCESS_STATUSES.includes(branch.subscriptionStatus)) {
    return;
  }

  // Read-only statuses can only read
  if (READ_ONLY_STATUSES.includes(branch.subscriptionStatus)) {
    if (isWriteOperation) {
      throw new ForbiddenError(
        'SUBSCRIPTION_READ_ONLY',
        `Your subscription is ${branch.subscriptionStatus}. You can view data but cannot make changes. Please renew to continue.`
      );
    }
    return;
  }

  // Expired status - no access
  if (branch.subscriptionStatus === 'expired') {
    throw new ForbiddenError(
      'SUBSCRIPTION_EXPIRED',
      'Your subscription has expired. Please renew to access this branch.'
    );
  }
}

/**
 * Add subscription status warning to response headers
 * Use this to notify frontend about subscription issues
 */
export async function addSubscriptionWarning(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const branchId = getBranchIdFromRequest(request);

  if (!branchId) {
    return;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      subscriptionStatus: true,
      subscription: {
        select: {
          gracePeriodEndDate: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!branch?.subscriptionStatus) {
    return;
  }

  // Add warning headers for problematic statuses
  if (branch.subscriptionStatus === 'past_due') {
    reply.header('X-Subscription-Warning', 'past_due');
    if (branch.subscription?.gracePeriodEndDate) {
      reply.header(
        'X-Subscription-Grace-End',
        branch.subscription.gracePeriodEndDate.toISOString()
      );
    }
  } else if (branch.subscriptionStatus === 'trial') {
    reply.header('X-Subscription-Warning', 'trial');
    if (branch.subscription?.currentPeriodEnd) {
      reply.header('X-Subscription-Trial-End', branch.subscription.currentPeriodEnd.toISOString());
    }
  } else if (branch.subscription?.cancelAtPeriodEnd) {
    reply.header('X-Subscription-Warning', 'cancelling');
    if (branch.subscription?.currentPeriodEnd) {
      reply.header('X-Subscription-End-Date', branch.subscription.currentPeriodEnd.toISOString());
    }
  }
}

/**
 * Extract branch ID from request
 * Checks params, query, and body
 */
function getBranchIdFromRequest(request: FastifyRequest): string | null {
  // Check route params
  const params = request.params as Record<string, string>;
  if (params.branchId) {
    return params.branchId;
  }

  // Check query string
  const query = request.query as Record<string, string>;
  if (query.branchId) {
    return query.branchId;
  }

  // Check request body
  const body = request.body as Record<string, unknown> | null;
  if (body?.branchId && typeof body.branchId === 'string') {
    return body.branchId;
  }

  // Check user's branch context (if they only have one branch)
  const user = request.user;
  if (user?.branchIds?.length === 1) {
    return user.branchIds[0];
  }

  return null;
}
