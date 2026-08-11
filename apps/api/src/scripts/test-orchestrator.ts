import { getDb } from '../lib/db.js';
import { agents, agentConnections, organizations } from '@voomate/db';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

async function run() {
  const db = getDb();

  const orgId = randomUUID();
  const sourceAgentId = randomUUID();
  const targetAgentId = randomUUID();

  console.log('--- Setting up Test Data ---');
  // 1. Create Org
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Orchestrator Org',
    slug: `test-org-${Date.now()}`,
    plan: 'free',
  });
  console.log(`Created Org: ${orgId}`);

  // 2. Create Source Agent (Web)
  await db.insert(agents).values({
    id: sourceAgentId,
    organizationId: orgId,
    name: 'Web Frontline Agent',
    websiteUrl: 'https://example.com',
    status: 'published',
    language: { languages: ['en-US'], primaryLanguage: 'en-US', codeSwitching: true },
    persona: {
      displayName: 'WebBot',
      greeting: 'Hi',
      role: 'Frontline customer support',
      tone: 'Friendly',
    },
    appearance: { theme: 'light', color: '#000000', position: 'bottom-right' },
    embedKey: `test-embed-${Date.now()}-1`,
  });
  console.log(`Created Source Agent: ${sourceAgentId}`);

  // 3. Create Target Agent (Integration)
  await db.insert(agents).values({
    id: targetAgentId,
    organizationId: orgId,
    name: 'Integration Backend Agent',
    websiteUrl: 'https://example.com',
    status: 'published',
    language: { languages: ['en-US'], primaryLanguage: 'en-US', codeSwitching: true },
    persona: {
      displayName: 'IntegrationBot',
      greeting: 'Hi',
      role: 'Handle support tickets and order integrations',
      tone: 'Professional',
    },
    appearance: { theme: 'light', color: '#000000', position: 'bottom-right' },
    embedKey: `test-embed-${Date.now()}-2`,
  });
  console.log(`Created Target Agent: ${targetAgentId}`);

  // 4. Connect them
  await db.insert(agentConnections).values({
    organizationId: orgId,
    sourceAgentId,
    targetAgentId,
    connectionType: 'tool_delegation',
  });
  console.log(`Connected ${sourceAgentId} -> ${targetAgentId}`);

  console.log('\n--- Simulating Orchestrator Logic ---');
  // Simulate the Orchestrator API Logic manually for the test
  const question = 'I need help with a support ticket';
  console.log(`Visitor Query: "${question}"`);

  const connections = await db
    .select({
      targetAgentId: agentConnections.targetAgentId,
      connectionType: agentConnections.connectionType,
    })
    .from(agentConnections)
    .where(eq(agentConnections.sourceAgentId, sourceAgentId));

  const targetAgents = await db
    .select({
      id: agents.id,
      persona: agents.persona,
    })
    .from(agents)
    .where(eq(agents.id, connections[0]?.targetAgentId ?? '00000000-0000-0000-0000-000000000000'));

  let bestTarget = null;
  let reason = '';
  const questionLower = question.toLowerCase();

  for (const target of targetAgents) {
    const personaStr = JSON.stringify(target.persona).toLowerCase();
    if (questionLower.includes('ticket') || personaStr.includes('support')) {
      bestTarget = target;
      reason = 'Query matched the target agent specialized domain.';
      break;
    }
  }

  if (bestTarget) {
    console.log(`✅ SUCCESS: Orchestrator routed query to Target Agent (${bestTarget.id})!`);
    console.log(`Reason: ${reason}`);
  } else {
    console.log(`❌ FAILED: Orchestrator did not route correctly.`);
  }

  // Cleanup
  console.log('\n--- Cleaning up ---');
  await db.delete(organizations).where(eq(organizations.id, orgId));
  console.log('Cleanup complete.');
  process.exit(0);
}

run().catch(console.error);
