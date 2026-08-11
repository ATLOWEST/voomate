import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabase, organizations, agents } from '@voomate/db';
import { answer } from '../lib/answer.js';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { OrganizationId, AgentId } from '@voomate/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createDatabase({
  connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
});
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface Scenario {
  id: string;
  description: string;
  history: Array<{ role: 'visitor' | 'agent'; content: string }>;
  question: string;
  expectedTopics: string[];
  shouldEscalate: boolean;
}

async function runEvals() {
  console.log('=== STARTING EVALS PIPELINE ===\n');

  const org = await db.query.organizations.findFirst();
  const agent = await db.query.agents.findFirst({
    where: (t, { eq }) => eq(t.organizationId, org!.id),
  });

  if (!agent) {
    console.error('No agent found to run evals. Please seed the DB.');
    process.exit(1);
  }

  const datasetPath = path.join(__dirname, 'evals-dataset.json');
  const dataset: Scenario[] = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  let passed = 0;

  for (const scenario of dataset) {
    console.log(`\n▶ Running Scenario: [${scenario.id}] ${scenario.description}`);
    const req = {
      db,
      organizationId: agent.organizationId as OrganizationId,
      agentId: agent.id as AgentId,
      persona: agent.persona as any,
      language: 'en-US',
      channel: 'text' as const,
      question: scenario.question,
      history: scenario.history,
    };

    let result;
    try {
      result = await answer(req);
    } catch (e: any) {
      console.error(`  ❌ Error during execution: ${e.stack || e}`);
      continue;
    }

    const escalated =
      result.text.toLowerCase().includes('escalat') ||
      result.text.toLowerCase().includes('human agent');

    if (scenario.shouldEscalate && !escalated) {
      console.error(`  ❌ FAILED: Expected escalation, but agent did not escalate.`);
      console.log(`  Agent response: ${result.text}`);
      continue;
    }

    // LLM Judge
    const judgePrompt = `
You are an objective AI evaluator.
You must grade the following AI response against the expected topics.
Expected Topics: ${scenario.expectedTopics.join(', ')}

Response:
"${result.text}"

Does the response adequately address at least one of the expected topics or clearly handle the situation safely?
Respond with exactly one word: PASS or FAIL.
`;

    const classifyCmd = new ConverseCommand({
      modelId: 'amazon.nova-micro-v1:0',
      messages: [{ role: 'user', content: [{ text: judgePrompt }] }],
      inferenceConfig: { maxTokens: 10, temperature: 0 },
    });

    let judgeResult = 'FAIL';
    try {
      const res = await bedrock.send(classifyCmd);
      const text = res.output?.message?.content?.[0];
      if (text && 'text' in text && text.text?.includes('PASS')) {
        judgeResult = 'PASS';
      }
    } catch (e) {
      console.warn('  LLM Judge failed to execute', e);
    }

    if (judgeResult === 'PASS') {
      console.log(`  ✅ PASSED (${result.latency.totalMs}ms)`);
      passed++;
    } else {
      console.error(`  ❌ FAILED (LLM Judge rejected)`);
      console.log(`  Agent response: ${result.text}`);
    }
  }

  console.log(`\n=== EVALS COMPLETE: ${passed}/${dataset.length} PASSED ===`);
  process.exit(passed === dataset.length ? 0 : 1);
}

runEvals().catch(console.error);
