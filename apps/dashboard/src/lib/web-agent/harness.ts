import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ACTIVE_HARNESS = 'web-agent.v1.md';

export interface LoadedHarness {
  id: string;
  version: string;
  instructions: string;
}

function harnessPath(): string {
  const cwd = process.cwd();
  return cwd.endsWith('apps/dashboard')
    ? join(cwd, 'harness', ACTIVE_HARNESS)
    : join(cwd, 'apps', 'dashboard', 'harness', ACTIVE_HARNESS);
}

function metadata(source: string, key: string): string {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`Web Agent harness is missing ${key}.`);
  return match[1].trim();
}

export async function loadWebAgentHarness(values: {
  businessName: string;
  agentName: string;
}): Promise<LoadedHarness> {
  // Read on every request so a reviewed harness change takes effect without rebuilding the app.
  const source = await readFile(harnessPath(), 'utf8');
  return {
    id: metadata(source, 'harness_id'),
    version: metadata(source, 'version'),
    instructions: source
      .replaceAll('{business_name}', values.businessName)
      .replaceAll('{agent_name}', values.agentName),
  };
}
