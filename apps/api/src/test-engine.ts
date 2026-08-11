import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { answer } from './lib/answer.js';
import { createDatabase, organizations, agents } from '@voomate/db';
import type { AgentId, OrganizationId } from '@voomate/core';

const db = createDatabase({
  connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
});

async function runTest() {
  console.log('=== STARTING VOOMATE OS ENGINE TEST ===\n');

  // 1. Fetch a real organization and agent from the DB
  let org = await db.query.organizations.findFirst();
  if (!org) {
    console.error('No organization found in DB. Please seed the DB first.');
    process.exit(1);
  }

  let agent = await db.query.agents.findFirst({
    where: (t, { eq }) => eq(t.organizationId, org!.id),
  });

  if (!agent) {
    console.log('No agent found in DB for this org. Creating a dummy agent for testing...');
    await db.insert(agents).values({
      id: '00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      name: 'Test Agent',
      websiteUrl: 'https://test.com',
      language: 'en-US',
      appearance: {},
      embedKey: 'test-embed-key',
      allowedOrigins: [],
      persona: {
        name: 'TestAgent',
        role: 'Support',
        company: 'Voomate',
        tone: 'helpful',
        instructions: '',
      },
    });
    agent = await db.query.agents.findFirst({
      where: (t, { eq }) => eq(t.organizationId, org!.id),
    });
  }

  if (agent === undefined) throw new Error('Could not create the test agent.');

  const orgId = org.id;

  console.log(`Using Org ID: ${orgId}`);
  console.log(`Using Agent ID: ${agent.id}\n`);

  // --- Test 1: Simple FAQ (Should hit Upstash Redis on 2nd try) ---
  console.log('--> TEST 1: Sending Simple FAQ Query (Checking Caching & Fast Routing)');
  const req1 = {
    db,
    organizationId: orgId as OrganizationId,
    agentId: agent.id as AgentId,
    persona: agent.persona as any,
    language: 'en-US',
    channel: 'text' as const,
    question: 'What are your business hours?',
  };

  try {
    const res1 = await answer(req1, (chunk) => process.stdout.write(chunk.delta));
    console.log(`\n\n[Result] Latency: ${res1.latency.totalMs}ms\n`);

    console.log(
      '--> TEST 1b: Re-sending exact same query (Should be served from Upstash Cache instantly)',
    );
    const res1b = await answer(req1, (chunk) => process.stdout.write(chunk.delta));
    console.log(`\n\n[Result] Latency: ${res1b.latency.totalMs}ms\n`);
  } catch (e) {
    console.error('Test 1 Failed:', e);
  }

  // --- Test 2: Complex Action (Refund) -> Should trigger Escalate to Human ---
  console.log('--> TEST 2: Sending Complex/Sensitive Query (Checking Bounded Loop & Escalation)');
  const req2 = {
    db,
    organizationId: orgId as OrganizationId,
    agentId: agent.id as AgentId,
    persona: agent.persona as any,
    language: 'en-US',
    channel: 'text' as const,
    question: 'I demand a refund of $50,000 immediately, this is unacceptable!',
  };

  try {
    const res2 = await answer(req2, (chunk) => process.stdout.write(chunk.delta));
    console.log(`\n\n[Result] Latency: ${res2.latency.totalMs}ms\n`);
  } catch (e) {
    console.error('Test 2 Failed:', e);
  }

  console.log('=== TESTS COMPLETE ===');
  process.exit(0);
}

runTest();
