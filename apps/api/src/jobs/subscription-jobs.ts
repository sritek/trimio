/**
 * Subscription Jobs
 * Background jobs for subscription lifecycle management:
 * - Trial expiration
 * - Subscription renewal/expiration
 * - Grace period handling
 * - Email notifications
 */

import { addDays, startOfDay, isBefore } from 'date-fns';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  sendTrialEndingSoonEmail,
  sendTrialExpiredEmail,
  sendSubscriptionSuspendedEmail,
} from '@/lib/email-notifications';

// Grace period after trial expires (days)
const TRIAL_GRACE_PERIOD_DAYS = 3;

// Days before trial end to send reminder emails
const TRIAL_REMINDER_DAYS = [7, 3, 1];

/**
 * Send trial ending soon emails
 * Sends reminders at 7, 3, and 1 day before trial ends
 */
export async function sendTrialEndingReminders() {
  const now = startOfDay(new Date());

  for (const daysLeft of TRIAL_REMINDER_DAYS) {
    const targetDate = addDays(now, daysLeft);

    // Find trials ending on the target date
    const trialsEndingSoon = await prisma.branchSubscription.findMany({
      where: {
        status: 'trial',
        trialEndDate: {
          gte: startOfDay(targetDate),
          lt: addDays(startOfDay(targetDate), 1),
        },
      },
    });

    logger.info({ count: trialsEndingSoon.length, daysLeft }, 'Found trials ending soon');

    for (const subscription of trialsEndingSoon) {
      try {
        await sendTrialEndingSoonEmail(subscription.id, daysLeft);
        logger.info({ subscriptionId: subscription.id, daysLeft }, 'Sent trial ending soon email');
      } catch (error) {
        logger.error(
          { error, subscriptionId: subscription.id },
          'Failed to send trial ending soon email'
        );
      }
    }
  }
}

/**
 * Process expired trials
 * Transitions trial → expired when trial end date has passed + grace period
 */
export async function processExpiredTrials() {
  const now = startOfDay(new Date());

  // Find trials that have ended (past trial end date)
  const expiredTrials = await prisma.branchSubscription.findMany({
    where: {
      status: 'trial',
      trialEndDate: {
        lt: now, // Trial end date is in the past
      },
    },
    include: {
      plan: { select: { name: true } },
    },
  });

  logger.info({ count: expiredTrials.length }, 'Found expired trials to process');

  let transitioned = 0;

  for (const subscription of expiredTrials) {
    const trialEndDate = subscription.trialEndDate!;
    const graceEndDate = addDays(trialEndDate, TRIAL_GRACE_PERIOD_DAYS);

    // Check if grace period has also passed
    const isGracePeriodOver = isBefore(graceEndDate, now);

    try {
      await prisma.$transaction(async (tx) => {
        // Update subscription status
        await tx.branchSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'expired',
            gracePeriodEndDate: isGracePeriodOver ? null : graceEndDate,
          },
        });

        // Update branch status
        await tx.branch.update({
          where: { id: subscription.branchId },
          data: {
            subscriptionStatus: 'expired',
            // Don't restrict access yet - they can still view data
            isAccessible: true,
          },
        });

        // Create history entry
        await tx.subscriptionHistory.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'expired',
            fromStatus: 'trial',
            toStatus: 'expired',
            metadata: {
              trialEndDate: trialEndDate.toISOString(),
              graceEndDate: graceEndDate.toISOString(),
              reason: 'Trial period ended',
            },
            performedBy: null, // System action
          },
        });
      });

      transitioned++;
      logger.info(
        {
          subscriptionId: subscription.id,
          branchId: subscription.branchId,
          planName: subscription.plan.name,
          trialEndDate,
        },
        'Trial subscription expired'
      );

      // Send trial expired email
      try {
        await sendTrialExpiredEmail(subscription.id);
      } catch (emailError) {
        logger.error(
          { error: emailError, subscriptionId: subscription.id },
          'Failed to send trial expired email'
        );
      }
    } catch (error) {
      logger.error({ error, subscriptionId: subscription.id }, 'Failed to process expired trial');
    }
  }

  return { processed: expiredTrials.length, transitioned };
}

/**
 * Process past-due subscriptions
 * Transitions active → past_due when payment is overdue
 * Transitions past_due → suspended when grace period ends
 */
