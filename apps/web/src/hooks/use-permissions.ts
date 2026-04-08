/**
 * usePermissions Hook
 * Role-based access control for UI components
 */

'use client';

import { useCallback, useMemo } from 'react';

import { hasPermission as checkPermission, type UserRole } from '@trimio/shared';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook for checking user permissions in the frontend
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { hasPermission, hasRole, isManager } = usePermissions();
 *
 *   if (!hasPermission(PERMISSIONS.SERVICES_WRITE)) {
 *     return null;
 *   }
 *
 *   return <EditButton />;
 * }
 * ```
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role as UserRole | undefined;

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      return checkPermission(role, permission);
    },
    [role]
  );

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!role) return false;
      return permissions.some((p) => hasPermission(p));
    },
    [role, hasPermission]
  );

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!role) return false;
      return permissions.every((p) => hasPermission(p));
    },
    [role, hasPermission]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (requiredRole: UserRole): boolean => {
      return role === requiredRole;
    },
    [role]
  );

  /**
   * Check if user has ANY of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: UserRole[]): boolean => {
      return role ? roles.includes(role) : false;
    },
    [role]
  );

  /**
   * Convenience boolean flags for common role checks
   */
  const roleFlags = useMemo(
    () => ({
      isOwner: role === 'super_owner',
      isRegionalManager: role === 'regional_manager',
      isBranchManager: role === 'branch_manager',
      isReceptionist: role === 'receptionist',
      isStylist: role === 'stylist',
      isAccountant: role === 'accountant',
      // Combined checks
      isManager: role === 'super_owner' || role === 'regional_manager' || role === 'branch_manager',
      isAdmin: role === 'super_owner' || role === 'regional_manager',
    }),
    [role]
  );

  return {
    role,
    permissions: user?.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    ...roleFlags,
  };
}

// Re-export PERMISSIONS for convenience
export { PERMISSIONS } from '@trimio/shared';
