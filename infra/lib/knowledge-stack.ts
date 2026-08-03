import { Stack, type StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as oss from 'aws-cdk-lib/aws-opensearchserverless';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface KnowledgeStackProps extends StackProps {
  readonly config: StageConfig;
  readonly knowledgeBucket: s3.IBucket;
}

/**
 * Retrieval infrastructure.
 *
 * One OpenSearch Serverless collection for the whole platform, with one Bedrock Knowledge
 * Base *per tenant* created at runtime by the control plane — not here. Tenants arrive and
 * leave continuously; encoding them as CloudFormation resources would mean a stack deploy per
 * signup. See docs/adr/0001-bedrock-knowledge-bases.md.
 *
 * The isolation guarantee therefore comes from two places:
 *   - each KB has its own vector index inside the shared collection, and
 *   - the KB's data source is scoped to a single S3 prefix.
 *
 * Neither is enforced by this stack. Both are enforced by the control plane, which is why
 * the knowledge-base ID is stored on the agent row and every query reads it from there.
 */
export class KnowledgeStack extends Stack {
  readonly collection: oss.CfnCollection;
  readonly bedrockRole: iam.Role;

  constructor(scope: Construct, id: string, props: KnowledgeStackProps) {
    super(scope, id, props);

    const collectionName = `soniq-kb-${props.config.stage}`;

    // Encryption policy must exist before the collection or creation fails.
    const encryption = new oss.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: `${collectionName}-enc`,
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [{ ResourceType: 'collection', Resource: [`collection/${collectionName}`] }],
        AWSOwnedKey: true,
      }),
    });

    // No public network access. Bedrock reaches the collection over the AWS network, and
    // nothing else needs to reach it at all.
    const network = new oss.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: `${collectionName}-net`,
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            { ResourceType: 'collection', Resource: [`collection/${collectionName}`] },
            { ResourceType: 'dashboard', Resource: [`collection/${collectionName}`] },
          ],
          AllowFromPublic: false,
          SourceServices: ['bedrock.amazonaws.com'],
        },
      ]),
    });

    this.collection = new oss.CfnCollection(this, 'Collection', {
      name: collectionName,
      type: 'VECTORSEARCH',
      description: 'Per-tenant vector indexes for Bedrock Knowledge Bases',
    });
    this.collection.addResourceDependency(encryption);
    this.collection.addResourceDependency(network);

    this.bedrockRole = new iam.Role(this, 'BedrockKnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com', {
        // Without this condition, any account able to name our role ARN could have Bedrock
        // assume it on their behalf — the confused-deputy problem.
        conditions: {
          StringEquals: { 'aws:SourceAccount': this.account },
          ArnLike: {
            'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/*`,
          },
        },
      }),
      description: 'Assumed by Bedrock Knowledge Bases to read crawled content and write vectors',
    });

    props.knowledgeBucket.grantRead(this.bedrockRole);

    this.bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['aoss:APIAccessAll'],
        resources: [this.collection.attrArn],
      }),
    );

    this.bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        // Embedding only. The KB role must not be able to invoke the chat model — that is a
        // separate role with a separate blast radius.
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    );

    new oss.CfnAccessPolicy(this, 'DataAccessPolicy', {
      name: `${collectionName}-access`,
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
              Permission: ['aoss:CreateCollectionItems', 'aoss:DescribeCollectionItems'],
            },
            {
              ResourceType: 'index',
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
                'aoss:UpdateIndex',
                'aoss:DeleteIndex',
              ],
            },
          ],
          Principal: [this.bedrockRole.roleArn],
        },
      ]),
    });
  }
}
