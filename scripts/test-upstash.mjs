import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const qstashUrl = process.env.QSTASH_URL;
const qstashToken = process.env.QSTASH_TOKEN;
const upstashVectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
const upstashVectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;

console.log('--- Checking Upstash Configuration ---');
console.log(`UPSTASH_REDIS_REST_URL: ${url ? `${url.substring(0, 20)}...` : 'NOT SET'}`);
console.log(`UPSTASH_REDIS_REST_TOKEN: ${token ? 'SET (present)' : 'NOT SET'}`);

if (!url || !token) {
  console.log('\n❌ Upstash Redis is NOT configured in .env');
  process.exit(1);
}

try {
  console.log('\n--- Testing Upstash Redis Connection ---');
  const redis = new Redis({ url, token });

  const start = performance.now();
  const pingResponse = await redis.ping();
  const pingMs = Math.round(performance.now() - start);
  console.log(`✅ PING successful: "${pingResponse}" (${pingMs}ms)`);

  const testKey = `voomate:health-check:${Date.now()}`;
  await redis.set(testKey, 'alive', { ex: 30 });
  const readBack = await redis.get(testKey);
  await redis.del(testKey);

  console.log(`✅ SET/GET/DEL test: readback="${readBack}" (verified live write & read)`);

  // Get database statistics if available
  try {
    const dbsize = await redis.dbsize();
    console.log(`📊 DB Size (total keys): ${dbsize}`);
  } catch (e) {
    // Ignore if not supported
  }

  console.log('\n🎉 Upstash Redis is CONNECTED, HEALTHY, and ALIVE!');
} catch (error) {
  console.error('\n❌ Upstash connection failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
