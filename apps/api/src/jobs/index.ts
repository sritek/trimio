/**
 * BullMQ Job Queue Infrastructure (Conditional)
 *
 * Sets up job queues for background processing tasks like:
 * - Auto-absent marking at end of day
 * - Leave balance initialization on new financial year
 * - Payslip generation and distribution
 *
 * When ENABLE_REDIS is false, all job functions become no-ops
 * that log warnings instead of queueing jobs.
 */

import { Queue, QueueEvents } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { isRedisEnabled } from '@/lib/redis';

// Queue names
export const QUEUE_NAMES = {
  STAFF: 'staff-jobs',
  NOTIFICATIONS: 'notification-jobs',
  REPORTS: 'report-jobs',
  SUBSCRIPTIONS: 'subscription-jobs',
} as const;

// Job types for staff queue
export const STAFF_JOB_TYPES = {
  AUTO_ABSENT: 'auto-absent',
  LEAVE_BALANCE_INIT: 'leave-balance-init',
  PAYSLIP_GENERATE: 'payslip-generate',
  PAYSLIP_EMAIL: 'payslip-email',
  PAYSLIP_WHATSAPP: 'payslip-whatsapp',
} as const;

// Job types for subscription queue
export const SUBSCRIPTION_JOB_TYPES = {
  PROCESS_LIFECYCLE: 'process-lifecycle',
} as const;

// Conditional Redis connection and queues
let connection: Redis | null = null;
let staffQueue: Queue | null = null;
let staffQueueEvents: QueueEvents | null = null;
let subscriptionQueue: Queue | null = null;
let subscriptionQueueEvents: QueueEvents | null = null;

if (isRedisEnabled && env.REDIS_URL) {
  // Redis connection for BullMQ (separate from cache connection)
  connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  };

  // Create staff queue
  staffQueue = new Queue(QUEUE_NAMES.STAFF, {
    connection: connection as unknown as ConnectionOptions,
    defaultJobOptions,
  });

  // Create subscription queue
  subscriptionQueue = new Queue(QUEUE_NAMES.SUBSCRIPTIONS, {
    connection: connection as unknown as ConnectionOptions,
    defaultJobOptions,
  });

  // Queue events for monitoring - Staff
  staffQueueEvents = new QueueEvents(QUEUE_NAMES.STAFF, {
    connection: connection as unknown as ConnectionOptions,
  });

  staffQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId, queue: QUEUE_NAMES.STAFF }, 'Job completed');
  });

  staffQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, queue: QUEUE_NAMES.STAFF, reason: failedReason }, 'Job failed');
  });

  // Queue events for monitoring - Subscriptions
  subscriptionQueueEvents = new QueueEvents(QUEUE_NAMES.SUBSCRIPTIONS, {
    connection: connection as unknown as ConnectionOptions,
  });

  subscriptionQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId, queue: QUEUE_NAMES.SUBSCRIPTIONS }, 'Job completed');
  });

  subscriptionQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, queue: QUEUE_NAMES.SUBSCRIPTIONS, reason: failedReason }, 'Job failed');
  });

  logger.info('BullMQ job queues initialized');
} else {
  logger.warn(
    'Redis disabled - BullMQ job queues not initialized. Background jobs will be skipped.'
  );
}

// Export queues (may be null if Redis disabled)
export { staffQueue, staffQueueEvents, subscriptionQueue, subscriptionQueueEvents };

// Job data types
export interface AutoAbsentJobData {
  tenantId: string;
  branchId: string;
  date: string; // YYYY-MM-DD
}

export interface LeaveBalanceInitJobData {
  tenantId: string;
  financialYear: string; // e.g., "2026-27"
}

export interface PayslipGenerateJobData {
  tenantId: string;
  payrollId: string;
}

export interface PayslipEmailJobData {
  tenantId: string;
  payslipId: string;
  staffEmail: string;
}

export interface PayslipWhatsAppJobData {
  tenantId: string;
  payslipId: string;
  staffPhone: string;
}

// Helper to add jobs (no-ops when Redis disabled)
export const addStaffJob = {
  async autoAbsent(data: AutoAbsentJobData, delay?: number) {
    if (!staffQueue) {
      logger.warn(
        { data, jobType: STAFF_JOB_TYPES.AUTO_ABSENT },
        'Redis disabled - auto-absent job skipped'
      );
      return null;
    }
    return staffQueue.add(STAFF_JOB_TYPES.AUTO_ABSENT, data, {
      delay,
      jobId: `auto-absent-${data.branchId}-${data.date}`,
    });
  },

  async leaveBalanceInit(data: LeaveBalanceInitJobData) {
    if (!staffQueue) {
      logger.warn(
        { data, jobType: STAFF_JOB_TYPES.LEAVE_BALANCE_INIT },
        'Redis disabled - leave balance init job skipped'
      );
      return null;
    }
    return staffQueue.add(STAFF_JOB_TYPES.LEAVE_BALANCE_INIT, data, {
      jobId: `leave-balance-init-${data.tenantId}-${data.financialYear}`,
    });
  },

  async payslipGenerate(data: PayslipGenerateJobData) {
    if (!staffQueue) {
      logger.warn(
        { data, jobType: STAFF_JOB_TYPES.PAYSLIP_GENERATE },
        'Redis disabled - payslip generate job skipped'
      );
      return null;
    }
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_GENERATE, data, {
      jobId: `payslip-generate-${data.payrollId}`,
    });
  },

  async payslipEmail(data: PayslipEmailJobData) {
    if (!staffQueue) {
      logger.warn(
        { data, jobType: STAFF_JOB_TYPES.PAYSLIP_EMAIL },
        'Redis disabled - payslip email job skipped'
      );
      return null;
    }
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_EMAIL, data);
  },

  async payslipWhatsApp(data: PayslipWhatsAppJobData) {
    if (!staffQueue) {
      logger.warn(
        { data, jobType: STAFF_JOB_TYPES.PAYSLIP_WHATSAPP },
        'Redis disabled - payslip WhatsApp job skipped'
      );
      return null;
    }
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_WHATSAPP, data);
  },
};

// Helper to add subscription jobs (no-ops when Redis disabled)
export const addSubscriptionJob = {
  async processLifecycle() {
    if (!subscriptionQueue) {
      logger.warn(
        { jobType: SUBSCRIPTION_JOB_TYPES.PROCESS_LIFECYCLE },
        'Redis disabled - subscription lifecycle job skipped'
      );
      return null;
    }
    return subscriptionQueue.add(
      SUBSCRIPTION_JOB_TYPES.PROCESS_LIFECYCLE,
      {},
      {
        jobId: `subscription-lifecycle-${new Date().toISOString().split('T')[0]}`,
      }
    );
  },
};

// Graceful shutdown
export async function closeQueues() {
  if (!isRedisEnabled) {
    logger.info('Redis disabled - no job queues to close');
    return;
  }

  if (staffQueue) await staffQueue.close();
  if (staffQueueEvents) await staffQueueEvents.close();
  if (subscriptionQueue) await subscriptionQueue.close();
  if (subscriptionQueueEvents) await subscriptionQueueEvents.close();
  if (connection) await connection.quit();
  logger.info('Job queues closed');
}
