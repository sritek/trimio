/**
 * Middleware Barrel Export
 * Centralized exports for all middleware
 */

// Authentication
export { authenticate, optionalAuthenticate } from './auth.middleware';
export type { JwtUser } from './auth.middleware';

// Permission Guards
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  // Convenience guards
  requireServicesRead,
  requireServicesWrite,
  requireServicesManage,
  requireAppointmentsRead,
  requireAppointmentsWrite,
  requireAppointmentsManage,
  requireCustomersRead,
  requireCustomersWrite,
  requireCustomersManage,
  requireBillsRead,
  requireBillsWrite,
  requireBillsManage,
  requireReportsRead,
  requireReportsManage,
  requireInventoryRead,
  requireInventoryWrite,
  requireInventoryManage,
  requireExpensesRead,
  requireExpensesWrite,
  requireExpensesManage,
  requireMarketingRead,
  requireMarketingWrite,
  requireMarketingManage,
  requireUsersRead,
  requireUsersWrite,
  requireUsersManage,
  requireBranchRead,
  requireBranchWrite,
  requireBranchManage,
  requireTenantManage,
  requireSettingsManage,
  PERMISSIONS,
} from './permission.guard';

// Branch Access Guards
export { requireBranchAccess, requireBranchesAccess, requireOwnResource } from './branch.guard';

// Subscription Guards
export {
  requireActiveSubscription,
  checkSubscriptionAccess,
  addSubscriptionWarning,
} from './subscription.guard';

// Feature Guards
export { featureGuard, attachSubscriptionAccess } from './feature.guard';
