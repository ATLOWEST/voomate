#!/usr/bin/env node
/** Read-only production status, including the immutable image actually serving traffic. */
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const read = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
const output = (key) =>
  read('aws', [
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    'Voomate-prod-ApplicationFoundation',
    '--query',
    `Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]`,
    '--output',
    'text',
  ]);
const cluster = output('ClusterName');
if (!cluster || cluster === 'None')
  throw new Error('Production foundation outputs are unavailable.');

const rows = ['api', 'dashboard', 'voice'].map((service) => {
  const response = JSON.parse(
    read('aws', [
      'ecs',
      'describe-services',
      '--cluster',
      cluster,
      '--services',
      `voomate-prod-${service}`,
      '--output',
      'json',
    ]),
  );
  const details = response.services?.[0];
  if (!details) throw new Error(`ECS service not found: ${service}`);
  const task = JSON.parse(
    read('aws', [
      'ecs',
      'describe-task-definition',
      '--task-definition',
      details.taskDefinition,
      '--output',
      'json',
    ]),
  ).taskDefinition;
  const image =
    task.containerDefinitions.find((container) => container.name === service)?.image ?? 'unknown';
  return {
    service,
    desired: details.desiredCount,
    running: details.runningCount,
    pending: details.pendingCount,
    image,
  };
});
console.table(rows);
