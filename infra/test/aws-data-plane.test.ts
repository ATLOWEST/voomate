import assert from 'node:assert/strict';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApplicationFoundationStack } from '../lib/application-foundation-stack.js';
import { AwsDataPlaneStack } from '../lib/aws-data-plane-stack.js';
import { resolveStage } from '../lib/config.js';

test('AWS-only data plane is private, retained, and inactive until cutover', () => {
  const app = new App();
  const config = resolveStage('prod');
  const foundation = new ApplicationFoundationStack(app, 'FoundationForDataPlane', {
    env: { account: '123456789012', region: 'us-east-1' },
    config,
    imageTag: 'a8a9382c0ffe',
  });
  const stack = new AwsDataPlaneStack(app, 'DataPlaneUnderTest', {
    env: { account: '123456789012', region: 'us-east-1' },
    config,
    vpc: foundation.vpc,
    taskSecurityGroup: foundation.taskSecurityGroup,
  });
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>;
  };
  const serialized = JSON.stringify(template);

  assert.match(serialized, /AWS::RDS::DBCluster/);
  assert.match(serialized, /aurora-postgresql/);
  assert.match(serialized, /db\.serverless/);
  assert.match(serialized, /"DeletionProtection":true/);
  assert.match(serialized, /AWS::ElastiCache::ServerlessCache/);
  assert.match(serialized, /"Engine":"valkey"/);
  assert.match(serialized, /AWS::Cognito::UserPool/);
  assert.match(serialized, /"AllowAdminCreateUserOnly":true/);
  assert.match(serialized, /voomate\/prod\/api\/runtime/);
  assert.match(serialized, /voomate\/prod\/dashboard\/runtime/);
  assert.match(serialized, /voomate\/prod\/voice\/runtime/);
  assert.doesNotMatch(serialized, /SUPABASE_|UPSTASH_/);
});
