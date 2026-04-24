/**
 * Email Notifications Service
 * High-level service for sending subscription-related notifications
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { sendEmail, isEmailEnabled } from './email';
import {
  welcomeEmail,
  trialEndingSoonEmail,
  trialExpiredEmail,
  subscriptionActivatedEmail,
  trialExtendedEmail,
  subscriptionSuspendedEmail,
  subscriptionReactivatedEmail,
  type SubscriptionEmailData,
} from './email-templates';

/**
 * Get subscription email data from database
 */
async function getSubscriptionEmailData(
  subscriptionId: string
): Promise<SubscriptionEmailData | null> {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    logger.warn({ subscriptionId }, 'Subscription not found for email notification');
    return null;
  }

  // Get branch and tenant info separately
  const branch = await prisma.branch.findUnique({
    where: { id: subscription.branchId },
    include: { tenant: true },
  });

  if (!branch) {
    logger.warn({ branchId: subscription.branchId }, 'Branch not found for email notification');
    return null;
  }

  // Get the super_owner for this tenant
  const superOwner = await prisma.user.findFirst({
    where: {
      tenantId: subscription.tenantId,
      role: 'super_owner',
      deletedAt: null,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!superOwner || !superOwner.email) {
    logger.warn({ tenantId: subscription.tenantId }, 'No super_owner with email found for tenant');
    return null;
  }

  // Use billingEmail if set, otherwise fall back to super_owner email
  const recipientEmail = branch.tenant.billingEmail || superOwner.email;

  return {
    tenantName: branch.tenant.name,
    branchName: branch.name,
    planName: subscription.plan.name,
    ownerName: superOwner.name,
    ownerEmail: recipientEmail,
    trialEndDate: subscription.trialEndDate || undefined,
    currentPeriodEnd: subscription.currentPeriodEnd,
    pricePerPeriod: subscription.pricePerPeriod.toNumber(),
    billingCycle: subscription.billingCycle,
  };
}

/**
 * Get email data by branch ID
 */
async function getEmailDataByBranchId(branchId: string): Promise<SubscriptionEmailData | null> {
  const subscription = await prisma.branchSubscription.findUnique({
    where: { branchId },
  });

  if (!subscription) {
    logger.warn({ branchId }, 'No subscription found for branch');
    return null;
  }

  return getSubscriptionEmailData(subscription.id);
}

// ============================================
// Notification Functions
// ============================================

/**
 * Send welcome email when tenant is created
 */
export async function sendWelcomeEmail(tenantId: string, branchId: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ tenantId, branchId }, 'Email disabled - skipping welcome email');
    return false;
  }

  const data = await getEmailDataByBranchId(branchId);
  if (!data) return false;

  const email = welcomeEmail(data);
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send trial ending soon email (7, 3, or 1 day before)
 */
export async function sendTrialEndingSoonEmail(
  subscriptionId: string,
  daysLeft: number
): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ subscriptionId, daysLeft }, 'Email disabled - skipping trial ending email');
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = trialEndingSoonEmail(data, daysLeft);
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send trial expired email
 */
export async function sendTrialExpiredEmail(subscriptionId: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ subscriptionId }, 'Email disabled - skipping trial expired email');
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = trialExpiredEmail(data);
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send subscription activated email
 */
export async function sendSubscriptionActivatedEmail(subscriptionId: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ subscriptionId }, 'Email disabled - skipping activation email');
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = subscriptionActivatedEmail(data);
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send trial extended email
 */
export async function sendTrialExtendedEmail(
  subscriptionId: string,
  additionalDays: number
): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info(
      { subscriptionId, additionalDays },
      'Email disabled - skipping trial extended email'
    );
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = trialExtendedEmail({ ...data, additionalDays });
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send subscription suspended email
 */
export async function sendSubscriptionSuspendedEmail(
  subscriptionId: string,
  reason?: string
): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ subscriptionId }, 'Email disabled - skipping suspended email');
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = subscriptionSuspendedEmail({ ...data, reason });
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send subscription reactivated email
 */
export async function sendSubscriptionReactivatedEmail(subscriptionId: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    logger.info({ subscriptionId }, 'Email disabled - skipping reactivated email');
    return false;
  }

  const data = await getSubscriptionEmailData(subscriptionId);
  if (!data) return false;

  const email = subscriptionReactivatedEmail(data);
  return sendEmail({
    to: data.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// Export all notification functions
// ============================================

export const emailNotifications = {
  sendWelcomeEmail,
  sendTrialEndingSoonEmail,
  sendTrialExpiredEmail,
  sendSubscriptionActivatedEmail,
  sendTrialExtendedEmail,
  sendSubscriptionSuspendedEmail,
  sendSubscriptionReactivatedEmail,
};
