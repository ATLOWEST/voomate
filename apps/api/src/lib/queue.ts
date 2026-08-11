import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { serverConfig } from '../config.js';

// BullMQ requires a standard TCP Redis connection, not the REST API.
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const MESSAGE_QUEUE_NAME = 'voomate-messages';

// The Queue instance is used to push jobs
export const messageQueue = new Queue(MESSAGE_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// The QueueEvents instance allows us to listen to job lifecycle events if needed
export const messageQueueEvents = new QueueEvents(MESSAGE_QUEUE_NAME, { connection });
