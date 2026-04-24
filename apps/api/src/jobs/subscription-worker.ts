/**
 * Subscription Jobs Worker (Conditional)
 *
 * Handles background jobs for subscription lifecycle management:
 * - Trial expiration
 * - Subscription renewal/expiration
 * - Grace period handling
 *
 * When ENABLE_REDIS is false, the worker is not created.
 */

import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { isRedisEnabled } from '@/lib/redis';
import { QUEUE_NAMES, SUBSCRIPTION_JOB_TYPES } from './index';
import { processSubscriptionLifecycle } from './subscription-jobs';

// Conditional Redis connection and worker
let connection: Redis | null = null;
let subscriptionWorker: Worker | null = null;

// Create worker only if Redis is enabled
if (isRedisEnabled && env.REDIS_URL) {
  connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  subscriptionWorker = new Worker(
    QUEUE_NAMES.SUBSCRIPTIONS,
    async (job: Job) => {
      switch (job.name) {
        case SUBSCRIPTION_JOB_TYPES.PROCESS_LIFECYCLE:
          return processSubscriptionLifecycle();
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: connection as unknown as ConnectionOptions,
      concurrency: 1, // Only one lifecycle job at a time
    }
  );

  subscriptionWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Subscription job completed');
  });

  subscriptionWorker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, jobName: job?.name, error: err.message },
      'Subscription job failed'
    );
  });

  logger.info('Subscription worker initialized');
} else {
  logger.warn('Redis disabled - subscription worker not initialized');
}

// Export worker (may be null if Redis disabled)
export { subscriptionWorker };

// Graceful shutdown
export async function closeSubscriptionWorker() {
  if (!isRedisEnabled) {
    logger.info('Redis disabled - no subscription worker to close');
    return;
  }

  if (subscriptionWorker) await subscriptionWorker.close();
  if (connection) await connection.quit();
  logger.info('Subscription worker closed');
}
