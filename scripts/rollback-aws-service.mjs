#!/usr/bin/env node
/** Promote a previously-built immutable image for one runtime through CloudFormation. */
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const read = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options });
const [service, tag] = process.argv.slice(2);
const services = ['api', 'dashboard', 'voice'];
if (!services.includes(service) || !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag ?? '')) {
  throw new Error('Usage: npm run release:rollback -- <api|dashboard|voice> <immutable-ecr-tag>');
}
if (read('git', ['status', '--porcelain'])) {
  throw new Error(
    'Refusing a production rollback from a dirty worktree. Commit or stash changes first.',
  );
}
// Fail before changing CloudFormation when a tag was mistyped or ECR retention has removed it.
read('aws', [
  'ecr',
  'describe-images',
  '--repository-name',
  `voomate-prod-${service}`,
  '--image-ids',
  `imageTag=${tag}`,
  '--query',
  'imageDetails[0].imageDigest',
  '--output',
  'text',
]);
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
const tags = Object.fromEntries(
  services.map((name) => {
    const taskDefinition = read('aws', [
      'ecs',
      'describe-services',
      '--cluster',
      cluster,
      '--services',
      `voomate-prod-${name}`,
      '--query',
      'services[0].taskDefinition',
      '--output',
      'text',
    ]);
    const image = read('aws', [
      'ecs',
      'describe-task-definition',
      '--task-definition',
      taskDefinition,
      '--query',
      `taskDefinition.containerDefinitions[?name=='${name}'].image | [0]`,
      '--output',
      'text',
    ]);
    const currentTag = image.match(/:([^:@/]+)$/)?.[1];
    if (!currentTag) throw new Error(`Could not read the ${name} image tag from ECS.`);
    return [name, currentTag];
  }),
);
tags[service] = tag;
run(
  'npx',
  [
    'cdk',
    'deploy',
    'Voomate-prod-ApplicationFoundation',
    '-c',
    'stage=prod',
    '-c',
    `apiImageTag=${tags.api}`,
    '-c',
    `dashboardImageTag=${tags.dashboard}`,
    '-c',
    `voiceImageTag=${tags.voice}`,
    '-c',
    'deployDataPlane=false',
    '--require-approval',
    'never',
  ],
  { cwd: new URL('../infra/', import.meta.url) },
);
