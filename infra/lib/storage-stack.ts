import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface StorageStackProps extends StackProps {
  readonly config: StageConfig;
}

/**
 * Buckets.
 *
 * `knowledgeBucket` holds crawled page text, one prefix per tenant. Bedrock Knowledge Bases
 * ingests from here, which is why the layout is `tenant/{organizationId}/{agentId}/…` — the
 * prefix *is* the isolation boundary for the KB data source, and IAM policies scope to it.
 */
export class StorageStack extends Stack {
  readonly knowledgeBucket: s3.Bucket;
  readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const removalPolicy = props.config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    this.knowledgeBucket = new s3.Bucket(this, 'KnowledgeBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy,
      autoDeleteObjects: !props.config.retainData,
      lifecycleRules: [
        {
          // A re-crawl rewrites every page. Without expiry the bucket grows without bound at
          // the crawl cadence, and superseded versions are never read again.
          id: 'expire-superseded-crawls',
          noncurrentVersionExpiration: Duration.days(30),
        },
      ],
    });

    // Widget loader and iframe app. Public reads happen through CloudFront with OAC, never
    // directly from the bucket.
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Bucket names are generated, so without these the only way to fill CRAWL_ARCHIVE_BUCKET is
    // to go looking in the console — which is exactly the kind of manual step that ends up
    // transcribed wrongly into one environment and not at all into the next.
    new CfnOutput(this, 'KnowledgeBucketName', {
      value: this.knowledgeBucket.bucketName,
      description: 'Set as CRAWL_ARCHIVE_BUCKET',
      exportName: `${this.stackName}-KnowledgeBucket`,
    });

    new CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'Widget loader and iframe app, served via CloudFront',
      exportName: `${this.stackName}-AssetsBucket`,
    });
  }
}
