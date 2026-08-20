#!/usr/bin/env node
/**
 * Upload a secret-free source archive and ask AWS CodeBuild to produce the three release images.
 * Images are built wholly inside the customer's AWS account; Docker Desktop is never required.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });
const read = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();

const bucket = read('aws', [
  'cloudformation', 'describe-stacks', '--stack-name', 'Voomate-prod-ApplicationFoundation',
  '--query', "Stacks[0].Outputs[?OutputKey=='ReleaseSourceBucketName'].OutputValue | [0]", '--output', 'text',
]);
if (!bucket || bucket === 'None') throw new Error('AWS release source bucket is not available. Deploy the foundation stack first.');

const work = mkdtempSync(join(tmpdir(), 'voomate-release-'));
const archive = join(work, 'current.zip');
try {
  run('git', ['archive', '--format=zip', '--output', archive, 'HEAD']);
  run('aws', ['s3', 'cp', archive, `s3://${bucket}/releases/current.zip`, '--sse', 'AES256']);
  for (const service of ['api', 'dashboard', 'voice']) {
    run('aws', ['codebuild', 'start-build', '--project-name', `voomate-prod-${service}-image-build`, '--environment-variables-override', 'name=IMAGE_TAG,value=candidate,type=PLAINTEXT']);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
