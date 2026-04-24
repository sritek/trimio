/**
 * Subscription Email Templates
 * Templates for subscription lifecycle notifications
 */

import { format, differenceInDays } from 'date-fns';

import { baseTemplate, htmlToText } from './base';

export interface SubscriptionEmailData {
  tenantName: string;
  branchName: string;
  planName: string;
  ownerName: string;
  ownerEmail: string;
  trialEndDate?: Date;
  currentPeriodEnd?: Date;
  pricePerPeriod?: number;
  billingCycle?: 'monthly' | 'annual';
  reason?: string;
  loginUrl?: string;
  supportEmail?: string;
}

const TRIMIO_APP_LOGIN_URL = process.env.TRIMIO_APP_LOGIN_URL;
const TRIMIO_SUPPORT_EMAIL = process.env.TRIMIO_SUPPORT_EMAIL;

/**
 * Welcome email - sent when tenant is created
 */
export function welcomeEmail(data: SubscriptionEmailData) {
  const { tenantName, ownerName, planName, trialEndDate, loginUrl = TRIMIO_APP_LOGIN_URL } = data;

  const trialDaysLeft = trialEndDate ? differenceInDays(trialEndDate, new Date()) : 0;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Welcome to Trimio, ${ownerName}! 🎉
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your salon <strong>${tenantName}</strong> is now set up and ready to go. We're excited to have you on board!
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>Your ${trialDaysLeft}-day free trial has started!</strong><br>
        Trial ends: ${trialEndDate ? format(trialEndDate, 'MMMM d, yyyy') : 'N/A'}<br>
        Plan: ${planName}
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Here's what you can do next:
    </p>
    
    <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 24px;">
      <li>Set up your services and pricing</li>
      <li>Add your staff members</li>
      <li>Import your customer list</li>
      <li>Configure your branch settings</li>
    </ul>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Get Started
      </a>
    </p>
    
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
      Need help getting started? Check out our <a href="https://help.trimio.com" style="color: #6366f1;">help center</a> or reply to this email.
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Welcome to Trimio! Your ${trialDaysLeft}-day trial has started.`,
  });

  return {
    subject: `Welcome to Trimio, ${ownerName}! 🎉`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Trial ending soon - sent 7, 3, and 1 day before trial ends
 */
export function trialEndingSoonEmail(data: SubscriptionEmailData, daysLeft: number) {
  const {
    tenantName,
    branchName,
    ownerName,
    planName,
    trialEndDate,
    pricePerPeriod,
    billingCycle,
    loginUrl = TRIMIO_APP_LOGIN_URL,
  } = data;

  const urgencyText = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  const urgencyColor = daysLeft === 1 ? '#dc2626' : daysLeft <= 3 ? '#d97706' : '#2563eb';

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your trial ends ${urgencyText}
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your free trial for <strong>${tenantName}</strong> (${branchName}) will end on <strong style="color: ${urgencyColor};">${trialEndDate ? format(trialEndDate, 'MMMM d, yyyy') : 'soon'}</strong>.
    </p>
    
    <div style="background-color: ${daysLeft === 1 ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${daysLeft === 1 ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: ${daysLeft === 1 ? '#991b1b' : '#92400e'}; margin: 0; font-size: 14px;">
        <strong>⏰ ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining</strong><br>
        To continue using Trimio without interruption, please contact us to activate your subscription.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      <strong>Your plan details:</strong>
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Plan</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${planName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Billing</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${billingCycle === 'annual' ? 'Annual' : 'Monthly'}</td>
      </tr>
      ${
        pricePerPeriod
          ? `
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Price</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">₹${pricePerPeriod.toLocaleString('en-IN')}/${billingCycle === 'annual' ? 'year' : 'month'}</td>
      </tr>
      `
          : ''
      }
    </table>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Subscription
      </a>
    </p>
    
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
      Questions? Contact our team at <a href="mailto:${TRIMIO_SUPPORT_EMAIL}" style="color: #6366f1;">${TRIMIO_SUPPORT_EMAIL}</a>
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Your Trimio trial ends ${urgencyText}. Activate your subscription to continue.`,
  });

  return {
    subject: `⏰ Your Trimio trial ends ${urgencyText}`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Trial expired - sent when trial period ends
 */
export function trialExpiredEmail(data: SubscriptionEmailData) {
  const { tenantName, branchName, ownerName, planName, loginUrl = TRIMIO_APP_LOGIN_URL } = data;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your trial has ended
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your free trial for <strong>${tenantName}</strong> (${branchName}) has ended.
    </p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #991b1b; margin: 0; font-size: 14px;">
        <strong>Your account access is now limited.</strong><br>
        Your data is safe, but you won't be able to create new appointments or invoices until you activate your subscription.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      To continue using Trimio and unlock all features, please contact us to activate your <strong>${planName}</strong> subscription.
    </p>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Activate Subscription
      </a>
    </p>
    
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
      Need more time to evaluate? Contact us at <a href="mailto:${TRIMIO_SUPPORT_EMAIL}" style="color: #6366f1;">${TRIMIO_SUPPORT_EMAIL}</a> and we'll be happy to help.
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Your Trimio trial has ended. Activate your subscription to continue.`,
  });

  return {
    subject: `Your Trimio trial has ended`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Subscription activated - sent when subscription becomes active
 */
export function subscriptionActivatedEmail(data: SubscriptionEmailData) {
  const {
    tenantName,
    branchName,
    ownerName,
    planName,
    currentPeriodEnd,
    pricePerPeriod,
    billingCycle,
    loginUrl = TRIMIO_APP_LOGIN_URL,
  } = data;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your subscription is now active! 🎉
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Great news! Your subscription for <strong>${tenantName}</strong> (${branchName}) is now active.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>✓ Subscription Active</strong><br>
        You now have full access to all ${planName} features.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      <strong>Subscription details:</strong>
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Plan</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${planName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Billing cycle</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${billingCycle === 'annual' ? 'Annual' : 'Monthly'}</td>
      </tr>
      ${
        pricePerPeriod
          ? `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Amount</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">₹${pricePerPeriod.toLocaleString('en-IN')}/${billingCycle === 'annual' ? 'year' : 'month'}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Next billing date</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${currentPeriodEnd ? format(currentPeriodEnd, 'MMMM d, yyyy') : 'N/A'}</td>
      </tr>
    </table>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Go to Dashboard
      </a>
    </p>
    
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
      Thank you for choosing Trimio! If you have any questions, we're here to help.
    </p>
  `;

  const html = baseTemplate(content, { previewText: `Your Trimio subscription is now active!` });

  return {
    subject: `Your Trimio subscription is now active! 🎉`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Trial extended - sent when admin extends trial
 */
export function trialExtendedEmail(data: SubscriptionEmailData & { additionalDays: number }) {
  const {
    tenantName,
    branchName,
    ownerName,
    trialEndDate,
    additionalDays,
    loginUrl = TRIMIO_APP_LOGIN_URL,
  } = data;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your trial has been extended! 🎁
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Good news! We've extended your trial for <strong>${tenantName}</strong> (${branchName}) by <strong>${additionalDays} days</strong>.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>New trial end date: ${trialEndDate ? format(trialEndDate, 'MMMM d, yyyy') : 'N/A'}</strong><br>
        Continue exploring all features during your extended trial.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Take this time to:
    </p>
    
    <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 24px;">
      <li>Complete your salon setup</li>
      <li>Train your staff on the system</li>
      <li>Process a few test appointments</li>
      <li>Explore reports and analytics</li>
    </ul>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Continue Setup
      </a>
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Your Trimio trial has been extended by ${additionalDays} days!`,
  });

  return {
    subject: `Your Trimio trial has been extended! 🎁`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Subscription suspended - sent when subscription is suspended
 */
export function subscriptionSuspendedEmail(data: SubscriptionEmailData) {
  const { tenantName, branchName, ownerName, reason } = data;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your subscription has been suspended
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your subscription for <strong>${tenantName}</strong> (${branchName}) has been suspended.
    </p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #991b1b; margin: 0; font-size: 14px;">
        <strong>Account access is restricted.</strong><br>
        ${reason || 'Please contact support to resolve this issue and restore access.'}
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your data is safe and will remain available once your subscription is reactivated.
    </p>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="mailto:${TRIMIO_SUPPORT_EMAIL}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Contact Support
      </a>
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Your Trimio subscription has been suspended.`,
  });

  return {
    subject: `Your Trimio subscription has been suspended`,
    html,
    text: htmlToText(html),
  };
}

/**
 * Subscription reactivated - sent when subscription is reactivated
 */
export function subscriptionReactivatedEmail(data: SubscriptionEmailData) {
  const {
    tenantName,
    branchName,
    ownerName,
    planName,
    currentPeriodEnd,
    loginUrl = TRIMIO_APP_LOGIN_URL,
  } = data;

  const content = `
    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Your subscription has been reactivated! 🎉
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Great news! Your subscription for <strong>${tenantName}</strong> (${branchName}) has been reactivated.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>✓ Full access restored</strong><br>
        You can now use all ${planName} features again.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Your next billing date is <strong>${currentPeriodEnd ? format(currentPeriodEnd, 'MMMM d, yyyy') : 'N/A'}</strong>.
    </p>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Go to Dashboard
      </a>
    </p>
    
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
      Welcome back! We're glad to have you with us.
    </p>
  `;

  const html = baseTemplate(content, {
    previewText: `Your Trimio subscription has been reactivated!`,
  });

  return {
    subject: `Your Trimio subscription has been reactivated! 🎉`,
    html,
    text: htmlToText(html),
  };
}
