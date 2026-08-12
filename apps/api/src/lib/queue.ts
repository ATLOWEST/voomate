import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const MESSAGE_QUEUE_NAME = 'voomate-messages';

let messageQueue: Queue | undefined;

/**
 * BullMQ is required only for asynchronous channel webhooks. Constructing its Redis connection
 * at module import time made the entire API noisy and slow when a local developer only needed the
 * Web Agent or Connect endpoint. Keep this dependency behind the route that actually uses it.
 */
export function getMessageQueue(): Queue {
  if (messageQueue) return messageQueue;
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  messageQueue = new Queue(MESSAGE_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  return messageQueue;
}
