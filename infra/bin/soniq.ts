#!/usr/bin/env tsx
import { App, Tags } from 'aws-cdk-lib';
import { resolveStage } from '../lib/config.js';
import { KnowledgeStack } from '../lib/knowledge-stack.js';
import { RuntimeStack } from '../lib/runtime-stack.js';
import { StorageStack } from '../lib/storage-stack.js';

const app = new App();
const config = resolveStage(app.node.tryGetContext('stage') as string | undefined);

const env = { region: config.region };
const prefix = `Soniq-${config.stage}`;

const storage = new StorageStack(app, `${prefix}-Storage`, { env, config });

const knowledge = new KnowledgeStack(app, `${prefix}-Knowledge`, {
  env,
  config,
  knowledgeBucket: storage.knowledgeBucket,
});

new RuntimeStack(app, `${prefix}-Runtime`, {
  env,
  config,
  knowledgeBucket: storage.knowledgeBucket,
  knowledgeBaseCollectionArn: knowledge.collection.attrArn,
});

// Cost allocation by stage. Voice is expensive enough that "what did dev cost us" is a
// question someone will ask in the first month.
Tags.of(app).add('Project', 'soniq');
Tags.of(app).add('Stage', config.stage);
