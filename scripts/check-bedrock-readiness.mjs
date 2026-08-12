import { spawnSync } from 'node:child_process';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

function aws(args) {
  const result = spawnSync('aws', args, { encoding: 'utf8', env: process.env });
  if (result.status !== 0) throw new Error(result.stderr.trim());
  return JSON.parse(result.stdout);
}

const identity = aws(['sts', 'get-caller-identity', '--output', 'json']);
const models = aws([
  'bedrock',
  'list-foundation-models',
  '--by-provider',
  'amazon',
  '--region',
  process.env.BEDROCK_REGION ?? 'us-east-1',
  '--output',
  'json',
]);
const agents = aws([
  'bedrock-agent',
  'list-agents',
  '--region',
  process.env.BEDROCK_REGION ?? 'us-east-1',
  '--max-results',
  '10',
  '--output',
  'json',
]);

console.log({
  account: identity.Account,
  caller: identity.Arn,
  configuredModel: process.env.BEDROCK_MODEL_ID,
  availableNovaModels: models.modelSummaries
    .filter((model) => model.modelId.includes('nova'))
    .map((model) => ({ id: model.modelId, status: model.modelLifecycle?.status })),
  managedAgents: agents.agentSummaries.map((agent) => ({
    name: agent.agentName,
    status: agent.agentStatus,
  })),
});
