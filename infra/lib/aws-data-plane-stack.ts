import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface AwsDataPlaneStackProps extends StackProps {
  readonly config: StageConfig;
  readonly vpc: ec2.IVpc;
  readonly taskSecurityGroup: ec2.ISecurityGroup;
}

/**
 * Additive AWS replacement for Supabase, Upstash, and shared runtime configuration.
 * Nothing references these resources until database reconciliation and Cognito migration pass.
 */
export class AwsDataPlaneStack extends Stack {
  readonly apiRuntimeSecret: secretsmanager.Secret;
  readonly dashboardRuntimeSecret: secretsmanager.Secret;
  readonly voiceRuntimeSecret: secretsmanager.Secret;
  readonly database: rds.DatabaseCluster;
  readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props: AwsDataPlaneStackProps) {
    super(scope, id, props);

    const isolatedSubnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnets;
    if (isolatedSubnets.length < 2) {
      throw new Error(
        'AWS data plane requires isolated subnets in at least two Availability Zones.',
      );
    }

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Aurora accepts PostgreSQL only from Voomate application tasks',
    });
    databaseSecurityGroup.addIngressRule(
      props.taskSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow application tasks to Aurora PostgreSQL',
    );

    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Valkey accepts TLS Redis only from Voomate application tasks',
    });
    cacheSecurityGroup.addIngressRule(
      props.taskSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow application tasks to ElastiCache',
    );

    this.database = new rds.DatabaseCluster(this, 'AuroraPostgres', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('voomate_admin', {
        secretName: `voomate/${props.config.stage}/aurora-admin`,
      }),
      defaultDatabaseName: 'voomate',
      backup: { retention: Duration.days(35) },
      deletionProtection: true,
      storageEncrypted: true,
      copyTagsToSnapshot: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const cache = new elasticache.CfnServerlessCache(this, 'ValkeyCache', {
      engine: 'valkey',
      serverlessCacheName: `voomate-${props.config.stage}-rate-limit`,
      majorEngineVersion: '8',
      securityGroupIds: [cacheSecurityGroup.securityGroupId],
      subnetIds: isolatedSubnets.map((subnet) => subnet.subnetId),
      snapshotRetentionLimit: 7,
      dailySnapshotTime: '03:00',
      description: 'Voomate distributed rate-limit and ephemeral workflow cache',
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `voomate-${props.config.stage}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
      passwordPolicy: {
        minLength: 14,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
    });
    this.userPool = userPool;
    userPool.addClient('DashboardClient', {
      userPoolClientName: `voomate-${props.config.stage}-dashboard`,
      authFlows: { userPassword: true, userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: ['https://dashboard.atlowest.in/auth/callback'],
        logoutUrls: ['https://dashboard.atlowest.in/sign-in'],
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
      enableTokenRevocation: true,
      accessTokenValidity: Duration.minutes(15),
      idTokenValidity: Duration.minutes(15),
      refreshTokenValidity: Duration.days(7),
    });

    const serviceSecret = (service: 'api' | 'dashboard' | 'voice') =>
      new secretsmanager.Secret(
        this,
        `${service.charAt(0).toUpperCase()}${service.slice(1)}RuntimeSecret`,
        {
          secretName: `voomate/${props.config.stage}/${service}/runtime`,
          description: `Voomate ${service} runtime configuration; populated during AWS-only cutover`,
          generateSecretString: {
            secretStringTemplate: '{"migrationState":"prepared"}',
            generateStringKey: 'bootstrap',
          },
          removalPolicy: RemovalPolicy.RETAIN,
        },
      );

    this.apiRuntimeSecret = serviceSecret('api');
    this.dashboardRuntimeSecret = serviceSecret('dashboard');
    this.voiceRuntimeSecret = serviceSecret('voice');

    new CfnOutput(this, 'AuroraClusterEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'Private Aurora endpoint for staged application cutover',
    });
    new CfnOutput(this, 'AuroraAdminSecretArn', {
      value: this.database.secret!.secretArn,
      description: 'Generated Aurora administrator secret; never inject into application tasks',
    });
    new CfnOutput(this, 'ValkeyEndpoint', {
      value: cache.attrEndpointAddress,
      description: 'Private TLS cache endpoint for staged Redis cutover',
    });
    new CfnOutput(this, 'CognitoUserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'ApiRuntimeSecretArn', { value: this.apiRuntimeSecret.secretArn });
    new CfnOutput(this, 'DashboardRuntimeSecretArn', {
      value: this.dashboardRuntimeSecret.secretArn,
    });
    new CfnOutput(this, 'VoiceRuntimeSecretArn', { value: this.voiceRuntimeSecret.secretArn });
  }
}
