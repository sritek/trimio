/**
 * Notification Service
 *
 * Handles all WhatsApp notification business logic:
 * - Disabled/misconfigured state detection
 * - Template parameter construction (typed per notification type)
 * - Idempotency check (60-second time-window, DB-level, per referenceId+type)
 * - Retry logic (max 3 attempts, updates existing record)
 * - DB logging of every attempt (accepted | failed | skipped)
 *
 * This module never throws — all errors are caught and written as `failed` log records.
 * Callers use fire-and-forget: notifyX(...).catch(err => logger.error(...))
 */

import { format, parse } from 'date-fns';
import { WhatsappNotificationType, WhatsappNotificationStatus, WhatsappReferenceType } from '@prisma/client';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppTemplate, type TemplateComponent } from '@/lib/whatsapp';

// ============================================
// Typed Template Parameter Interfaces
// ============================================

interface AppointmentBookedParams {
  [key: string]: string;
  customerName: string;
  serviceNames: string;
  stylistName: string;
  date: string;
  time: string;
  branchName: string;
}

interface AppointmentRescheduledParams {
  [key: string]: string;
  customerName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  branchName: string;
}

interface AppointmentCancelledParams {
  [key: string]: string;
  customerName: string;
  serviceNames: string;
  date: string;
  time: string;
  branchName: string;
}

interface InvoiceFinalizedParams {
  [key: string]: string;
  customerName: string;
  invoiceNumber: string;
  itemsSummary: string;
  total: string;
}

// ============================================
// Disabled State (warn exactly once)
// ============================================

let disabledWarnLogged = false;

function isDisabled(): boolean {
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    if (!disabledWarnLogged) {
      logger.warn('[WhatsApp] Notifications disabled: WHATSAPP_ACCESS_TOKEN not set');
      disabledWarnLogged = true;
    }
    return true;
  }
  return false;
}

// ============================================
// Formatting Helpers
// ============================================

function formatDate(date: Date): string {
  return format(date, 'd MMM yyyy');
}

function formatTime(time: string): string {
  const parsed = parse(time, 'HH:mm', new Date());
  return format(parsed, 'hh:mm a').toUpperCase();
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function paramsToComponents(params: Record<string, string>): TemplateComponent[] {
  return [
    {
      type: 'body',
      parameters: Object.values(params).map((text) => ({ type: 'text' as const, text })),
    },
  ];
}

// ============================================
// DB Logging Helpers
// ============================================

type LogInput = {
  tenantId: string;
  type: WhatsappNotificationType;
  recipientPhone: string | null;
  templateName: string;
  templateParams: Record<string, string>;
  status: WhatsappNotificationStatus;
  errorMessage?: string;
  referenceId: string;
  referenceType: WhatsappReferenceType;
  sentAt?: Date;
};

async function createLog(input: LogInput) {
  return prisma.whatsappNotificationLog.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      recipientPhone: input.recipientPhone,
      templateName: input.templateName,
      templateParams: input.templateParams,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      attemptCount: 1,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      sentAt: input.sentAt ?? null,
    },
  });
}

async function updateLog(
  id: string,
  status: WhatsappNotificationStatus,
  attemptCount: number,
  errorMessage?: string,
  sentAt?: Date
) {
  return prisma.whatsappNotificationLog.update({
    where: { id },
    data: {
      status,
      attemptCount,
      errorMessage: errorMessage ?? null,
      sentAt: sentAt ?? null,
    },
  });
}

// ============================================
// Idempotency Check
// ============================================

/**
 * Returns an existing log for the same (referenceId, type) within the last 60 seconds.
 * This prevents duplicate sends when the same event fires multiple times rapidly.
 * Each appointment has a unique referenceId, so this only deduplicates calls
 * for the SAME appointment within the time window.
 */
