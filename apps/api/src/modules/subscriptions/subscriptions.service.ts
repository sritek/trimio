/**
 * Subscriptions Service
 * Business logic for branch subscriptions, plans, and billing
 */

import { addDays, addMonths, addYears, startOfDay } from 'date-fns';
import { Prisma } from '@prisma/client';

import { prisma, serializeDecimals } from '../../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import {
  sendSubscriptionActivatedEmail,
  sendTrialExtendedEmail,
  sendSubscriptionSuspendedEmail,
  sendSubscriptionReactivatedEmail,
  sendWelcomeEmail,
} from '../../lib/email-notifications';
import type { PaginatedResult } from '../../lib/types';
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
} from './subscriptions.schema';

// ============================================
// Subscription Plans
// ============================================

/**
 * List all subscription plans
 */
async function listPlans(query: ListPlansQuery) {
  const where: Prisma.SubscriptionPlanWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.isPublic !== undefined) {
    where.isPublic = query.isPublic;
  }
  if (query.tier) {
    where.tier = query.tier;
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  });

  return serializeDecimals(plans);
}

/**
 * Get a subscription plan by ID
 */
async function getPlanById(planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'Subscription plan not found');
  }

  return serializeDecimals(plan);
}

/**
 * Get a subscription plan by code
 */
async function getPlanByCode(code: string) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code },
  });

  if (!plan) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'Subscription plan not found');
  }

  return serializeDecimals(plan);
}

/**
 * Create a new subscription plan (admin only)
 */
async function createPlan(data: CreatePlanInput) {
  // Check for duplicate code
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new ConflictError('DUPLICATE_PLAN_CODE', 'A plan with this code already exists');
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: data.name,
      code: data.code,
      tier: data.tier,
      description: data.description,
      monthlyPrice: data.monthlyPrice,
      annualPrice: data.annualPrice,
      currency: data.currency,
      maxUsers: data.maxUsers,
      maxAppointmentsPerDay: data.maxAppointmentsPerDay,
      maxServices: data.maxServices,
      maxProducts: data.maxProducts,
      features: data.features as Prisma.InputJsonValue,
      trialDays: data.trialDays,
      gracePeriodDays: data.gracePeriodDays,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      isPublic: data.isPublic,
    },
  });

  return serializeDecimals(plan);
}

/**
 * Update a subscription plan (admin only)
 */
async function updatePlan(planId: string, data: UpdatePlanInput) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'Subscription plan not found');
  }

  // Build update data with proper typing
  const updateData: Prisma.SubscriptionPlanUpdateInput = {
    ...data,
    features: data.features ? (data.features as Prisma.InputJsonValue) : undefined,
  };

  const updated = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: updateData,
  });

  return serializeDecimals(updated);
}

// ============================================
// Branch Subscriptions
// ============================================

/**
 * Get subscription for a branch
 */
async function getSubscription(tenantId: string, branchId: string) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  // Verify tenant ownership
  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  return serializeDecimals(subscription);
}

/**
 * Create a new subscription for a branch
 */
