import assert from 'node:assert/strict';
import test from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { AwsDataPlaneStack } from '../lib/aws-data-plane-stack.js';
import { resolveStage } from '../lib/config.js';

test('AWS-only data plane is private, retained, and inactive until cutover', () => {
  const app = new App();
  const config = resolveStage('prod');
  const networkStack = new Stack(app, 'DataVpcStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const dataVpc = new ec2.Vpc(networkStack, 'DataVpc', {
    maxAzs: 2,
    natGateways: 0,
    subnetConfiguration: [
      { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
      { name: 'private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    ],
  });
  const taskSecurityGroup = new ec2.SecurityGroup(networkStack, 'TaskSecurityGroup', {
    vpc: dataVpc,
    allowAllOutbound: true,
  });
  const stack = new AwsDataPlaneStack(app, 'DataPlaneUnderTest', {
    env: { account: '123456789012', region: 'us-east-1' },
    config,
    vpc: dataVpc,
    taskSecurityGroup,
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
