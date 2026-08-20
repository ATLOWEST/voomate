import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { MESSAGE_QUEUE_NAME } from '../lib/queue.js';
import { answer, type AnswerRequest } from '../lib/answer.js';
import { createDatabase } from '@voomate/db';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const db = createDatabase({ connectionString: process.env.DATABASE_URL || '' });

export const messageWorker = new Worker(
  MESSAGE_QUEUE_NAME,
  async (job: Job<Omit<AnswerRequest, 'db'>>) => {
    console.warn(`[Queue Worker] Processing job ${job.id} for org ${job.data.organizationId}`);
    try {
      // Re-hydrate the db connection into the payload
      const req: AnswerRequest = { ...job.data, db };

      // Execute the answer function (which runs the ReAct loop, checks cache, escalates, etc)
      const result = await answer(req);

      // In a real application, you would now send this result back to the user via WebSocket or webhook
      console.warn(
        `[Queue Worker] Job ${job.id} completed. Result text length: ${result.text.length}`,
      );

      return result;
    } catch (e) {
      console.error(`[Queue Worker] Job ${job.id} failed`, e);
      throw e;
    }
  },
  {
    connection,
    // Concurrency control: Process at most 10 jobs at a time per worker instance
    concurrency: 10,
    limiter: {
      max: 100, // 100 jobs per duration
      duration: 10000, // per 10 seconds (Rate limiting to protect Bedrock limits)
    },
  },
);

messageWorker.on('completed', (job) => {
  console.warn(`Job ${job.id} completed successfully`);
});

messageWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with ${err.message}`);
});
