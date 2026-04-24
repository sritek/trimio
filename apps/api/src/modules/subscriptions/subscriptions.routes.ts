/**
 * Subscriptions Routes
 * API endpoints for subscription management
 */

import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import {
  // Plans
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  // Subscriptions
  getSubscription,
  createSubscription,
  updateSubscription,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionHistory,
  // Feature Access
  getAccess,
  // Invoices
  listInvoices,
  getInvoice,
  recordManualPayment,
  // Billing
  getBillingOverview,
  getBillingSettings,
  updateBillingSettings,
  // Limits
  getLimitCounts,
} from './subscriptions.controller';

export async function subscriptionsRoutes(fastify: FastifyInstance) {
  // ============================================
  // Public Routes (for pricing page)
  // ============================================

  // List public subscription plans (no auth required)
  fastify.get('/plans', listPlans);

  // Get plan details (no auth required)
  fastify.get('/plans/:planId', getPlan);

  // ============================================
  // Protected Routes
  // ============================================

  // All routes below require authentication
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', authenticate);

    // ============================================
    // Admin Plan Management (super_owner only)
    // ============================================

    // Create plan
    protectedRoutes.post(
      '/plans',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      createPlan
    );

    // Update plan
    protectedRoutes.patch(
      '/plans/:planId',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      updatePlan
    );

    // ============================================
    // Branch Subscriptions
    // ============================================

    // Create subscription for a branch
    protectedRoutes.post(
      '/branches',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      createSubscription
    );

    // Get subscription for a branch
    protectedRoutes.get(
      '/branches/:branchId',
      {
        preHandler: requirePermission(PERMISSIONS.BRANCH_READ),
      },
      getSubscription
    );

    // Update subscription settings
    protectedRoutes.patch(
      '/branches/:branchId',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      updateSubscription
    );

    // Change plan (upgrade/downgrade)
    protectedRoutes.post(
      '/branches/:branchId/change-plan',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      changePlan
    );

    // Cancel subscription
    protectedRoutes.post(
      '/branches/:branchId/cancel',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      cancelSubscription
    );

    // Reactivate subscription
    protectedRoutes.post(
      '/branches/:branchId/reactivate',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      reactivateSubscription
    );

    // Get subscription history
    protectedRoutes.get(
      '/branches/:branchId/history',
      {
        preHandler: requirePermission(PERMISSIONS.BRANCH_READ),
      },
      getSubscriptionHistory
    );

    // Get subscription access (features and limits)
    protectedRoutes.get(
      '/branches/:branchId/access',
      {
        preHandler: requirePermission(PERMISSIONS.BRANCH_READ),
      },
      getAccess
    );

    // ============================================
    // Subscription Invoices
    // ============================================

    // List invoices
    protectedRoutes.get(
      '/invoices',
      {
        preHandler: requirePermission(PERMISSIONS.BILLS_READ),
      },
      listInvoices
    );

    // Get invoice details
    protectedRoutes.get(
      '/invoices/:invoiceId',
      {
        preHandler: requirePermission(PERMISSIONS.BILLS_READ),
      },
      getInvoice
    );

    // Record manual payment
    protectedRoutes.post(
      '/payments/manual',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      recordManualPayment
    );

    // ============================================
    // Billing Overview & Settings
    // ============================================

    // Get billing overview
    protectedRoutes.get(
      '/billing/overview',
      {
        preHandler: requirePermission(PERMISSIONS.BILLS_READ),
      },
      getBillingOverview
    );

    // Get billing settings
    protectedRoutes.get(
      '/billing/settings',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      getBillingSettings
    );

    // Update billing settings
    protectedRoutes.patch(
      '/billing/settings',
      {
        preHandler: requirePermission(PERMISSIONS.TENANT_MANAGE),
      },
      updateBillingSettings
    );

    // ============================================
    // Limit Counts
    // ============================================

    // Get current counts for limited resources
    protectedRoutes.get('/limits/counts', getLimitCounts);
  });
}
