/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */

'use client';

import type { ReactNode } from 'react';

import type { UserRole } from '@trimio/shared';

import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** If true, requires ALL permissions; if false (default), requires ANY */
  requireAll?: boolean;
  /** Single role to check */
  role?: UserRole;
  /** Multiple roles to check (user must have one of them) */
  roles?: UserRole[];
  /** Content to render when access is denied */
  fallback?: ReactNode;
  /** Children to render when access is granted */
  children: ReactNode;
}

/**
 * Conditionally renders children based on user permissions and/or roles
 *
 * Usage:
 * ```tsx
 * // Single permission
 * <PermissionGuard permission={PERMISSIONS.SERVICES_WRITE}>
 *   <EditButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (any)
 * <PermissionGuard permissions={[PERMISSIONS.BILLS_READ, PERMISSIONS.REPORTS_READ]}>
 *   <ViewReportsButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (all)
 * <PermissionGuard permissions={[PERMISSIONS.BILLS_WRITE, PERMISSIONS.EXPENSES_WRITE]} requireAll>
 *   <FinancePanel />
 * </PermissionGuard>
 *
 * // Role-based
 * <PermissionGuard roles={['super_owner', 'regional_manager']}>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * // With fallback
 * <PermissionGuard permission={PERMISSIONS.SERVICES_WRITE} fallback={<AccessDenied />}>
 *   <ServiceEditor />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } =
    usePermissions();

  let hasAccess = true;

  // Check permission(s)
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  // Check role(s)
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  } else if (roles && roles.length > 0) {
    hasAccess = hasAccess && hasAnyRole(roles);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