async function createSubscription(tenantId: string, data: CreateSubscriptionInput, userId: string) {
  // Check if branch exists and belongs to tenant
  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, tenantId, deletedAt: null },
  });

  if (!branch) {
    throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
  }

  // Check if branch already has a subscription
  const existingSubscription = await prisma.branchSubscription.findUnique({
    where: { branchId: data.branchId },
  });

  if (existingSubscription) {
    throw new ConflictError('SUBSCRIPTION_EXISTS', 'This branch already has a subscription');
  }

  // Get the plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: data.planId },
  });

  if (!plan || !plan.isActive) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'Subscription plan not found or inactive');
  }

  // Calculate pricing - round to nearest rupee for clean billing
  const basePrice = data.billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const discountAmount = basePrice.mul(data.discountPercentage).div(100);
  const pricePerPeriod = new Prisma.Decimal(Math.round(basePrice.sub(discountAmount).toNumber()));

  // Calculate dates using the plan's trial days (will be locked in subscription)
  const today = startOfDay(new Date());
  let trialStartDate: Date | null = null;
  let trialEndDate: Date | null = null;
  let currentPeriodStart: Date;
  let currentPeriodEnd: Date;
  let status: 'trial' | 'active';

  // Lock the plan terms at subscription creation
  const trialDaysGranted = data.startTrial ? plan.trialDays : 0;
  const gracePeriodDaysGranted = plan.gracePeriodDays;

  if (data.startTrial && plan.trialDays > 0) {
    // Start with trial - use the granted trial days
    trialStartDate = today;
    trialEndDate = addDays(today, trialDaysGranted);
    currentPeriodStart = today;
    currentPeriodEnd = trialEndDate;
    status = 'trial';
  } else {
    // Start active immediately
    currentPeriodStart = today;
    currentPeriodEnd = data.billingCycle === 'monthly' ? addMonths(today, 1) : addYears(today, 1);
    status = 'active';
  }

  // Create subscription with transaction
  const subscription = await prisma.$transaction(async (tx) => {
    // Create the subscription with locked plan terms
    const newSubscription = await tx.branchSubscription.create({
      data: {
        tenantId,
        branchId: data.branchId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status,
        trialStartDate,
        trialEndDate,
        currentPeriodStart,
        currentPeriodEnd,
        // Locked plan terms
        trialDaysGranted,
        gracePeriodDaysGranted,
        pricePerPeriod,
        currency: plan.currency,
        discountPercentage: data.discountPercentage,
        discountReason: data.discountReason,
        autoRenew: true,
        createdBy: userId,
      },
      include: {
        plan: true,
      },
    });

    // Update branch with subscription status
    await tx.branch.update({
      where: { id: data.branchId },
      data: {
        subscriptionStatus: status,
        subscriptionPlanId: data.planId,
        isAccessible: true,
      },
    });

    // Create history entry with locked plan terms
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: newSubscription.id,
        eventType: 'created',
        toStatus: status,
        toPlanId: data.planId,
        metadata: {
          billingCycle: data.billingCycle,
          startTrial: data.startTrial,
          discountPercentage: data.discountPercentage,
          // Record the locked plan terms for audit
          trialDaysGranted,
          gracePeriodDaysGranted,
          pricePerPeriod: pricePerPeriod.toNumber(),
        },
        performedBy: userId,
      },
    });

    return newSubscription;
  });

  // Send welcome email for new subscriptions with trial
  if (status === 'trial') {
    try {
      await sendWelcomeEmail(tenantId, data.branchId);
    } catch (emailError) {
      logger.error({ error: emailError, branchId: data.branchId }, 'Failed to send welcome email');
    }
  } else {
    // Send activation email for subscriptions starting as active
    try {
      await sendSubscriptionActivatedEmail(subscription.id);
    } catch (emailError) {
      logger.error(
        { error: emailError, subscriptionId: subscription.id },
        'Failed to send activation email'
      );
    }
  }

  return serializeDecimals(subscription);
}

/**
 * Update subscription settings
 */
