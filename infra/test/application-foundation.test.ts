import assert from 'node:assert/strict';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApplicationFoundationStack } from '../lib/application-foundation-stack.js';
import { resolveImageTag, resolveImageTags, resolveStage } from '../lib/config.js';

const synth = () => {
  const app = new App();
  const stack = new ApplicationFoundationStack(app, 'FoundationUnderTest', {
    env: { account: '123456789012', region: 'us-east-1' },
    config: resolveStage('prod'),
    imageTags: {
      api: 'a8a9382c0ffe',
      dashboard: 'b8a9382c0ffe',
      voice: 'c8a9382c0ffe',
    },
  });
  return Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>;
  };
};

const taskDefinition = (
  template: ReturnType<typeof synth>,
  containerName: string,
): Record<string, unknown> => {
  const resource = Object.values(template.Resources).find((candidate) => {
    if (candidate.Type !== 'AWS::ECS::TaskDefinition') return false;
    const definitions = candidate.Properties?.ContainerDefinitions;
    return (
      Array.isArray(definitions) &&
      definitions.some(
        (definition) =>
          typeof definition === 'object' &&
          definition !== null &&
          (definition as { Name?: unknown }).Name === containerName,
      )
    );
  });
  assert.ok(resource?.Properties, `Missing ${containerName} task definition.`);
  return resource.Properties;
};

const secretNames = (task: Record<string, unknown>): string[] => {
  const definitions = task.ContainerDefinitions;
  assert.ok(Array.isArray(definitions));
  const [definition] = definitions as Array<{ Secrets?: Array<{ Name?: string }> }>;
  return (definition?.Secrets ?? []).flatMap(({ Name }) => (Name ? [Name] : []));
};

const taskRoleArn = (task: Record<string, unknown>): unknown => task.TaskRoleArn;

const policiesForTaskRole = (
  template: ReturnType<typeof synth>,
  task: Record<string, unknown>,
): string => {
  const roleArn = taskRoleArn(task) as { 'Fn::GetAtt'?: unknown };
  assert.ok(Array.isArray(roleArn['Fn::GetAtt']));
  const [logicalId] = roleArn['Fn::GetAtt'] as unknown[];
  assert.equal(typeof logicalId, 'string');
  return JSON.stringify(
    Object.values(template.Resources).filter(
      (resource) =>
        resource.Type === 'AWS::IAM::Policy' &&
        JSON.stringify(resource.Properties?.Roles).includes(logicalId),
    ),
  );
};

test('production image tags are immutable and explicit', () => {
  assert.equal(resolveImageTag('dev', undefined), 'candidate');
  assert.equal(resolveImageTag('prod', 'a8a9382c0ffe'), 'a8a9382c0ffe');
  assert.throws(() => resolveImageTag('prod', undefined), /immutable imageTag/);
  assert.throws(() => resolveImageTag('prod', 'contains spaces'), /valid ECR tag/);

  assert.deepEqual(resolveImageTags('prod', { dashboard: 'dashboard-commit' }, 'shared-commit'), {
    api: 'shared-commit',
    dashboard: 'dashboard-commit',
    voice: 'shared-commit',
  });
});

test('each service task definition keeps its independently promoted image tag', () => {
  const template = synth();
  const imageFor = (container: string) => {
    const definitions = taskDefinition(template, container).ContainerDefinitions;
    assert.ok(Array.isArray(definitions));
    const definition = (definitions as Array<{ Image?: unknown }>)[0];
    assert.ok(definition?.Image, `Missing image for ${container}.`);
    // CDK represents the ECR registry portion as a CloudFormation intrinsic, while the
    // immutable tag remains in the serialized image value.
    return JSON.stringify(definition.Image);
  };

  assert.match(imageFor('api'), /:a8a9382c0ffe/);
  assert.match(imageFor('dashboard'), /:b8a9382c0ffe/);
  assert.match(imageFor('voice'), /:c8a9382c0ffe/);
});

