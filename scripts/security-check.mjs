#!/usr/bin/env node
/**
 * Small, deterministic repository guard that complements GitHub secret scanning and CodeQL.
 * It scans tracked text files only, so local `.env` files never enter CI output or the scan set.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const patterns = [
  { name: 'AWS access key', value: /AKIA[0-9A-Z]{16}/ },
  { name: 'private key', value: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub personal token', value: /ghp_[A-Za-z0-9]{30,}/ },
  { name: 'Slack token', value: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];
const findings = [];
for (const relativePath of tracked) {
  const absolutePath = resolve(root, relativePath);
  if (statSync(absolutePath).size > 1_000_000) continue;
  let content;
  try {
    content = readFileSync(absolutePath, 'utf8');
  } catch {
    continue;
  }
  for (const pattern of patterns) {
    if (pattern.value.test(content)) findings.push(`${relativePath}: possible ${pattern.name}`);
  }
}
if (findings.length) {
  console.error('Repository security guard failed:\n' + findings.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log(`Repository security guard passed (${tracked.length} tracked files scanned).`);
