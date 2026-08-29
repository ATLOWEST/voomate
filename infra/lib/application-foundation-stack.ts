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
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';
import type { ImageTags, StageConfig } from './config.js';

interface ApplicationFoundationStackProps extends StackProps {
  readonly config: StageConfig;
  /** Immutable ECR tags promoted independently by the release script. */
  readonly imageTags: ImageTags;
}

/**
 * Shared runtime resources for every AWS-hosted Voomate application service.
 *
 * Application containers accept traffic only from the production load balancer. The load
 * balancer terminates TLS for the public service hostnames and keeps task addresses private.
 */
export class ApplicationFoundationStack extends Stack {
  readonly vpc: ec2.Vpc;
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
    this.vpc = new ec2.Vpc(this, 'RuntimeVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'egress', subnetType: ec2.SubnetType.PUBLIC }],
    });
    const vpc = this.vpc;

    this.taskSecurityGroup = new ec2.SecurityGroup(this, 'ApplicationTasksSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Voomate application tasks: inbound only from the production load balancer',
    });
    // The dashboard proxies browser `/api/*` requests to the private API service discovered
    // through Cloud Map. Both services use this task group, so the dashboard must be able to
    // reach API port 4000 directly; the ALB-only rule below is not enough for that hop.
    this.taskSecurityGroup.addIngressRule(
      this.taskSecurityGroup,
      ec2.Port.tcp(4000),
      'Allow dashboard tasks to reach the private API',
    );

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

    const createTaskRole = (id: string, description: string) =>
      new iam.Role(this, id, {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        description,
      });

    const grantBedrockRuntime = (role: iam.Role) => {
      role.addToPolicy(
        new iam.PolicyStatement({
          // Inline agents are created per request, so this action does not support a stable
          // resource ARN. The model permissions below remain explicitly enumerated.
          actions: ['bedrock:InvokeInlineAgent'],
          resources: ['*'],
        }),
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          resources: [
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-pro-v1:0`,
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-pro-v1:0`,
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-lite-v1:0`,
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-micro-v1:0`,
          ],
        }),
      );
    };

    const grantVoiceRuntime = (role: iam.Role) => {
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ['polly:SynthesizeSpeech', 'polly:DescribeVoices'],
          resources: ['*'],
        }),
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            'transcribe:StartStreamTranscription',
            'transcribe:StartStreamTranscriptionWebSocket',
          ],
          resources: ['*'],
        }),
      );
    };

    // Service task roles are intentionally separate. A compromised Voice task cannot call
    // Bedrock or Chime, and a Dashboard task cannot open metered speech streams. Secret values
    // are injected by the ECS execution roles, so application task roles never need GetSecretValue.
    const apiTaskRole = createTaskRole(
      'ApiTaskRole',
      'Least-privilege ECS task role for the Voomate API service',
    );
    const dashboardTaskRole = createTaskRole(
      'DashboardTaskRole',
      'Least-privilege ECS task role for the Voomate Dashboard service',
    );
    const voiceTaskRole = createTaskRole(
      'VoiceTaskRole',
      'Least-privilege ECS task role for the Voomate Voice service',
    );

    grantBedrockRuntime(apiTaskRole);
    grantVoiceRuntime(apiTaskRole);
    apiTaskRole.addToPolicy(
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

    grantBedrockRuntime(dashboardTaskRole);
    grantVoiceRuntime(voiceTaskRole);

    // 1. Control-plane Fastify API Service
    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole: apiTaskRole,
    });
    this.runtimeSecret.grantRead(apiTaskDef.obtainExecutionRole());

    apiTaskDef.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(this.repositories.api, props.imageTags.api),
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
        VOOMATE_API_KEY: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'VOOMATE_API_KEY',
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
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
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
      taskRole: dashboardTaskRole,
    });
    this.runtimeSecret.grantRead(dashboardTaskDef.obtainExecutionRole());

    dashboardTaskDef.addContainer('dashboard', {
      image: ecs.ContainerImage.fromEcrRepository(
        this.repositories.dashboard,
        props.imageTags.dashboard,
      ),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroups.dashboard,
        streamPrefix: 'dashboard',
      }),
      secrets: {
        NODE_ENV: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'NODE_ENV'),
        SUPABASE_URL: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'SUPABASE_URL'),
        SUPABASE_ANON_KEY: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'SUPABASE_ANON_KEY'),
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
        DATABASE_DIRECT_URL: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'DATABASE_DIRECT_URL',
        ),
        BEDROCK_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_REGION'),
        BEDROCK_MODEL_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'BEDROCK_MODEL_ID'),
        BEDROCK_UTILITY_MODEL_ID: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'BEDROCK_UTILITY_MODEL_ID',
        ),
        WIDGET_TOKEN_SECRET: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'WIDGET_TOKEN_SECRET',
        ),
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
        VOOMATE_API_KEY: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'VOOMATE_API_KEY',
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
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
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
      taskRole: voiceTaskRole,
    });
    this.runtimeSecret.grantRead(voiceTaskDef.obtainExecutionRole());

    voiceTaskDef.addContainer('voice', {
      image: ecs.ContainerImage.fromEcrRepository(this.repositories.voice, props.imageTags.voice),
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
        WIDGET_TOKEN_SECRET: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'WIDGET_TOKEN_SECRET',
        ),
        WEB_AGENT_BACKEND_ORIGIN: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'WEB_AGENT_BACKEND_ORIGIN',
        ),
        POLLY_REGION: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'POLLY_REGION'),
        POLLY_ENGINE: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'POLLY_ENGINE'),
        POLLY_VOICE_ID: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'POLLY_VOICE_ID'),
        VOICE_LANGUAGE: ecs.Secret.fromSecretsManager(this.runtimeSecret, 'VOICE_LANGUAGE'),
        TRANSCRIBE_VOCABULARY_NAME: ecs.Secret.fromSecretsManager(
          this.runtimeSecret,
          'TRANSCRIBE_VOCABULARY_NAME',
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
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
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

    // AWS WAF is the AWS-only public-edge guard. The application continues to enforce tenant,
    // origin, lease, and Redis limits; this layer absorbs common exploits and abusive session
    // creation before either ECS task allocates work.
    const publicWebAcl = new wafv2.CfnWebACL(this, 'PublicWebAcl', {
      name: `voomate-${props.config.stage}-public`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `voomate-${props.config.stage}-public`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWSKnownBadInputsRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
              vendorName: 'AWS',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSKnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'DashboardWidgetSessionRateLimit',
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: 'IP',
              limit: 300,
              scopeDownStatement: {
                byteMatchStatement: {
                  fieldToMatch: { uriPath: {} },
                  positionalConstraint: 'EXACTLY',
                  searchString: '/api/web-agent/session',
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                },
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'DashboardWidgetSessionRateLimit',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'ApiWidgetSessionRateLimit',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: 'IP',
              limit: 300,
              scopeDownStatement: {
                byteMatchStatement: {
                  fieldToMatch: { uriPath: {} },
                  positionalConstraint: 'EXACTLY',
                  searchString: '/v1/widget/session',
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                },
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'ApiWidgetSessionRateLimit',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
    new wafv2.CfnWebACLAssociation(this, 'ApplicationLoadBalancerWafAssociation', {
      resourceArn: alb.loadBalancerArn,
      webAclArn: publicWebAcl.attrArn,
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
        healthyHttpCodes: '200-399',
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

    // HTTP must never serve a token, dashboard session, or WebRTC negotiation. Keep a single
    // redirect-only listener so every public request reaches the TLS listener first.
    alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // The issued certificate in us-east-1 for atlowest.in and www.atlowest.in
    const albCertificate = acm.Certificate.fromCertificateArn(
      this,
      'AlbCertificate',
      'arn:aws:acm:us-east-1:424999960818:certificate/2908ee08-b9fa-496a-84f5-5f99549f1aca',
    );

    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      open: true,
      certificates: [albCertificate],
      defaultTargetGroups: [dashboardTargetGroup],
    });

    // Keep the public product topology to the landing site, merchant app, and super-admin
    // portal. Resolve canonical host redirects at the edge so they work even before Next.js
    // middleware receives a forwarded host header.
    httpsListener.addAction('LegacyDashboardHostRedirect', {
      priority: 5,
      conditions: [elbv2.ListenerCondition.hostHeaders(['dashboard.atlowest.in'])],
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        host: 'app.atlowest.in',
        path: '/#{path}',
        query: '#{query}',
        permanent: true,
      }),
    });

    httpsListener.addAction('AdminRootRedirect', {
      priority: 6,
      conditions: [
        elbv2.ListenerCondition.hostHeaders(['admin.atlowest.in']),
        elbv2.ListenerCondition.pathPatterns(['/']),
      ],
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        host: 'admin.atlowest.in',
        path: '/admin',
        query: '#{query}',
        permanent: true,
      }),
    });

    httpsListener.addAction('ApiRoutingHttpsPath', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/health', '/health/*', '/v1', '/v1/*'])],
      action: elbv2.ListenerAction.forward([apiTargetGroup]),
    });

    httpsListener.addAction('ApiRoutingHttpsHost', {
      priority: 11,
      conditions: [elbv2.ListenerCondition.hostHeaders(['api.atlowest.in', 'api.atlowest.com'])],
      action: elbv2.ListenerAction.forward([apiTargetGroup]),
    });

    httpsListener.addAction('VoiceRoutingHttpsHost', {
      priority: 20,
      conditions: [
        elbv2.ListenerCondition.hostHeaders(['voice.atlowest.in', 'voice.atlowest.com']),
      ],
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
      value: 'https://app.atlowest.in',
      description: 'Production merchant dashboard URL',
    });
  }
}
