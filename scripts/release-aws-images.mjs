#!/usr/bin/env node
/**
 * Secure, scoped production promotion. Source is archived from committed HEAD, built in AWS
 * CodeBuild, pushed with an immutable commit tag, then promoted through CloudFormation.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const services = ['api', 'dashboard', 'voice'];
const terminalBuildStates = new Set(['FAILED', 'FAULT', 'STOPPED', 'TIMED_OUT']);
const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options });
const read = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options }).trim();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const usage = () =>
  console.log(`Usage: npm run release:changed -- [--base <git-ref>] [--services api,dashboard,voice] [--dry-run]
Default: compares HEAD^..HEAD and promotes only affected services. --services is an intentional redeploy override.`);
const args = process.argv.slice(2);
let base = 'HEAD^';
let requested;
let dryRun = false;
for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (value === '--base') base = args[++index] ?? '';
  else if (value === '--services') requested = (args[++index] ?? '').split(',').filter(Boolean);
  else if (value === '--dry-run') dryRun = true;
  else if (value === '--help' || value === '-h') {
    usage();
    process.exit(0);
  } else throw new Error(`Unknown release option: ${value}`);
}
if (!base) throw new Error('--base needs a git revision.');
if (requested?.some((service) => !services.includes(service)))
  throw new Error(`--services accepts only: ${services.join(', ')}`);
if (read('git', ['status', '--porcelain']))
  throw new Error(
    'Refusing a production release from a dirty worktree. Commit or stash changes first.',
  );

const changedFiles = read('git', ['diff', '--name-only', `${base}..HEAD`])
  .split('\n')
  .filter(Boolean);
const affects = (prefix) => changedFiles.some((file) => file.startsWith(prefix));
const sharedNodeChange = changedFiles.some(
  (file) =>
    file.startsWith('packages/') ||
    ['package.json', 'package-lock.json', 'Dockerfile.api', 'Dockerfile.dashboard'].includes(file),
);
const selected = new Set(requested ?? []);
if (!requested) {
  if (affects('apps/api/')) selected.add('api');
  if (affects('apps/dashboard/') || affects('apps/widget/')) selected.add('dashboard');
  if (affects('services/voice/')) selected.add('voice');
  if (sharedNodeChange) {
    selected.add('api');
    selected.add('dashboard');
  }
}
const selectedServices = services.filter((service) => selected.has(service));
const landingChanged = affects('apps/landing/');
const infrastructureChanged = affects('infra/');
if (!selectedServices.length && !landingChanged && !infrastructureChanged) {
  console.log(`No deployable application changes in ${base}..HEAD.`);
  process.exit(0);
}
const gate = (label, command, commandArgs, options) => {
  console.log(`\n[gate] ${label}`);
  if (!dryRun) run(command, commandArgs, options);
};
if (selectedServices.some((service) => service === 'api' || service === 'dashboard'))
  gate('shared Node packages', 'npm', ['run', 'build:packages']);
if (selected.has('api')) {
  gate('api typecheck', 'npm', ['run', 'typecheck', '--workspace', '@voomate/api']);
  gate('api tests', 'npm', ['run', 'test', '--workspace', '@voomate/api']);
}
if (selected.has('dashboard')) {
  gate('dashboard typecheck', 'npm', ['run', 'typecheck', '--workspace', '@voomate/dashboard']);
  gate('dashboard tests', 'npm', ['run', 'test', '--workspace', '@voomate/dashboard']);
}
if (selected.has('voice')) gate('voice tests and lint', 'npm', ['run', 'test:voice-service']);
if (landingChanged)
  gate('landing static build', 'npm', ['run', 'build', '--workspace', '@voomate/landing'], {
    // LandingDelivery publishes the static `out` directory. Make that contract explicit so a
    // successful Next build cannot leave CDK with no asset to deploy.
    env: { ...process.env, LANDING_STATIC_EXPORT: 'true' },
  });
if (infrastructureChanged) {
  gate('infrastructure typecheck', 'npm', ['run', 'typecheck'], {
    cwd: new URL('../infra/', import.meta.url),
  });
  gate('infrastructure tests', 'npm', ['test'], { cwd: new URL('../infra/', import.meta.url) });
}

const stackOutput = (key) =>
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
const waitForBuild = async (id) => {
  for (;;) {
    const build = JSON.parse(
      read('aws', ['codebuild', 'batch-get-builds', '--ids', id, '--output', 'json']),
    ).builds?.[0];
    if (!build) throw new Error(`CodeBuild did not return build ${id}.`);
    if (build.buildStatus === 'SUCCEEDED') return;
    if (terminalBuildStates.has(build.buildStatus))
      throw new Error(`CodeBuild ${id} ended with ${build.buildStatus}.`);
    await sleep(5_000);
  }
};
const liveTags = (cluster) =>
  Object.fromEntries(
    services.map((service) => {
      const taskDefinition = read('aws', [
        'ecs',
        'describe-services',
        '--cluster',
        cluster,
        '--services',
        `voomate-prod-${service}`,
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
        `taskDefinition.containerDefinitions[?name=='${service}'].image | [0]`,
        '--output',
        'text',
      ]);
      const tag = image.match(/:([^:@/]+)$/)?.[1];
      if (!tag) throw new Error(`Could not read the immutable ${service} image tag from ECS.`);
      return [service, tag];
    }),
  );

const releaseTag = read('git', ['rev-parse', '--short=12', 'HEAD']);
console.log(
  `\n[release] ${releaseTag}: ${selectedServices.join(', ') || 'no ECS images'}${landingChanged ? ', landing' : ''}${infrastructureChanged ? ', infrastructure' : ''}`,
);
if (dryRun) process.exit(0);
const bucket = stackOutput('ReleaseSourceBucketName');
const cluster = stackOutput('ClusterName');
if (!bucket || bucket === 'None' || !cluster || cluster === 'None')
  throw new Error('Production foundation outputs are unavailable.');
const work = mkdtempSync(join(tmpdir(), 'voomate-release-'));
try {
  const tags = liveTags(cluster);
  if (selectedServices.length) {
    const archive = join(work, 'source.zip');
    run('git', ['archive', '--format=zip', '--output', archive, 'HEAD']);
    // Each build gets its own immutable archive. This prevents a second release from changing
    // the input while an earlier CodeBuild project is queued or still downloading source.
    const sourceKey = `releases/${releaseTag}.zip`;
    run('aws', ['s3', 'cp', archive, `s3://${bucket}/${sourceKey}`, '--sse', 'AES256']);
    const builds = selectedServices.map((service) => {
      const response = JSON.parse(
        read('aws', [
          'codebuild',
          'start-build',
          '--project-name',
          `voomate-prod-${service}-image-build`,
          '--source-type-override',
          'S3',
          '--source-location-override',
          `${bucket}/${sourceKey}`,
          '--environment-variables-override',
          `name=IMAGE_TAG,value=${releaseTag},type=PLAINTEXT`,
          '--output',
          'json',
        ]),
      );
      const id = response.build?.id;
      if (!id) throw new Error(`CodeBuild did not start the ${service} image.`);
      return id;
    });
    await Promise.all(builds.map(waitForBuild));
    for (const service of selectedServices) tags[service] = releaseTag;
  }
  if (selectedServices.length || infrastructureChanged) {
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
  }
  if (landingChanged)
    run(
      'npx',
      [
        'cdk',
        'deploy',
        'Voomate-prod-LandingDelivery',
        '-c',
        'stage=prod',
        '-c',
        `apiImageTag=${tags.api}`,
        '-c',
        `dashboardImageTag=${tags.dashboard}`,
        '-c',
        `voiceImageTag=${tags.voice}`,
        '--require-approval',
        'never',
      ],
      { cwd: new URL('../infra/', import.meta.url) },
    );
} finally {
  rmSync(work, { recursive: true, force: true });
}