async function updateSubscription(
  tenantId: string,
  branchId: string,
  data: UpdateSubscriptionInput,
  _userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  const updated = await prisma.branchSubscription.update({
    where: { id: subscription.id },
    data: {
      autoRenew: data.autoRenew,
      discountPercentage: data.discountPercentage,
      discountReason: data.discountReason,
    },
    include: {
      plan: true,
    },
  });

  return serializeDecimals(updated);
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
async function changePlan(
  tenantId: string,
  branchId: string,
  data: ChangePlanInput,
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  // Cannot change plan if suspended or expired
  if (['suspended', 'expired'].includes(subscription.status)) {
    throw new BadRequestError(
      'INVALID_STATUS',
      'Cannot change plan while subscription is suspended or expired. Please reactivate first.'
    );
  }

  // Get new plan
  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: data.newPlanId },
  });

  if (!newPlan || !newPlan.isActive) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'New subscription plan not found or inactive');
  }

  // Same plan check
  if (subscription.planId === data.newPlanId) {
    throw new BadRequestError('SAME_PLAN', 'Already subscribed to this plan');
  }

  const billingCycle = data.billingCycle || subscription.billingCycle;
  const basePrice = billingCycle === 'monthly' ? newPlan.monthlyPrice : newPlan.annualPrice;
  const discountAmount = basePrice.mul(subscription.discountPercentage).div(100);
  // Round to nearest rupee for clean billing
  const pricePerPeriod = new Prisma.Decimal(Math.round(basePrice.sub(discountAmount).toNumber()));

  // Determine if upgrade or downgrade
  const tierOrder = { basic: 1, professional: 2, enterprise: 3 };
  const isUpgrade = tierOrder[newPlan.tier] > tierOrder[subscription.plan.tier];
  const eventType = isUpgrade ? 'upgraded' : 'downgraded';

  const today = startOfDay(new Date());

  // Update subscription
  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.BranchSubscriptionUpdateInput = {
      plan: { connect: { id: data.newPlanId } },
      billingCycle,
      pricePerPeriod,
    };

    // If effective immediately, reset period
    if (data.effectiveImmediately) {
      updateData.currentPeriodStart = today;
      updateData.currentPeriodEnd =
        billingCycle === 'monthly' ? addMonths(today, 1) : addYears(today, 1);
    }

    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: { plan: true },
    });

    // Update branch
    await tx.branch.update({
      where: { id: branchId },
      data: { subscriptionPlanId: data.newPlanId },
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType,
        fromPlanId: subscription.planId,
        toPlanId: data.newPlanId,
        metadata: {
          effectiveImmediately: data.effectiveImmediately,
          billingCycle,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  return serializeDecimals(updated);
}

/**
 * Cancel subscription
 */
async function cancelSubscription(
  tenantId: string,
  branchId: string,
  data: CancelSubscriptionInput,
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  // Already cancelled
  if (subscription.status === 'cancelled') {
    throw new BadRequestError('ALREADY_CANCELLED', 'Subscription is already cancelled');
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.BranchSubscriptionUpdateInput = {
      cancelledAt: now,
      cancelledBy: userId,
      cancellationReason: data.reason,
      autoRenew: false,
    };

    if (data.cancelImmediately) {
      updateData.status = 'cancelled';
      updateData.cancelAtPeriodEnd = false;
    } else {
      updateData.cancelAtPeriodEnd = true;
    }

    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: { plan: true },
    });

    // Update branch if cancelled immediately
    if (data.cancelImmediately) {
      await tx.branch.update({
        where: { id: branchId },
        data: {
          subscriptionStatus: 'cancelled',
          isAccessible: true, // Still accessible until period end for data export
        },
      });
    }

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: 'cancelled',
        fromStatus: subscription.status,
        toStatus: data.cancelImmediately ? 'cancelled' : subscription.status,
        metadata: {
          cancelImmediately: data.cancelImmediately,
          reason: data.reason,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  return serializeDecimals(updated);
}

/**
 * Reactivate a suspended or cancelled subscription
 */
async function reactivateSubscription(
  tenantId: string,
  branchId: string,
  data: ReactivateSubscriptionInput,
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  // Can only reactivate suspended or cancelled subscriptions
  if (!['suspended', 'cancelled', 'expired'].includes(subscription.status)) {
    throw new BadRequestError(
      'INVALID_STATUS',
      'Can only reactivate suspended, cancelled, or expired subscriptions'
    );
  }

  // Determine plan and billing cycle
  const planId = data.planId || subscription.planId;
  const billingCycle = data.billingCycle || subscription.billingCycle;

  // Get plan (might be different if changing)
  const plan =
    planId !== subscription.planId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
      : subscription.plan;

  if (!plan || !plan.isActive) {
    throw new NotFoundError('PLAN_NOT_FOUND', 'Subscription plan not found or inactive');
  }

  const today = startOfDay(new Date());
  const basePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const discountAmount = basePrice.mul(subscription.discountPercentage).div(100);
  // Round to nearest rupee for clean billing
  const pricePerPeriod = new Prisma.Decimal(Math.round(basePrice.sub(discountAmount).toNumber()));

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        planId,
        billingCycle,
        pricePerPeriod,
        currentPeriodStart: today,
        currentPeriodEnd: billingCycle === 'monthly' ? addMonths(today, 1) : addYears(today, 1),
        gracePeriodEndDate: null,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        cancelAtPeriodEnd: false,
        suspendedAt: null,
        autoRenew: true,
      },
      include: { plan: true },
    });

    // Update branch
    await tx.branch.update({
      where: { id: branchId },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlanId: planId,
        isAccessible: true,
        accessRestrictedAt: null,
        accessRestrictedReason: null,
      },
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: 'reactivated',
        fromStatus: subscription.status,
        toStatus: 'active',
        fromPlanId: subscription.planId,
        toPlanId: planId,
        metadata: {
          billingCycle,
          planChanged: planId !== subscription.planId,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  // Send reactivation email
  try {
    await sendSubscriptionReactivatedEmail(subscription.id);
  } catch (emailError) {
    logger.error(
      { error: emailError, subscriptionId: subscription.id },
      'Failed to send reactivation email'
    );
  }

  return serializeDecimals(updated);
}

// ============================================
// Subscription Invoices
// ============================================

/**
 * List subscription invoices
 */
async function listInvoices(
  tenantId: string,
  query: ListInvoicesQuery
): Promise<PaginatedResult<unknown>> {
  const { page, limit, sortBy, sortOrder, branchId, status, dateFrom, dateTo } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.SubscriptionInvoiceWhereInput = { tenantId };

  if (branchId) {
    where.subscription = { branchId };
  }
  if (status) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) {
      where.invoiceDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.invoiceDate.lte = new Date(dateTo);
    }
  }

  const [data, total] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.subscriptionInvoice.count({ where }),
  ]);

  return {
    data: serializeDecimals(data) as unknown[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get invoice by ID
 */
async function getInvoice(tenantId: string, invoiceId: string) {
  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      subscription: {
        include: {
          plan: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
  }

  return serializeDecimals(invoice);
}

/**
 * Record a manual payment
 */
async function recordManualPayment(
  tenantId: string,
  data: RecordManualPaymentInput,
  userId: string
) {
  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: data.invoiceId, tenantId },
    include: { subscription: true },
  });

  if (!invoice) {
    throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found');
  }

  if (invoice.status === 'paid') {
    throw new BadRequestError('ALREADY_PAID', 'Invoice is already paid');
  }

  if (invoice.status === 'cancelled') {
    throw new BadRequestError('INVOICE_CANCELLED', 'Cannot pay a cancelled invoice');
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Create payment record
    const payment = await tx.subscriptionPayment.create({
      data: {
        tenantId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        amount: data.amount,
        currency: 'INR',
        gateway: 'manual',
        gatewayPaymentId: data.transactionId,
        status: 'completed',
        paymentDate: now,
      },
    });

    // Update invoice
    const newAmountPaid = invoice.amountPaid.add(data.amount);
    const isPaid = newAmountPaid.gte(invoice.grandTotal);

    const updatedInvoice = await tx.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        status: isPaid ? 'paid' : 'pending',
        paidAt: isPaid ? now : null,
      },
    });

    // If paid, update subscription status if it was past_due
    if (isPaid && invoice.subscription.status === 'past_due') {
      await tx.branchSubscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: 'active',
          gracePeriodEndDate: null,
        },
      });

      await tx.branch.update({
        where: { id: invoice.subscription.branchId },
        data: {
          subscriptionStatus: 'active',
        },
      });

      // Create history entry
      await tx.subscriptionHistory.create({
        data: {
          tenantId,
          subscriptionId: invoice.subscriptionId,
          eventType: 'activated',
          fromStatus: 'past_due',
          toStatus: 'active',
          metadata: {
            paymentId: payment.id,
            invoiceId: invoice.id,
          },
          performedBy: userId,
        },
      });
    }

    return { payment, invoice: updatedInvoice };
  });

  return serializeDecimals(result);
}