async function checkIdempotency(referenceId: string, type: WhatsappNotificationType) {
  const windowStart = new Date(Date.now() - 60_000);
  return prisma.whatsappNotificationLog.findFirst({
    where: {
      referenceId,
      type,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================
// Core Send Helper
// ============================================

async function sendNotification(opts: {
  tenantId: string;
  type: WhatsappNotificationType;
  referenceId: string;
  referenceType: WhatsappReferenceType;
  recipientPhone: string;
  templateEnvVar: string | undefined;
  params: Record<string, string>;
}): Promise<void> {
  const { tenantId, type, referenceId, referenceType, recipientPhone, templateEnvVar, params } = opts;

  logger.info(
    {
      whatsapp_debug: true,
      step: 'sendNotification_start',
      type,
      referenceId,
      recipientPhone,
      templateEnvVar,
    },
    `[WhatsApp] sendNotification called for ${type} / ref=${referenceId}`
  );

  // Validate template name is configured
  if (!templateEnvVar) {
    const varName = `WHATSAPP_TEMPLATE_${type.toUpperCase()}`;
    logger.warn(
      { whatsapp_debug: true, varName, referenceId },
      `[WhatsApp] Template env var not set: ${varName}`
    );
    await createLog({
      tenantId,
      type,
      recipientPhone,
      templateName: '',
      templateParams: params,
      status: WhatsappNotificationStatus.failed,
      errorMessage: `${varName} not configured`,
      referenceId,
      referenceType,
    });
    return;
  }

  // Idempotency check — only deduplicates the SAME referenceId within 60s
  const recent = await checkIdempotency(referenceId, type);

  logger.info(
    {
      whatsapp_debug: true,
      step: 'idempotency_check',
      referenceId,
      type,
      recentFound: !!recent,
      recentStatus: recent?.status,
      recentAttemptCount: recent?.attemptCount,
      recentId: recent?.id,
    },
    `[WhatsApp] Idempotency check result for ref=${referenceId}`
  );

  if (recent) {
    if (recent.status === WhatsappNotificationStatus.accepted) {
      logger.info(
        { whatsapp_debug: true, referenceId, type, logId: recent.id },
        '[WhatsApp] Skipping — already accepted within 60s window'
      );
      return;
    }

    if (recent.status === WhatsappNotificationStatus.skipped) {
      logger.info(
        { whatsapp_debug: true, referenceId, type, logId: recent.id },
        '[WhatsApp] Skipping — previously skipped (no phone) within 60s window'
      );
      return;
    }

    if (recent.status === WhatsappNotificationStatus.failed) {
      if (recent.attemptCount >= 3) {
        logger.warn(
          { whatsapp_debug: true, referenceId, type, logId: recent.id, attemptCount: recent.attemptCount },
          '[WhatsApp] Skipping — max retries (3) reached for this reference'
        );
        return;
      }

      // Retry the failed attempt
      logger.info(
        {
          whatsapp_debug: true,
          step: 'retry_attempt',
          referenceId,
          type,
          logId: recent.id,
          attemptCount: recent.attemptCount + 1,
        },
        `[WhatsApp] Retrying failed attempt #${recent.attemptCount + 1} for ref=${referenceId}`
      );

      const retryComponents = templateEnvVar === 'hello_world' ? undefined : paramsToComponents(params);
      try {
        await sendWhatsAppTemplate({
          to: recipientPhone,
          templateName: templateEnvVar,
          languageCode: 'en_US',
          components: retryComponents,
        });
        await updateLog(recent.id, WhatsappNotificationStatus.accepted, recent.attemptCount + 1, undefined, new Date());
        logger.info(
          { whatsapp_debug: true, referenceId, type, logId: recent.id },
          '[WhatsApp] Retry succeeded — status updated to accepted'
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await updateLog(recent.id, WhatsappNotificationStatus.failed, recent.attemptCount + 1, errorMessage);
        logger.error(
          { whatsapp_debug: true, referenceId, type, logId: recent.id, errorMessage },
          '[WhatsApp] Retry failed — status remains failed'
        );
      }
      return;
    }
  }

  // No recent record — first attempt for this referenceId
  logger.info(
    {
      whatsapp_debug: true,
      step: 'first_attempt',
      referenceId,
      type,
      templateEnvVar,
      recipientPhone,
    },
    `[WhatsApp] First attempt for ref=${referenceId}, template=${templateEnvVar}`
  );

  const components = templateEnvVar === 'hello_world' ? undefined : paramsToComponents(params);

  try {
    await sendWhatsAppTemplate({
      to: recipientPhone,
      templateName: templateEnvVar,
      languageCode: 'en_US',
      components,
    });
    await createLog({
      tenantId,
      type,
      recipientPhone,
      templateName: templateEnvVar,
      templateParams: params,
      status: WhatsappNotificationStatus.accepted,
      referenceId,
      referenceType,
      sentAt: new Date(),
    });
    logger.info(
      { whatsapp_debug: true, referenceId, type },
      '[WhatsApp] First attempt succeeded — logged as accepted'
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await createLog({
      tenantId,
      type,
      recipientPhone,
      templateName: templateEnvVar,
      templateParams: params,
      status: WhatsappNotificationStatus.failed,
      errorMessage,
      referenceId,
      referenceType,
    });
    logger.error(
      { whatsapp_debug: true, referenceId, type, errorMessage },
      '[WhatsApp] First attempt failed — logged as failed'
    );
  }
}

// ============================================
// Public API
// ============================================

export async function notifyAppointmentBooked(tenantId: string, appointmentId: string): Promise<void> {
  if (isDisabled()) return;

  logger.info(
    { whatsapp_debug: true, appointmentId, tenantId },
    '[WhatsApp] notifyAppointmentBooked triggered'
  );

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      services: { select: { serviceName: true } },
      stylist: { select: { name: true } },
      branch: { select: { name: true } },
      customer: { select: { phone: true } },
    },
  });

  if (!appointment) {
    logger.warn({ whatsapp_debug: true, appointmentId }, '[WhatsApp] Appointment not found — skipping');
    return;
  }

  const phone = appointment.customer?.phone ?? appointment.customerPhone;

  logger.info(
    {
      whatsapp_debug: true,
      appointmentId,
      phone,
      customerName: appointment.customerName,
      branchName: appointment.branch.name,
      serviceCount: appointment.services.length,
    },
    '[WhatsApp] Appointment data loaded for notification'
  );

  if (!phone) {
    await createLog({
      tenantId,
      type: WhatsappNotificationType.appointment_booked,
      recipientPhone: null,
      templateName: env.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED ?? '',
      templateParams: {},
      status: WhatsappNotificationStatus.skipped,
      errorMessage: 'No phone number on file',
      referenceId: appointmentId,
      referenceType: WhatsappReferenceType.appointment,
    });
    logger.warn({ whatsapp_debug: true, appointmentId }, '[WhatsApp] Skipped — no phone number');
    return;
  }

  const params: AppointmentBookedParams = {
    customerName: appointment.customerName ?? 'Customer',
    serviceNames: appointment.services.map((s) => s.serviceName).join(', '),
    stylistName: appointment.stylist?.name ?? 'Our stylist',
    date: formatDate(appointment.scheduledDate),
    time: formatTime(appointment.scheduledTime),
    branchName: appointment.branch.name,
  };

  await sendNotification({
    tenantId,
    type: WhatsappNotificationType.appointment_booked,
    referenceId: appointmentId,
    referenceType: WhatsappReferenceType.appointment,
    recipientPhone: phone,
    templateEnvVar: env.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED,
    params,
  });
}

export async function notifyAppointmentRescheduled(
  tenantId: string,
  newAppointmentId: string,
  oldDate: string,
  oldTime: string
): Promise<void> {
  if (isDisabled()) return;

  logger.info(
    { whatsapp_debug: true, newAppointmentId, oldDate, oldTime },
    '[WhatsApp] notifyAppointmentRescheduled triggered'
  );

  const appointment = await prisma.appointment.findFirst({
    where: { id: newAppointmentId, tenantId },
    include: {
      branch: { select: { name: true } },
      customer: { select: { phone: true } },
    },
  });

  if (!appointment) return;

  const phone = appointment.customer?.phone ?? appointment.customerPhone;

  if (!phone) {
    await createLog({
      tenantId,
      type: WhatsappNotificationType.appointment_rescheduled,
      recipientPhone: null,
      templateName: env.WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED ?? '',
      templateParams: {},
      status: WhatsappNotificationStatus.skipped,
      errorMessage: 'No phone number on file',
      referenceId: newAppointmentId,
      referenceType: WhatsappReferenceType.appointment,
    });
    return;
  }

  const [year, month, day] = oldDate.split('-').map(Number);
  const oldDateObj = new Date(Date.UTC(year, month - 1, day));

  const params: AppointmentRescheduledParams = {
    customerName: appointment.customerName ?? 'Customer',
    oldDate: formatDate(oldDateObj),
    oldTime: formatTime(oldTime),
    newDate: formatDate(appointment.scheduledDate),
    newTime: formatTime(appointment.scheduledTime),
    branchName: appointment.branch.name,
  };

  await sendNotification({
    tenantId,
    type: WhatsappNotificationType.appointment_rescheduled,
    referenceId: newAppointmentId,
    referenceType: WhatsappReferenceType.appointment,
    recipientPhone: phone,
    templateEnvVar: env.WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED,
    params,
  });
}

export async function notifyAppointmentCancelled(tenantId: string, appointmentId: string): Promise<void> {
  if (isDisabled()) return;

  logger.info(
    { whatsapp_debug: true, appointmentId },
    '[WhatsApp] notifyAppointmentCancelled triggered'
  );

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      services: { select: { serviceName: true } },
      branch: { select: { name: true } },
      customer: { select: { phone: true } },
    },
  });

  if (!appointment) return;

  const phone = appointment.customer?.phone ?? appointment.customerPhone;

  if (!phone) {
    await createLog({
      tenantId,
      type: WhatsappNotificationType.appointment_cancelled,
      recipientPhone: null,
      templateName: env.WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED ?? '',
      templateParams: {},
      status: WhatsappNotificationStatus.skipped,
      errorMessage: 'No phone number on file',
      referenceId: appointmentId,
      referenceType: WhatsappReferenceType.appointment,
    });
    return;
  }

  const params: AppointmentCancelledParams = {
    customerName: appointment.customerName ?? 'Customer',
    serviceNames: appointment.services.map((s) => s.serviceName).join(', '),
    date: formatDate(appointment.scheduledDate),
    time: formatTime(appointment.scheduledTime),
    branchName: appointment.branch.name,
  };

  await sendNotification({
    tenantId,
    type: WhatsappNotificationType.appointment_cancelled,
    referenceId: appointmentId,
    referenceType: WhatsappReferenceType.appointment,
    recipientPhone: phone,
    templateEnvVar: env.WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED,
    params,
  });
}

