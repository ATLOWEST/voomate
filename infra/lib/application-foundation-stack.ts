import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
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
 * Application containers accept traffic only from the production load balancer. The load
 * balancer terminates TLS for the public service hostnames and keeps task addresses private.
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
      description: 'Voomate application tasks: inbound only from the production load balancer',
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
    const logGroups = {} as Record<'api' | 'dashboard' | 'voice', logs.LogGroup>;
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

      logGroups[service] = new logs.LogGroup(this, `${resourceName}LogGroup`, {
        logGroupName: `/voomate/${props.config.stage}/${service}`,
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.RETAIN,
      });
    }

    // Task Role with Bedrock, Polly, Transcribe, and Chime permissions
    const taskRole = new iam.Role(this, 'ApplicationTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'ECS Task role for Voomate API and Voice services',
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/*`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
        ],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech', 'polly:DescribeVoices'],
        resources: ['*'],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'transcribe:StartStreamTranscription',
          'transcribe:StartStreamTranscriptionWebSocket',
        ],
        resources: ['*'],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'chime:CreateMeeting',
          'chime:DeleteMeeting',
          'chime:GetMeeting',
          'chime:CreateAttendee',
          'chime:DeleteAttendee',
        ],
        resources: ['*'],
      }),
    );

    this.runtimeSecret.grantRead(taskRole);

    // 1. Control-plane Fastify API Service
    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole,
    });
    this.runtimeSecret.grantRead(apiTaskDef.obtainExecutionRole());

    apiTaskDef.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(this.repositories.api, 'candidate'),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroups.api,
        streamPrefix: 'api',
      }),
      secrets: {
        NODE_ENV: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'NODE_ENV'),
        LOG_LEVEL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'LOG_LEVEL'),
        API_PORT: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'API_PORT'),
        API_HOST: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'API_HOST'),
        API_CORS_ORIGINS: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'API_CORS_ORIGINS'),
        SUPABASE_URL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'SUPABASE_URL'),
        SUPABASE_ANON_KEY: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'SUPABASE_ANON_KEY'),
        SUPABASE_SERVICE_ROLE_KEY: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'SUPABASE_SERVICE_ROLE_KEY',
        ),
        DATABASE_URL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'DATABASE_URL'),
        BEDROCK_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_REGION'),
        BEDROCK_MODEL_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_MODEL_ID'),
        BEDROCK_UTILITY_MODEL_ID: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'BEDROCK_UTILITY_MODEL_ID',
        ),
        EMBEDDING_MODEL_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'EMBEDDING_MODEL_ID'),
        EMBEDDING_DIMENSIONS: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'EMBEDDING_DIMENSIONS',
        ),
        TRANSCRIBE_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'TRANSCRIBE_REGION'),
        POLLY_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'POLLY_REGION'),
        POLLY_PREFERRED_ENGINE: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'POLLY_PREFERRED_ENGINE',
        ),
        CHIME_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'CHIME_REGION'),
        CHIME_MEDIA_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'CHIME_MEDIA_REGION'),
        WIDGET_TOKEN_SECRET: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'WIDGET_TOKEN_SECRET',
        ),
        WIDGET_TOKEN_TTL_SECONDS: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'WIDGET_TOKEN_TTL_SECONDS',
        ),
        WIDGET_ORIGIN: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'WIDGET_ORIGIN'),
        UPSTASH_REDIS_REST_URL: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'UPSTASH_REDIS_REST_URL',
        ),
        UPSTASH_REDIS_REST_TOKEN: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'UPSTASH_REDIS_REST_TOKEN',
        ),
      },
      portMappings: [{ containerPort: 4000 }],
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      serviceName: `voomate-${props.config.stage}-api`,
      cluster: this.cluster,
      taskDefinition: apiTaskDef,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      securityGroups: [this.taskSecurityGroup],
      assignPublicIp: true,
      cloudMapOptions: {
        name: 'api',
        cloudMapNamespace: this.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    // 2. Next.js Dashboard Service
    const dashboardTaskDef = new ecs.FargateTaskDefinition(this, 'DashboardTaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole,
    });
    this.runtimeSecret.grantRead(dashboardTaskDef.obtainExecutionRole());

    dashboardTaskDef.addContainer('dashboard', {
      image: ecs.ContainerImage.fromEcrRepository(this.repositories.dashboard, 'ad36f65'),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroups.dashboard,
        streamPrefix: 'dashboard',
      }),
      secrets: {
        NODE_ENV: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'NODE_ENV'),
        NEXT_PUBLIC_SUPABASE_URL: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'NEXT_PUBLIC_SUPABASE_URL',
        ),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        ),
        SUPABASE_SERVICE_ROLE_KEY: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'SUPABASE_SERVICE_ROLE_KEY',
        ),
        DATABASE_URL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'DATABASE_URL'),
        BEDROCK_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_REGION'),
        BEDROCK_MODEL_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_MODEL_ID'),
        UPSTASH_REDIS_REST_URL: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'UPSTASH_REDIS_REST_URL',
        ),
        UPSTASH_REDIS_REST_TOKEN: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'UPSTASH_REDIS_REST_TOKEN',
        ),
        WIDGET_ORIGIN: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'WIDGET_ORIGIN'),
        NEXT_PUBLIC_WIDGET_ORIGIN: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'NEXT_PUBLIC_WIDGET_ORIGIN',
        ),
        NEXT_PUBLIC_API_URL: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'NEXT_PUBLIC_API_URL',
        ),
        INTERNAL_API_URL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'INTERNAL_API_URL'),
        VOICE_SERVICE_ORIGIN: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'VOICE_SERVICE_ORIGIN',
        ),
      },
      portMappings: [{ containerPort: 3001 }],
    });

    const dashboardService = new ecs.FargateService(this, 'DashboardService', {
      serviceName: `voomate-${props.config.stage}-dashboard`,
      cluster: this.cluster,
      taskDefinition: dashboardTaskDef,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      securityGroups: [this.taskSecurityGroup],
      assignPublicIp: true,
      cloudMapOptions: {
        name: 'dashboard',
        cloudMapNamespace: this.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    // 3. Pipecat Voice Service
    const voiceTaskDef = new ecs.FargateTaskDefinition(this, 'VoiceTaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole,
    });
    this.runtimeSecret.grantRead(voiceTaskDef.obtainExecutionRole());

    voiceTaskDef.addContainer('voice', {
      image: ecs.ContainerImage.fromEcrRepository(this.repositories.voice, 'candidate'),
      command: [
        '/app/.venv/bin/python',
        'bot.py',
        '--transport',
        'webrtc',
        '--host',
        '0.0.0.0',
        '--port',
        '7860',
      ],
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroups.voice,
        streamPrefix: 'voice',
      }),
      secrets: {
        BEDROCK_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_REGION'),
        BEDROCK_MODEL_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_MODEL_ID'),
        POLLY_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'POLLY_REGION'),
        POLLY_PREFERRED_ENGINE: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'POLLY_PREFERRED_ENGINE',
        ),
        TRANSCRIBE_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'TRANSCRIBE_REGION'),
      },
      portMappings: [{ containerPort: 7860 }],
    });

    const voiceService = new ecs.FargateService(this, 'VoiceService', {
      serviceName: `voomate-${props.config.stage}-voice`,
      cluster: this.cluster,
      taskDefinition: voiceTaskDef,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      securityGroups: [this.taskSecurityGroup],
      assignPublicIp: true,
      cloudMapOptions: {
        name: 'voice',
        cloudMapNamespace: this.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    // Public Application Load Balancer for Direct Browser and Edge Ingress
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Public ingress for Voomate Application Load Balancer',
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow public HTTP');
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow public HTTPS');

    this.taskSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3001),
      'Allow ALB to Dashboard',
    );
    this.taskSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(4000), 'Allow ALB to API');
    this.taskSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(7860),
      'Allow ALB to Voice Edge',
    );

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      loadBalancerName: `voomate-${props.config.stage}-alb`,
    });

    const dashboardTargetGroup = new elbv2.ApplicationTargetGroup(this, 'DashboardTargetGroup', {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targets: [
        dashboardService.loadBalancerTarget({
          containerName: 'dashboard',
          containerPort: 3001,
        }),
      ],
      healthCheck: {
        path: '/sign-in',
        healthyHttpCodes: '200,307,308',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTargetGroup', {
      vpc,
      port: 4000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targets: [
        apiService.loadBalancerTarget({
          containerName: 'api',
          containerPort: 4000,
        }),
      ],
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    const voiceTargetGroup = new elbv2.ApplicationTargetGroup(this, 'VoiceTargetGroup', {
      vpc,
      port: 7860,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targets: [
        voiceService.loadBalancerTarget({
          containerName: 'voice',
          containerPort: 7860,
        }),
      ],
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200,307,308',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Plain HTTP never serves application traffic.
    alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // The wildcard certificate is DNS-validated in the authoritative Vercel zone.
    const albCertificate = acm.Certificate.fromCertificateArn(
      this,
      'AlbCertificate',
      'arn:aws:acm:us-east-1:424999960818:certificate/6c534b6a-8979-4bff-8592-ce67f19a767f',
    );

    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      open: true,
      certificates: [albCertificate],
      defaultTargetGroups: [dashboardTargetGroup],
    });

    httpsListener.addAction('ApiRoutingHttps', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.hostHeaders(['api.atlowest.in'])],
      action: elbv2.ListenerAction.forward([apiTargetGroup]),
    });

    httpsListener.addAction('VoiceRoutingHttps', {
      priority: 20,
      conditions: [elbv2.ListenerCondition.hostHeaders(['voice.atlowest.in'])],
      action: elbv2.ListenerAction.forward([voiceTargetGroup]),
    });

    new CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });
    new CfnOutput(this, 'PrivateNamespaceName', { value: this.namespace.namespaceName });
    new CfnOutput(this, 'RuntimeSecretArn', {
      value: this.runtimeSecret.secretArn,
      description: 'Populate this encrypted secret before enabling any ECS service',
    });
    new CfnOutput(this, 'VpcId', { value: vpc.vpcId });
    new CfnOutput(this, 'TaskSecurityGroupId', { value: this.taskSecurityGroup.securityGroupId });
    new CfnOutput(this, 'ReleaseSourceBucketName', { value: this.releaseBucket.bucketName });
    new CfnOutput(this, 'ApiServiceArn', { value: apiService.serviceArn });
    new CfnOutput(this, 'DashboardServiceArn', { value: dashboardService.serviceArn });
    new CfnOutput(this, 'VoiceServiceArn', { value: voiceService.serviceArn });
    new CfnOutput(this, 'LoadBalancerDnsName', {
      value: alb.loadBalancerDnsName,
      description: 'Public AWS DNS name for the Application Load Balancer',
    });
    new CfnOutput(this, 'DashboardUrl', {
      value: 'https://dashboard.atlowest.in',
      description: 'Production dashboard URL',
    });
  }
}