// ============================================
// Billing Overview
// ============================================

/**
 * Get billing overview for tenant
 */
async function getBillingOverview(tenantId: string, branchId?: string) {
  const where: Prisma.BranchSubscriptionWhereInput = { tenantId };
  if (branchId) {
    where.branchId = branchId;
  }

  const subscriptions = await prisma.branchSubscription.findMany({
    where,
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          tier: true,
          description: true,
          monthlyPrice: true,
          annualPrice: true,
          currency: true,
          maxUsers: true,
          maxAppointmentsPerDay: true,
          maxServices: true,
          maxProducts: true,
          features: true,
          trialDays: true,
          gracePeriodDays: true,
          isActive: true,
          isPublic: true,
        },
      },
    },
  });

  // Get branches for context
  const branchIds = subscriptions.map((s) => s.branchId);
  const branches = await prisma.branch.findMany({
    where: { id: { in: branchIds } },
    select: { id: true, name: true },
  });

  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // Calculate summary
  const summary = {
    totalBranches: subscriptions.length,
    activeSubscriptions: subscriptions.filter((s) => s.status === 'active').length,
    trialSubscriptions: subscriptions.filter((s) => s.status === 'trial').length,
    pastDueSubscriptions: subscriptions.filter((s) => s.status === 'past_due').length,
    suspendedSubscriptions: subscriptions.filter((s) => s.status === 'suspended').length,
    monthlyRecurring: subscriptions
      .filter((s) => ['active', 'trial'].includes(s.status))
      .reduce((sum, s) => {
        const monthly = s.billingCycle === 'monthly' ? s.pricePerPeriod : s.pricePerPeriod.div(12);
        return sum.add(monthly);
      }, new Prisma.Decimal(0)),
  };

  // Enrich subscriptions with branch names
  const enrichedSubscriptions = subscriptions.map((s) => ({
    ...s,
    branchName: branchMap.get(s.branchId) || 'Unknown',
  }));

  return serializeDecimals({
    subscriptions: enrichedSubscriptions,
    summary,
  });
}

