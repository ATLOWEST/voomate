#!/usr/bin/env node
/**
 * Upload a secret-free source archive and ask AWS CodeBuild to produce the three release images.
 * Images are built wholly inside the customer's AWS account; Docker Desktop is never required.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url);
const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit', ...options });
const read = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: repoRoot, encoding: 'utf8', ...options }).trim();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForBuild = async (id) => {
  for (;;) {
    const response = JSON.parse(
      read('aws', ['codebuild', 'batch-get-builds', '--ids', id, '--output', 'json']),
    );
    const [build] = response.builds ?? [];
    if (!build) throw new Error(`CodeBuild did not return build ${id}.`);
    if (build.buildStatus === 'SUCCEEDED') return;
    if (['FAILED', 'FAULT', 'STOPPED', 'TIMED_OUT'].includes(build.buildStatus)) {
      throw new Error(`CodeBuild ${id} ended with ${build.buildStatus}.`);
    }
    await sleep(5_000);
  }
};

const releaseTag = read('git', ['rev-parse', '--short=12', 'HEAD']);
if (read('git', ['status', '--porcelain'])) {
  throw new Error(
    'Refusing a production release from a dirty worktree. Commit or stash every change first.',
  );
}

const bucket = read('aws', [
  'cloudformation',
  'describe-stacks',
  '--stack-name',
  'Voomate-prod-ApplicationFoundation',
  '--query',
  "Stacks[0].Outputs[?OutputKey=='ReleaseSourceBucketName'].OutputValue | [0]",
  '--output',
  'text',
]);
if (!bucket || bucket === 'None')
  throw new Error('AWS release source bucket is not available. Deploy the foundation stack first.');

const work = mkdtempSync(join(tmpdir(), 'voomate-release-'));
const archive = join(work, 'current.zip');
try {
  run('git', ['archive', '--format=zip', '--output', archive, 'HEAD']);
  run('aws', ['s3', 'cp', archive, `s3://${bucket}/releases/current.zip`, '--sse', 'AES256']);
  const buildIds = ['api', 'dashboard', 'voice'].map((service) => {
    const response = JSON.parse(
      read('aws', [
        'codebuild',
        'start-build',
        '--project-name',
        `voomate-prod-${service}-image-build`,
        '--environment-variables-override',
        `name=IMAGE_TAG,value=${releaseTag},type=PLAINTEXT`,
        '--output',
        'json',
      ]),
    );
    const id = response.build?.id;
    if (typeof id !== 'string') throw new Error(`CodeBuild did not start the ${service} image.`);
    return id;
  });
  await Promise.all(buildIds.map(waitForBuild));

  // Clean cdk.out to prevent stale CLI lock collisions
  try {
    rmSync(new URL('../infra/cdk.out', import.meta.url), { recursive: true, force: true });
    rmSync(new URL('../cdk.out', import.meta.url), { recursive: true, force: true });
  } catch {}

  // CloudFormation, rather than an imperative ECS update, owns the promoted task definitions.
  // That preserves rollback history and prevents the next infra deploy from silently undoing a
  // release. The tag is immutable because every image is tied to this exact git commit.
  run(
    'npx',
    [
      'cdk',
      'deploy',
      'Voomate-prod-ApplicationFoundation',
      '-c',
      'stage=prod',
      '-c',
      `imageTag=${releaseTag}`,
      '-c',
      'deployDataPlane=false',
      '--require-approval',
      'never',
    ],
    { cwd: new URL('../infra/', import.meta.url) },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
