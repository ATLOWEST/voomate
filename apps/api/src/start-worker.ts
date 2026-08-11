import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { messageWorker } from './modules/queue-worker.js';

console.log('✅ BullMQ Worker started successfully.');
console.log('Listening for background messages on Upstash Redis...');
console.log('Press Ctrl+C to exit.');

// Catch termination signals to cleanly shut down the worker
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await messageWorker.close();
  process.exit(0);
});