// ============================================
// Tenant Billing Settings
// ============================================

/**
 * Update tenant billing settings
 */
async function updateBillingSettings(
  tenantId: string,
  data: UpdateBillingSettingsInput,
  _userId: string
) {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      billingEmail: data.billingEmail,
      billingAddress: data.billingAddress,
      gstin: data.gstin,
      volumeDiscountEnabled: data.volumeDiscountEnabled,
      volumeDiscountPercentage: data.volumeDiscountPercentage,
      volumeDiscountMinBranches: data.volumeDiscountMinBranches,
    },
    select: {
      id: true,
      billingEmail: true,
      billingAddress: true,
      gstin: true,
      volumeDiscountEnabled: true,
      volumeDiscountPercentage: true,
      volumeDiscountMinBranches: true,
    },
  });

  return serializeDecimals(tenant);
}

/**
 * Get tenant billing settings
 */
async function getBillingSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      billingEmail: true,
      billingAddress: true,
      gstin: true,
      volumeDiscountEnabled: true,
      volumeDiscountPercentage: true,
      volumeDiscountMinBranches: true,
    },
  });

  if (!tenant) {
    throw new NotFoundError('TENANT_NOT_FOUND', 'Tenant not found');
  }

  return serializeDecimals(tenant);
}

// ============================================
// Subscription History
// ============================================

/**
 * Get subscription history
 */
async function getSubscriptionHistory(tenantId: string, branchId: string) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  const history = await prisma.subscriptionHistory.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return serializeDecimals(history);
}

// ============================================
// Limit Counts
// ============================================

/**
 * Get current counts for limited resources
 * Note: User count excludes super_owner as they don't count against the limit
 */
async function getLimitCounts(tenantId: string) {
  const [users, services, products] = await Promise.all([
    // Exclude super_owner from user count - they don't count against the limit
    prisma.user.count({
      where: {
        tenantId,
        deletedAt: null,
        role: { not: 'super_owner' },
      },
    }),
    prisma.service.count({
      where: { tenantId, deletedAt: null },
    }),
    prisma.product.count({
      where: { tenantId, deletedAt: null },
    }),
  ]);

  return { users, services, products };
}

// ============================================
// Admin Operations (Internal Admin Only)
// ============================================

/**
 * Update subscription status (admin only)
 * Allows manual status changes for support operations
 */
