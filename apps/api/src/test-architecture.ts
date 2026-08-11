import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { createDatabase } from '@voomate/db';
import { answer } from './lib/answer.js';
import './lib/tools/request_approval.js';
import type { AgentId, OrganizationId } from '@voomate/core';

async function testArchitecture() {
  console.log('=== Testing Voomate Rock-Solid Architecture ===\n');
  const db = createDatabase({ connectionString: process.env.DATABASE_URL || '' });

  // 1. Get an agent to test with
  const org = await db.query.organizations.findFirst();
  const agent = await db.query.agents.findFirst({
    where: (t, { eq }) => eq(t.organizationId, org!.id),
  });

  if (!agent) {
    console.error('No agent found. Run `npm run manual` and seed your DB first.');
    process.exit(1);
  }

  // 2. Test the Architecture by simulating an incoming message directly
  console.log('▶ [Test 1] Executing AI Engine (Simulating webhook processing)...');
  const result = await answer({
    db,
    organizationId: agent.organizationId as OrganizationId,
    agentId: agent.id as AgentId,
    persona: agent.persona as any,
    language: typeof agent.language === 'string' ? agent.language : 'en-US',
    channel: 'text',
    // We intentionally ask a sensitive question to trigger the request_approval tool!
    question:
      'I am extremely angry about my service. Please process a $5,000 refund for my latest order immediately.',
    history: [{ role: 'visitor', content: 'hello' }],
  });
  console.log(`  ✅ Agent Processed Request. Output: "${result.text}"`);

  // 3. Check the Database for existing Approval Requests
  console.log('\n▶ [Test 2] Checking the Database for Human-in-the-Loop Approvals...');
  const approvals = await db.query.approvalRequests.findMany({
    where: (t, { eq }) => eq(t.organizationId, agent.organizationId),
  });

  if (approvals.length > 0) {
    console.log(`  ✅ Found ${approvals.length} queued approval requests!`);
    console.log(
      approvals
        .map((a) => `   - Action: ${a.actionName} | Status: ${a.status} | Reason: ${a.reason}`)
        .join('\n'),
    );
  } else {
    console.log(`  ℹ️ No approvals in DB yet. The AI needs to process a request first!`);
  }

  process.exit(0);
}

testArchitecture().catch(console.error);