test('public routing preserves Dashboard widget handlers and redirects HTTP', () => {
  const template = synth();
  const serialized = JSON.stringify(template);
  assert.doesNotMatch(serialized, /"\/api\/\*"/);

  const listeners = Object.values(template.Resources).filter(
    (resource) => resource.Type === 'AWS::ElasticLoadBalancingV2::Listener',
  );
  const http = listeners.find((listener) => listener.Properties?.Port === 80);
  assert.deepEqual(http?.Properties?.DefaultActions, [
    {
      RedirectConfig: {
        Port: '443',
        Protocol: 'HTTPS',
        StatusCode: 'HTTP_301',
      },
      Type: 'redirect',
    },
  ]);
  assert.match(serialized, /"\/v1\/\*"/);
  assert.match(serialized, /AWSManagedRulesCommonRuleSet/);
  assert.match(serialized, /AWSManagedRulesKnownBadInputsRuleSet/);
  assert.match(serialized, /DashboardWidgetSessionRateLimit/);
  assert.match(serialized, /ApiWidgetSessionRateLimit/);
  assert.match(serialized, /"\/api\/web-agent\/session"/);
  assert.match(serialized, /"\/v1\/widget\/session"/);
  assert.match(serialized, /bedrock:InvokeInlineAgent/);
  assert.doesNotMatch(serialized, /foundation-model\/\*/);
});

test('Dashboard and voice tasks receive the runtime credentials they require', () => {
  const template = synth();
  assert.ok(secretNames(taskDefinition(template, 'dashboard')).includes('WIDGET_TOKEN_SECRET'));

  const voiceSecrets = secretNames(taskDefinition(template, 'voice'));
  for (const name of [
    'WIDGET_TOKEN_SECRET',
    'WEB_AGENT_BACKEND_ORIGIN',
    'POLLY_ENGINE',
    'POLLY_VOICE_ID',
    'VOICE_LANGUAGE',
    'TRANSCRIBE_VOCABULARY_NAME',
  ]) {
    assert.ok(voiceSecrets.includes(name), `Voice task is missing ${name}.`);
  }
});

test('each runtime service receives a distinct least-privilege task role', () => {
  const template = synth();
  const apiTask = taskDefinition(template, 'api');
  const dashboardTask = taskDefinition(template, 'dashboard');
  const voiceTask = taskDefinition(template, 'voice');
  const apiRole = taskRoleArn(apiTask);
  const dashboardRole = taskRoleArn(dashboardTask);
  const voiceRole = taskRoleArn(voiceTask);

  assert.notDeepEqual(apiRole, dashboardRole);
  assert.notDeepEqual(apiRole, voiceRole);
  assert.notDeepEqual(dashboardRole, voiceRole);

  const serialized = JSON.stringify(template);
  assert.match(serialized, /Least-privilege ECS task role for the Voomate API service/);
  assert.match(serialized, /Least-privilege ECS task role for the Voomate Dashboard service/);
  assert.match(serialized, /Least-privilege ECS task role for the Voomate Voice service/);
  assert.doesNotMatch(serialized, /ApplicationTaskRole/);

  const apiPolicies = policiesForTaskRole(template, apiTask);
  const dashboardPolicies = policiesForTaskRole(template, dashboardTask);
  const voicePolicies = policiesForTaskRole(template, voiceTask);
  assert.match(apiPolicies, /bedrock:InvokeModel/);
  assert.match(apiPolicies, /chime:CreateMeeting/);
  assert.match(dashboardPolicies, /bedrock:InvokeInlineAgent/);
  assert.match(voicePolicies, /polly:SynthesizeSpeech/);
  assert.match(voicePolicies, /transcribe:StartStreamTranscription/);
  assert.doesNotMatch(dashboardPolicies, /polly:|transcribe:|chime:/);
  assert.doesNotMatch(voicePolicies, /bedrock:|chime:/);
  for (const policies of [apiPolicies, dashboardPolicies, voicePolicies]) {
    assert.doesNotMatch(policies, /secretsmanager:GetSecretValue/);
  }
});
