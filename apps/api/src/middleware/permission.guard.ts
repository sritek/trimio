/**
 * Permission Guard Middleware
 * Role-based access control for API routes
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { hasPermission, PERMISSIONS, type UserRole } from '@trimio/shared';

import { ForbiddenError } from '../lib/errors';

/**
 * Creates a permission check preHandler
 * Verifies the authenticated user has the required permission
 *
 * Usage:
 * ```typescript
 * fastify.get('/services', {
 *   preHandler: [authenticate, requirePermission(PERMISSIONS.SERVICES_READ)],
 * }, handler);
 * ```
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role } = request.user;

    if (!hasPermission(role as UserRole, permission)) {
      throw new ForbiddenError(`Insufficient permissions: ${permission} required`);
    }
  };
}

/**
 * Creates a permission check that requires ANY of the specified permissions
 *
 * Usage:
 * ```typescript
 * fastify.get('/data', {
 *   preHandler: [authenticate, requireAnyPermission([PERMISSIONS.BILLS_READ, PERMISSIONS.REPORTS_READ])],
 * }, handler);
 * ```
 */
export function requireAnyPermission(permissions: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role } = request.user;

    const hasAny = permissions.some((permission) => hasPermission(role as UserRole, permission));

    if (!hasAny) {
      throw new ForbiddenError(
        `Insufficient permissions: one of [${permissions.join(', ')}] required`
      );
    }
  };
}

/**
 * Creates a permission check that requires ALL of the specified permissions
 *
 * Usage:
 * ```typescript
 * fastify.post('/sensitive', {
 *   preHandler: [authenticate, requireAllPermissions([PERMISSIONS.BILLS_WRITE, PERMISSIONS.EXPENSES_WRITE])],
 * }, handler);
 * ```
 */
export function requireAllPermissions(permissions: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role } = request.user;

    const hasAll = permissions.every((permission) => hasPermission(role as UserRole, permission));

    if (!hasAll) {
      throw new ForbiddenError(
        `Insufficient permissions: all of [${permissions.join(', ')}] required`
      );
    }
  };
}

/**
 * Creates a role check preHandler
 * Verifies the authenticated user has one of the specified roles
 *
 * Usage:
 * ```typescript
 * fastify.delete('/users/:id', {
 *   preHandler: [authenticate, requireRole(['super_owner', 'regional_manager'])],
 * }, handler);
 * ```
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { role } = request.user;

    if (!allowedRoles.includes(role as UserRole)) {
      throw new ForbiddenError(`Access denied: role must be one of [${allowedRoles.join(', ')}]`);
    }
  };
}

// ============================================
// Convenience Guards for Common Permissions
// ============================================

// Services
export const requireServicesRead = requirePermission(PERMISSIONS.SERVICES_READ);
export const requireServicesWrite = requirePermission(PERMISSIONS.SERVICES_WRITE);
export const requireServicesManage = requirePermission(PERMISSIONS.SERVICES_MANAGE);

// Appointments
export const requireAppointmentsRead = requirePermission(PERMISSIONS.APPOINTMENTS_READ);
export const requireAppointmentsWrite = requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
export const requireAppointmentsManage = requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);

// Customers
export const requireCustomersRead = requirePermission(PERMISSIONS.CUSTOMERS_READ);
export const requireCustomersWrite = requirePermission(PERMISSIONS.CUSTOMERS_WRITE);
export const requireCustomersManage = requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);

// Bills
export const requireBillsRead = requirePermission(PERMISSIONS.BILLS_READ);
export const requireBillsWrite = requirePermission(PERMISSIONS.BILLS_WRITE);
export const requireBillsManage = requirePermission(PERMISSIONS.BILLS_MANAGE);

// Reports
export const requireReportsRead = requirePermission(PERMISSIONS.REPORTS_READ);
export const requireReportsManage = requirePermission(PERMISSIONS.REPORTS_MANAGE);

// Inventory
export const requireInventoryRead = requirePermission(PERMISSIONS.INVENTORY_READ);
export const requireInventoryWrite = requirePermission(PERMISSIONS.INVENTORY_WRITE);
export const requireInventoryManage = requirePermission(PERMISSIONS.INVENTORY_MANAGE);

// Expenses
export const requireExpensesRead = requirePermission(PERMISSIONS.EXPENSES_READ);
export const requireExpensesWrite = requirePermission(PERMISSIONS.EXPENSES_WRITE);
export const requireExpensesManage = requirePermission(PERMISSIONS.EXPENSES_MANAGE);

// Marketing
export const requireMarketingRead = requirePermission(PERMISSIONS.MARKETING_READ);
export const requireMarketingWrite = requirePermission(PERMISSIONS.MARKETING_WRITE);
export const requireMarketingManage = requirePermission(PERMISSIONS.MARKETING_MANAGE);

// Users/Staff
export const requireUsersRead = requirePermission(PERMISSIONS.USERS_READ);
export const requireUsersWrite = requirePermission(PERMISSIONS.USERS_WRITE);
export const requireUsersManage = requirePermission(PERMISSIONS.USERS_MANAGE);

// Branch
export const requireBranchRead = requirePermission(PERMISSIONS.BRANCH_READ);
export const requireBranchWrite = requirePermission(PERMISSIONS.BRANCH_WRITE);
export const requireBranchManage = requirePermission(PERMISSIONS.BRANCH_MANAGE);

// Tenant
export const requireTenantManage = requirePermission(PERMISSIONS.TENANT_MANAGE);

// Settings
export const requireSettingsManage = requirePermission(PERMISSIONS.SETTINGS_MANAGE);

// Re-export PERMISSIONS for convenience
export { PERMISSIONS } from '@trimio/shared';
