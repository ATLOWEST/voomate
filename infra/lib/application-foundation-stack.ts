import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface ApplicationFoundationStackProps extends StackProps {
  readonly config: StageConfig;
}

/**
 * Shared runtime resources for every AWS-hosted Voomate application service.
 *
 * There is intentionally no public ingress rule in this stack. Containers can reach the
 * internet for Supabase, Upstash and AWS APIs, but nobody can reach a container directly.
 * Cloudflare is connected later as the single controlled ingress once its tunnel/DNS permission
 * and the database isolation gate have both passed.
 */
export class ApplicationFoundationStack extends Stack {
  readonly cluster: ecs.Cluster;
  readonly namespace: servicediscovery.PrivateDnsNamespace;
  readonly taskSecurityGroup: ec2.SecurityGroup;
  readonly runtimeSecret: secretsmanager.Secret;
  readonly releaseBucket: s3.Bucket;
  readonly repositories: Record<'api' | 'dashboard' | 'voice', ecr.Repository>;

  constructor(scope: Construct, id: string, props: ApplicationFoundationStackProps) {
    super(scope, id, props);

    // Public subnets avoid a permanent NAT Gateway charge. Task security groups admit no
    // inbound traffic, so a public address does not make a service public.
    const vpc = new ec2.Vpc(this, 'RuntimeVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'egress', subnetType: ec2.SubnetType.PUBLIC }],
    });

    this.taskSecurityGroup = new ec2.SecurityGroup(this, 'ApplicationTasksSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description:
        'Voomate application tasks: outbound only until private Cloudflare ingress is attached',
    });

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    this.namespace = new servicediscovery.PrivateDnsNamespace(this, 'PrivateNamespace', {
      name: `voomate-${props.config.stage}.internal`,
      vpc,
      description: 'Private service discovery for Voomate AWS containers',
    });

    // One encrypted JSON document per stage. ECS grants each task only read access to this
    // secret; no AWS access key is ever copied into a container.
    this.runtimeSecret = new secretsmanager.Secret(this, 'RuntimeConfiguration', {
      secretName: `voomate/${props.config.stage}/runtime`,
      description: 'Encrypted Voomate runtime configuration injected by ECS',
      generateSecretString: { secretStringTemplate: '{}', generateStringKey: 'bootstrap' },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.releaseBucket = new s3.Bucket(this, 'ReleaseSourceBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        { id: 'retain-recent-release-sources', noncurrentVersionExpiration: Duration.days(30) },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.repositories = {} as Record<'api' | 'dashboard' | 'voice', ecr.Repository>;
    for (const service of ['api', 'dashboard', 'voice'] as const) {
      const resourceName = `${service.charAt(0).toUpperCase()}${service.slice(1)}`;
      this.repositories[service] = new ecr.Repository(this, `${resourceName}Repository`, {
        repositoryName: `voomate-${props.config.stage}-${service}`,
        imageScanOnPush: true,
        imageTagMutability: ecr.TagMutability.IMMUTABLE,
        encryption: ecr.RepositoryEncryption.AES_256,
        lifecycleRules: [
          { description: 'Keep the latest twenty release images', maxImageCount: 20 },
        ],
        removalPolicy: RemovalPolicy.RETAIN,
      });

      new logs.LogGroup(this, `${resourceName}LogGroup`, {
        logGroupName: `/voomate/${props.config.stage}/${service}`,
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.RETAIN,
      });
    }

    new CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });
    new CfnOutput(this, 'PrivateNamespaceName', { value: this.namespace.namespaceName });
    new CfnOutput(this, 'RuntimeSecretArn', {
      value: this.runtimeSecret.secretArn,
      description: 'Populate this encrypted secret before enabling any ECS service',
    });
    new CfnOutput(this, 'VpcId', { value: vpc.vpcId });
    new CfnOutput(this, 'TaskSecurityGroupId', { value: this.taskSecurityGroup.securityGroupId });
    new CfnOutput(this, 'ReleaseSourceBucketName', { value: this.releaseBucket.bucketName });
  }
}
