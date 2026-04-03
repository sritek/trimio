/**
 * Role-Based View Configuration
 * Defines default routes and dashboard layouts per user role
 * Requirements: 7.1, 7.2, 7.3
 */

import type { LucideIcon } from 'lucide-react';
import {
  CalendarPlus,
  UserPlus,
  CreditCard,
  UserCheck,
  Play,
  CheckCircle,
  Eye,
  FileText,
  Calculator,
  Download,
} from 'lucide-react';

export type UserRole =
  | 'super_owner'
  | 'regional_manager'
  | 'branch_manager'
  | 'receptionist'
  | 'stylist'
  | 'accountant';

export interface DashboardWidget {
  id: string;
  size: 'small' | 'medium' | 'large' | 'full';
}

export interface QuickActionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: string;
}

export interface RoleViewConfig {
  defaultRoute: string;
  dashboardLayout: DashboardWidget[];
  sidebarItems: string[] | 'all';
  quickActions: QuickActionConfig[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleViewConfig> = {
  super_owner: {
    defaultRoute: '/dashboard',
    dashboardLayout: [
      { id: 'revenue-chart', size: 'large' },
      { id: 'branch-comparison', size: 'medium' },
      { id: 'staff-performance', size: 'medium' },
      { id: 'attention-items', size: 'small' },
    ],
    sidebarItems: 'all',
    quickActions: [
      {
        id: 'new-appointment',
        label: 'New Appointment',
        icon: CalendarPlus,
        href: '/appointments/new',
      },
      { id: 'new-customer', label: 'New Customer', icon: UserPlus, href: '/customers/new' },
      { id: 'view-reports', label: 'View Reports', icon: FileText, href: '/reports' },
    ],
  },
  regional_manager: {
    defaultRoute: '/dashboard',
    dashboardLayout: [
      { id: 'quick-stats', size: 'full' },
      { id: 'revenue-chart', size: 'medium' },
      { id: 'branch-comparison', size: 'medium' },
      { id: 'staff-performance', size: 'medium' },
      { id: 'attention-items', size: 'small' },
    ],
    sidebarItems: 'all',
    quickActions: [
      {
        id: 'new-appointment',
        label: 'New Appointment',
        icon: CalendarPlus,
        href: '/appointments/new',
      },
      { id: 'new-customer', label: 'New Customer', icon: UserPlus, href: '/customers/new' },
      { id: 'view-reports', label: 'View Reports', icon: FileText, href: '/reports' },
    ],
  },
  branch_manager: {
    defaultRoute: '/dashboard',
    dashboardLayout: [
      { id: 'quick-stats', size: 'full' },
      { id: 'revenue-chart', size: 'medium' },
      { id: 'staff-performance', size: 'medium' },
      { id: 'attention-items', size: 'small' },
      { id: 'command-center', size: 'large' },
    ],
    sidebarItems: 'all',
    quickActions: [
      {
        id: 'new-appointment',
        label: 'New Appointment',
        icon: CalendarPlus,
        href: '/appointments/new',
      },
      { id: 'new-customer', label: 'New Customer', icon: UserPlus, href: '/customers/new' },
      { id: 'view-reports', label: 'View Reports', icon: FileText, href: '/reports' },
    ],
  },
  receptionist: {
    defaultRoute: '/command-center',
    dashboardLayout: [
      { id: 'quick-stats', size: 'small' },
      { id: 'station-view', size: 'medium' },
      { id: 'next-up-queue', size: 'medium' },
      { id: 'attention-items', size: 'small' },
      { id: 'live-timeline', size: 'large' },
    ],
    sidebarItems: ['dashboard', 'appointments', 'customers', 'billing'],
    quickActions: [
      {
        id: 'new-appointment',
        label: 'New Appointment',
        icon: CalendarPlus,
        href: '/appointments/new',
      },
      { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, action: 'checkout' },
      { id: 'check-in', label: 'Check In', icon: UserCheck, action: 'check-in' },
    ],
  },
  stylist: {
    defaultRoute: '/today',
    dashboardLayout: [
      { id: 'my-stats', size: 'small' },
      { id: 'live-timeline', size: 'large' },
      { id: 'my-next-client', size: 'medium' },
    ],
    sidebarItems: ['dashboard', 'appointments', 'customers'],
    quickActions: [
      { id: 'start-service', label: 'Start Service', icon: Play, action: 'start-service' },
      {
        id: 'complete-service',
        label: 'Complete Service',
        icon: CheckCircle,
        action: 'complete-service',
      },
      { id: 'view-client', label: 'View Client', icon: Eye, action: 'view-client' },
    ],
  },
  accountant: {
    defaultRoute: '/billing',
    dashboardLayout: [
      { id: 'revenue-summary', size: 'medium' },
      { id: 'pending-invoices', size: 'medium' },
      { id: 'expense-summary', size: 'medium' },
      { id: 'cash-reconciliation', size: 'small' },
    ],
    sidebarItems: ['dashboard', 'billing', 'expenses', 'reports'],
    quickActions: [
      { id: 'view-reports', label: 'View Reports', icon: FileText, href: '/reports' },
      {
        id: 'reconcile-cash',
        label: 'Reconcile Cash',
        icon: Calculator,
        href: '/billing/reconciliation',
      },
      { id: 'export-data', label: 'Export Data', icon: Download, action: 'export' },
    ],
  },
};

/**
 * Get the default route for a user role
 */
export function getDefaultRouteForRole(role: string): string {
  const config = ROLE_CONFIGS[role as UserRole];
  return config?.defaultRoute || '/dashboard';
}

/**
 * Get the dashboard layout configuration for a role
 */
export function getDashboardLayoutForRole(role: string): DashboardWidget[] {
  const config = ROLE_CONFIGS[role as UserRole];
  return config?.dashboardLayout || [];
}

/**
 * Get the quick actions for a role
 */
export function getQuickActionsForRole(role: string): QuickActionConfig[] {
  const config = ROLE_CONFIGS[role as UserRole];
  return config?.quickActions || [];
}

/**
 * Check if a sidebar item should be visible for a role
 */
export function isSidebarItemVisibleForRole(role: string, itemId: string): boolean {
  const config = ROLE_CONFIGS[role as UserRole];
  if (!config) return true;
  if (config.sidebarItems === 'all') return true;
  return config.sidebarItems.includes(itemId);
}

/**
 * Check if user has permission to access a route based on role
 */
export function canAccessRoute(role: string, route: string): boolean {
  // Super owner and regional manager can access everything
  if (role === 'super_owner' || role === 'regional_manager') return true;

  // Branch manager can access everything except tenant-level settings
  if (role === 'branch_manager') {
    return !route.startsWith('/settings/tenant');
  }

  // Receptionist routes
  if (role === 'receptionist') {
    const allowedPrefixes = [
      '/dashboard',
      '/command-center',
      '/appointments',
      '/customers',
      '/billing',
      '/walk-in',
    ];
    return allowedPrefixes.some((prefix) => route.startsWith(prefix));
  }

  // Stylist routes
  if (role === 'stylist') {
    const allowedPrefixes = ['/dashboard', '/today', '/appointments', '/customers'];
    return allowedPrefixes.some((prefix) => route.startsWith(prefix));
  }

  // Accountant routes
  if (role === 'accountant') {
    const allowedPrefixes = ['/dashboard', '/billing', '/expenses', '/reports'];
    return allowedPrefixes.some((prefix) => route.startsWith(prefix));
  }

  return false;
}
