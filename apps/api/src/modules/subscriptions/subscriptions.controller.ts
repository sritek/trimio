/**
 * Subscriptions Controller
 * HTTP handlers for subscription management
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

import { successResponse, paginatedResponse } from '../../lib/response';
import { getSubscriptionAccess } from '../../lib/feature-access';
import { subscriptionsService } from './subscriptions.service';
import type {
  CreatePlanInput,
  UpdatePlanInput,
  ListPlansQuery,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ChangePlanInput,
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
  ListInvoicesQuery,
  RecordManualPaymentInput,
  UpdateBillingSettingsInput,
  BillingOverviewQuery,
} from './subscriptions.schema';

// ============================================
// Subscription Plans
// ============================================

/**
 * List all subscription plans
 */
export async function listPlans(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as ListPlansQuery;
  const plans = await subscriptionsService.listPlans(query);
  return reply.send(successResponse(plans));
}

/**
 * Get a subscription plan by ID
 */
export async function getPlan(request: FastifyRequest, reply: FastifyReply) {
  const { planId } = request.params as { planId: string };
  const plan = await subscriptionsService.getPlanById(planId);
  return reply.send(successResponse(plan));
}

/**
 * Create a new subscription plan (admin only)
 */
export async function createPlan(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreatePlanInput;
  const plan = await subscriptionsService.createPlan(body);
  return reply.status(201).send(successResponse(plan));
}

/**
 * Update a subscription plan (admin only)
 */
export async function updatePlan(request: FastifyRequest, reply: FastifyReply) {
  const { planId } = request.params as { planId: string };
  const body = request.body as UpdatePlanInput;
  const plan = await subscriptionsService.updatePlan(planId, body);
  return reply.send(successResponse(plan));
}

// ============================================
// Branch Subscriptions
// ============================================

/**
 * Get subscription for a branch
 */
export async function getSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const subscription = await subscriptionsService.getSubscription(tenantId, branchId);
  return reply.send(successResponse(subscription));
}

/**
 * Create a new subscription for a branch
 */
export async function createSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as CreateSubscriptionInput;
  const subscription = await subscriptionsService.createSubscription(tenantId, body, userId);
  return reply.status(201).send(successResponse(subscription));
}

/**
 * Update subscription settings
 */
export async function updateSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const body = request.body as UpdateSubscriptionInput;
  const subscription = await subscriptionsService.updateSubscription(
    tenantId,
    branchId,
    body,
    userId
  );
  return reply.send(successResponse(subscription));
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export async function changePlan(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const body = request.body as ChangePlanInput;
  const subscription = await subscriptionsService.changePlan(tenantId, branchId, body, userId);
  return reply.send(successResponse(subscription));
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const body = request.body as CancelSubscriptionInput;
  const subscription = await subscriptionsService.cancelSubscription(
    tenantId,
    branchId,
    body,
    userId
  );
  return reply.send(successResponse(subscription));
}

/**
 * Reactivate a suspended or cancelled subscription
 */
export async function reactivateSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const body = request.body as ReactivateSubscriptionInput;
  const subscription = await subscriptionsService.reactivateSubscription(
    tenantId,
    branchId,
    body,
    userId
  );
  return reply.send(successResponse(subscription));
}

/**
 * Get subscription history
 */
export async function getSubscriptionHistory(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { branchId } = request.params as { branchId: string };
  const history = await subscriptionsService.getSubscriptionHistory(tenantId, branchId);
  return reply.send(successResponse(history));
}

// ============================================
// Subscription Invoices
// ============================================

/**
 * List subscription invoices
 */
export async function listInvoices(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const query = request.query as ListInvoicesQuery;
  const result = await subscriptionsService.listInvoices(tenantId, query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

/**
 * Get invoice by ID
 */
export async function getInvoice(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const { invoiceId } = request.params as { invoiceId: string };
  const invoice = await subscriptionsService.getInvoice(tenantId, invoiceId);
  return reply.send(successResponse(invoice));
}

/**
 * Record a manual payment
 */
export async function recordManualPayment(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as RecordManualPaymentInput;
  const result = await subscriptionsService.recordManualPayment(tenantId, body, userId);
  return reply.status(201).send(successResponse(result));
}

// ============================================
// Billing Overview
// ============================================

/**
 * Get billing overview for tenant
 */
export async function getBillingOverview(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const query = request.query as BillingOverviewQuery;
  const overview = await subscriptionsService.getBillingOverview(tenantId, query.branchId);
  return reply.send(successResponse(overview));
}

/**
 * Get tenant billing settings
 */
export async function getBillingSettings(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const settings = await subscriptionsService.getBillingSettings(tenantId);
  return reply.send(successResponse(settings));
}

/**
 * Update tenant billing settings
 */
export async function updateBillingSettings(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId, sub: userId } = request.user!;
  const body = request.body as UpdateBillingSettingsInput;
  const settings = await subscriptionsService.updateBillingSettings(tenantId, body, userId);
  return reply.send(successResponse(settings));
}

// ============================================
// Feature Access
// ============================================

/**
 * Get subscription access info for a branch
 * Returns features and limits based on the branch's subscription plan
 */
export async function getAccess(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.params as { branchId: string };
  const access = await getSubscriptionAccess(branchId);
  return reply.send(successResponse(access));
}

/**
 * Get current counts for limited resources
 * Returns counts of users, services, and products for the tenant
 */
export async function getLimitCounts(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user!;
  const counts = await subscriptionsService.getLimitCounts(tenantId);
  return reply.send(successResponse(counts));
}
