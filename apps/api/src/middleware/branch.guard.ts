/**
 * Branch Access Guard Middleware
 * Ensures users can only access branches they are assigned to
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '@trimio/shared';

import { ForbiddenError } from '../lib/errors';

/**
 * Roles that have access to all branches within their tenant
 */
const GLOBAL_BRANCH_ACCESS_ROLES: UserRole[] = ['super_owner', 'regional_manager'];

/**
 * Creates a branch access check preHandler
 * Verifies the authenticated user has access to the specified branch
 *
 * Usage:
 * ```typescript
 * fastify.get('/branches/:branchId/appointments', {
 *   preHandler: [authenticate, requireBranchAccess('branchId')],
 * }, handler);
 * ```
 *
 * @param branchIdParam - The name of the route parameter or body field containing the branch ID
 */
export function requireBranchAccess(branchIdParam = 'branchId') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role, branchIds } = request.user;

    // Super owner and regional manager have access to all branches
    if (GLOBAL_BRANCH_ACCESS_ROLES.includes(role as UserRole)) {
      return;
    }

    // Get branch ID from params, body, or query
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, string>;

    const branchId = params[branchIdParam] || body?.[branchIdParam] || query[branchIdParam];

    if (!branchId) {
      // No branch ID specified - this is allowed for tenant-wide operations
      return;
    }

    // Check if user has access to this branch
    if (!branchIds.includes(branchId as string)) {
      throw new ForbiddenError('No access to this branch');
    }
  };
}

/**
 * Creates a branch access check that requires access to ALL specified branches
 *
 * Usage:
 * ```typescript
 * fastify.post('/transfer', {
 *   preHandler: [authenticate, requireBranchesAccess(['sourceBranchId', 'targetBranchId'])],
 * }, handler);
 * ```
 */
export function requireBranchesAccess(branchIdParams: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role, branchIds } = request.user;

    // Super owner and regional manager have access to all branches
    if (GLOBAL_BRANCH_ACCESS_ROLES.includes(role as UserRole)) {
      return;
    }

    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown> | undefined;

    // Check access to all specified branches
    for (const param of branchIdParams) {
      const branchId = params[param] || body?.[param];

      if (branchId && !branchIds.includes(branchId as string)) {
        throw new ForbiddenError(`No access to branch specified in ${param}`);
      }
    }
  };
}

/**
 * Middleware to ensure the user can only access their own data
 * Useful for stylist role viewing their own appointments/bills
 *
 * Usage:
 * ```typescript
 * fastify.get('/appointments/:id', {
 *   preHandler: [authenticate, requireOwnResource('stylistId')],
 * }, handler);
 * ```
 */
export function requireOwnResource(userIdField = 'userId') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { sub: userId, role } = request.user;

    // Managers and above can access any resource
    const managerRoles: UserRole[] = ['super_owner', 'regional_manager', 'branch_manager'];
    if (managerRoles.includes(role as UserRole)) {
      return;
    }

    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, string>;

    const resourceUserId = params[userIdField] || body?.[userIdField] || query[userIdField];

    if (resourceUserId && resourceUserId !== userId) {
      throw new ForbiddenError('You can only access your own resources');
    }
  };
}