export async function processPastDueSubscriptions() {
  const now = startOfDay(new Date());

  // Find active subscriptions past their period end (should have renewed but didn't)
  const overdueSubscriptions = await prisma.branchSubscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: {
        lt: now,
      },
      autoRenew: true, // Only auto-renew subscriptions
    },
    include: {
      plan: { select: { name: true } },
    },
  });

  logger.info({ count: overdueSubscriptions.length }, 'Found overdue subscriptions');

  let transitionedToPastDue = 0;

  for (const subscription of overdueSubscriptions) {
    const gracePeriodEnd = addDays(
      subscription.currentPeriodEnd,
      subscription.gracePeriodDaysGranted
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.branchSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'past_due',
            gracePeriodEndDate: gracePeriodEnd,
          },
        });

        await tx.branch.update({
          where: { id: subscription.branchId },
          data: {
            subscriptionStatus: 'past_due',
          },
        });

        await tx.subscriptionHistory.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'past_due',
            fromStatus: 'active',
            toStatus: 'past_due',
            metadata: {
              periodEnd: subscription.currentPeriodEnd.toISOString(),
              gracePeriodEnd: gracePeriodEnd.toISOString(),
              reason: 'Payment overdue',
            },
            performedBy: null,
          },
        });
      });

      transitionedToPastDue++;
      logger.info(
        {
          subscriptionId: subscription.id,
          branchId: subscription.branchId,
        },
        'Subscription marked as past_due'
      );
    } catch (error) {
      logger.error(
        { error, subscriptionId: subscription.id },
        'Failed to process overdue subscription'
      );
    }
  }

  // Find past_due subscriptions where grace period has ended
  const suspendableSubscriptions = await prisma.branchSubscription.findMany({
    where: {
      status: 'past_due',
      gracePeriodEndDate: {
        lt: now,
      },
    },
    include: {
      plan: { select: { name: true } },
    },
  });

  logger.info({ count: suspendableSubscriptions.length }, 'Found subscriptions to suspend');

  let transitionedToSuspended = 0;

  for (const subscription of suspendableSubscriptions) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.branchSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'suspended',
            suspendedAt: now,
            suspensionCount: { increment: 1 },
            gracePeriodEndDate: null,
          },
        });

        await tx.branch.update({
          where: { id: subscription.branchId },
          data: {
            subscriptionStatus: 'suspended',
            isAccessible: false, // Restrict access
            accessRestrictedAt: now,
            accessRestrictedReason: 'Subscription suspended due to non-payment',
          },
        });

        await tx.subscriptionHistory.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'suspended',
            fromStatus: 'past_due',
            toStatus: 'suspended',
            metadata: {
              reason: 'Grace period ended without payment',
              suspensionCount: subscription.suspensionCount + 1,
            },
            performedBy: null,
          },
        });
      });

      transitionedToSuspended++;
      logger.info(
        {
          subscriptionId: subscription.id,
          branchId: subscription.branchId,
        },
        'Subscription suspended'
      );

      // Send suspension email
      try {
        await sendSubscriptionSuspendedEmail(subscription.id, 'Grace period ended without payment');
      } catch (emailError) {
        logger.error(
          { error: emailError, subscriptionId: subscription.id },
          'Failed to send suspension email'
        );
      }
    } catch (error) {
      logger.error({ error, subscriptionId: subscription.id }, 'Failed to suspend subscription');
    }
  }

  return {
    overdueProcessed: overdueSubscriptions.length,
    transitionedToPastDue,
    suspendableProcessed: suspendableSubscriptions.length,
    transitionedToSuspended,
  };
}

/**
 * Process cancelled subscriptions at period end
 * Transitions cancelled (cancelAtPeriodEnd=true) → expired when period ends
 */
export async function processCancelledSubscriptions() {
  const now = startOfDay(new Date());

  const cancelledSubscriptions = await prisma.branchSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: {
        lt: now,
      },
      status: {
        notIn: ['expired', 'cancelled'],
      },
    },
  });

  logger.info({ count: cancelledSubscriptions.length }, 'Found cancelled subscriptions to expire');

  let transitioned = 0;

  for (const subscription of cancelledSubscriptions) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.branchSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'cancelled',
            cancelAtPeriodEnd: false,
          },
        });

        await tx.branch.update({
          where: { id: subscription.branchId },
          data: {
            subscriptionStatus: 'cancelled',
          },
        });

        await tx.subscriptionHistory.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'cancelled',
            fromStatus: subscription.status,
            toStatus: 'cancelled',
            metadata: {
              reason: 'Subscription period ended after cancellation request',
            },
            performedBy: null,
          },
        });
      });

      transitioned++;
      logger.info(
        { subscriptionId: subscription.id, branchId: subscription.branchId },
        'Cancelled subscription expired'
      );
    } catch (error) {
      logger.error(
        { error, subscriptionId: subscription.id },
        'Failed to expire cancelled subscription'
      );
    }
  }

  return { processed: cancelledSubscriptions.length, transitioned };
}

/**
 * Main job handler - runs all subscription lifecycle checks
 */
export async function processSubscriptionLifecycle() {
  logger.info('Starting subscription lifecycle processing');

  // Send trial ending reminders first
  await sendTrialEndingReminders();

  const results = {
    trials: await processExpiredTrials(),
    pastDue: await processPastDueSubscriptions(),
    cancelled: await processCancelledSubscriptions(),
  };

  logger.info({ results }, 'Subscription lifecycle processing complete');

  return results;
}