async function updateSubscriptionStatus(
  tenantId: string,
  branchId: string,
  data: { status: string; reason?: string },
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  const now = new Date();
  const today = startOfDay(now);
  const newStatus = data.status as
    | 'trial'
    | 'active'
    | 'past_due'
    | 'suspended'
    | 'cancelled'
    | 'expired';

  // Build update data based on new status
  const updateData: Prisma.BranchSubscriptionUpdateInput = {
    status: newStatus,
  };

  // Handle status-specific updates
  switch (newStatus) {
    case 'active':
      // Clear any suspension/cancellation data
      updateData.suspendedAt = null;
      updateData.gracePeriodEndDate = null;
      updateData.cancelledAt = null;
      updateData.cancelledBy = null;
      updateData.cancellationReason = null;
      updateData.cancelAtPeriodEnd = false;
      break;

    case 'suspended':
      updateData.suspendedAt = now;
      break;

    case 'cancelled':
      updateData.cancelledAt = now;
      updateData.cancelledBy = userId;
      updateData.cancellationReason = data.reason || 'Cancelled by admin';
      updateData.autoRenew = false;
      break;

    case 'past_due':
      // Set grace period if not already set
      if (!subscription.gracePeriodEndDate) {
        updateData.gracePeriodEndDate = addDays(today, subscription.gracePeriodDaysGranted);
      }
      break;

    case 'expired':
      // Set grace period if not already set
      if (!subscription.gracePeriodEndDate) {
        updateData.gracePeriodEndDate = addDays(today, subscription.gracePeriodDaysGranted);
      }
      break;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: { plan: true },
    });

    // Update branch status
    await tx.branch.update({
      where: { id: branchId },
      data: {
        subscriptionStatus: newStatus,
        isAccessible: newStatus !== 'suspended',
        accessRestrictedAt: newStatus === 'suspended' ? now : null,
        accessRestrictedReason: newStatus === 'suspended' ? 'Subscription suspended' : null,
      },
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: 'status_changed',
        fromStatus: subscription.status,
        toStatus: newStatus,
        metadata: {
          reason: data.reason || 'Admin status change',
          adminAction: true,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  // Send email notifications based on status change
  try {
    if (newStatus === 'active' && subscription.status !== 'active') {
      await sendSubscriptionActivatedEmail(subscription.id);
    } else if (newStatus === 'suspended') {
      await sendSubscriptionSuspendedEmail(subscription.id, data.reason);
    }
  } catch (emailError) {
    logger.error(
      { error: emailError, subscriptionId: subscription.id },
      'Failed to send status change email'
    );
  }

  return serializeDecimals(updated);
}

/**
 * Extend trial period (admin only)
 */
async function extendTrial(
  tenantId: string,
  branchId: string,
  data: { additionalDays: number; reason: string },
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  // Can only extend trial for trial or expired subscriptions
  if (!['trial', 'expired'].includes(subscription.status)) {
    throw new BadRequestError(
      'INVALID_STATUS',
      'Can only extend trial for subscriptions in trial or expired status'
    );
  }

  const today = startOfDay(new Date());

  // Calculate new trial end date
  const currentTrialEnd = subscription.trialEndDate ? new Date(subscription.trialEndDate) : today;
  const newTrialEndDate = addDays(
    currentTrialEnd > today ? currentTrialEnd : today,
    data.additionalDays
  );

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'trial',
        trialEndDate: newTrialEndDate,
        currentPeriodEnd: newTrialEndDate,
        trialDaysGranted: subscription.trialDaysGranted + data.additionalDays,
        gracePeriodEndDate: null, // Clear grace period
      },
      include: { plan: true },
    });

    // Update branch status
    await tx.branch.update({
      where: { id: branchId },
      data: {
        subscriptionStatus: 'trial',
        isAccessible: true,
        accessRestrictedAt: null,
        accessRestrictedReason: null,
      },
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: 'trial_extended',
        fromStatus: subscription.status,
        toStatus: 'trial',
        metadata: {
          additionalDays: data.additionalDays,
          reason: data.reason,
          previousTrialEnd: subscription.trialEndDate,
          newTrialEnd: newTrialEndDate.toISOString(),
          adminAction: true,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  // Send trial extended email
  try {
    await sendTrialExtendedEmail(subscription.id, data.additionalDays);
  } catch (emailError) {
    logger.error(
      { error: emailError, subscriptionId: subscription.id },
      'Failed to send trial extended email'
    );
  }

  return serializeDecimals(updated);
}

/**
 * Apply discount to subscription (admin only)
 */
async function applyDiscount(
  tenantId: string,
  branchId: string,
  data: { discountPercentage: number; discountReason?: string },
  userId: string
) {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this branch');
  }

  if (subscription.tenantId !== tenantId) {
    throw new ForbiddenError('FORBIDDEN', 'You do not have access to this subscription');
  }

  // Recalculate price with new discount
  const plan = subscription.plan;
  const basePrice = subscription.billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const discountAmount = basePrice.mul(data.discountPercentage).div(100);
  const newPricePerPeriod = new Prisma.Decimal(
    Math.round(basePrice.sub(discountAmount).toNumber())
  );

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSubscription = await tx.branchSubscription.update({
      where: { id: subscription.id },
      data: {
        discountPercentage: data.discountPercentage,
        discountReason: data.discountReason || null,
        pricePerPeriod: newPricePerPeriod,
      },
      include: { plan: true },
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: 'discount_applied',
        metadata: {
          previousDiscount: subscription.discountPercentage,
          newDiscount: data.discountPercentage,
          reason: data.discountReason,
          previousPrice: subscription.pricePerPeriod.toNumber(),
          newPrice: newPricePerPeriod.toNumber(),
          adminAction: true,
        },
        performedBy: userId,
      },
    });

    return updatedSubscription;
  });

  return serializeDecimals(updated);
}

// ============================================
// Export Service
// ============================================

export const subscriptionsService = {
  // Plans
  listPlans,
  getPlanById,
  getPlanByCode,
  createPlan,
  updatePlan,
  // Subscriptions
  getSubscription,
  createSubscription,
  updateSubscription,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  // Admin operations
  updateSubscriptionStatus,
  extendTrial,
  applyDiscount,
  // Invoices
  listInvoices,
  getInvoice,
  recordManualPayment,
  // Billing
  getBillingOverview,
  getBillingSettings,
  updateBillingSettings,
  // History
  getSubscriptionHistory,
  // Limits
  getLimitCounts,
};