export async function notifyInvoiceFinalized(tenantId: string, invoiceId: string): Promise<void> {
  if (isDisabled()) return;

  logger.info(
    { whatsapp_debug: true, invoiceId },
    '[WhatsApp] notifyInvoiceFinalized triggered'
  );

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      items: { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!invoice) return;

  let phone = invoice.customerPhone;
  if (!phone && invoice.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: invoice.customerId },
      select: { phone: true },
    });
    phone = customer?.phone ?? null;
  }

  if (!phone) {
    await createLog({
      tenantId,
      type: WhatsappNotificationType.invoice_finalized,
      recipientPhone: null,
      templateName: env.WHATSAPP_TEMPLATE_INVOICE_FINALIZED ?? '',
      templateParams: {},
      status: WhatsappNotificationStatus.skipped,
      errorMessage: 'No phone number on file',
      referenceId: invoiceId,
      referenceType: WhatsappReferenceType.invoice,
    });
    return;
  }

  const lineItems = invoice.items.map((item) => {
    const price = formatCurrency(Number(item.netAmount));
    return `${item.name} x${item.quantity} - ${price}`;
  });

  const params: InvoiceFinalizedParams = {
    customerName: invoice.customerName ?? 'Customer',
    invoiceNumber: invoice.invoiceNumber ?? invoiceId,
    itemsSummary: lineItems.join('\n'),
    total: formatCurrency(Number(invoice.grandTotal)),
  };

  await sendNotification({
    tenantId,
    type: WhatsappNotificationType.invoice_finalized,
    referenceId: invoiceId,
    referenceType: WhatsappReferenceType.invoice,
    recipientPhone: phone,
    templateEnvVar: env.WHATSAPP_TEMPLATE_INVOICE_FINALIZED,
    params,
  });
}
