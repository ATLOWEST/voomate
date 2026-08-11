#!/usr/bin/env tsx
import { App, Tags } from 'aws-cdk-lib';
import { resolveStage } from '../lib/config.js';
import { RuntimeStack } from '../lib/runtime-stack.js';
import { StorageStack } from '../lib/storage-stack.js';

const app = new App();
const config = resolveStage(app.node.tryGetContext('stage') as string | undefined);

const env = { region: config.region };
const prefix = `Voomate-${config.stage}`;

const storage = new StorageStack(app, `${prefix}-Storage`, { env, config });

new RuntimeStack(app, `${prefix}-Runtime`, {
  env,
  config,
  knowledgeBucket: storage.knowledgeBucket,
});

// There is no knowledge stack. Vectors live in Supabase Postgres, which is not an AWS
// resource and therefore not CloudFormation's to manage — see docs/adr/0005-supabase-pgvector.md.

// Cost allocation by stage. Voice is expensive enough that "what did dev cost us" is a
// question someone will ask in the first month.
Tags.of(app).add('Project', 'voomate');
Tags.of(app).add('Stage', config.stage);
