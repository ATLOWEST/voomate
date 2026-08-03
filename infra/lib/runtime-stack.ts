import { Stack, type StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface RuntimeStackProps extends StackProps {
  readonly config: StageConfig;
  readonly knowledgeBucket: s3.IBucket;
}

/**
 * The identity the control-plane API runs as.
 *
 * Scoped deliberately tightly. This role is reachable from a process that accepts arbitrary
 * merchant input and serves untrusted website visitors, so anything it can do is something an
 * application-layer bug can eventually be made to do.
 *
 * Retrieval is NOT represented here. Vectors live in Supabase Postgres, reached with a
 * database credential rather than an IAM principal — see docs/adr/0005-supabase-pgvector.md.
 * AWS's role in retrieval is now limited to turning text into embeddings.
 */
export class RuntimeStack extends Stack {
  readonly apiRole: iam.Role;

  constructor(scope: Construct, id: string, props: RuntimeStackProps) {
    super(scope, id, props);

    this.apiRole = new iam.Role(this, 'ApiRole', {
      // TODO(phase-1): swap for the concrete compute principal once hosting is decided
      // (ECS task role vs. Lambda execution role). Neither changes the policies below.
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      // ASCII only. CloudFormation validates Description against a restricted charset, so a
      // typographic dash here fails the deploy rather than the synth.
      description: 'Control-plane API: Bedrock inference and embeddings, Transcribe, Polly, Chime',
    });

    // Inference. Nova Pro for the agent, Nova Lite for utility work (title generation,
    // language classification) where Pro would be wasted latency and cost.
    this.apiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-pro-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
          // Cross-region inference profiles carry an account-scoped ARN of their own; the
          // model ARN alone is not sufficient to invoke through one.
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-pro-v1:0`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-lite-v1:0`,
        ],
      }),
    );

    // Embeddings. Separated from the statement above so the two can be reasoned about — and
    // revoked — independently. Ingestion embeds documents; every visitor question embeds a
    // query, so this is on the hot path of both pipelines.
    this.apiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    );

    // Speech. Neither service supports resource-level permissions — there is no ARN for a
    // transcription stream or a synthesis request — so '*' is the only expressible scope.
    this.apiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'transcribe:StartStreamTranscription',
          'transcribe:StartStreamTranscriptionWebSocket',
        ],
        resources: ['*'],
      }),
    );

    this.apiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech', 'polly:DescribeVoices'],
        resources: ['*'],
      }),
    );

    // WebRTC transport for voice sessions. See docs/adr/0002-webrtc-chime-transport.md.
    this.apiRole.addToPolicy(
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

    // Raw crawl artifacts. Read is granted here — unlike under the Bedrock KB design, we are
    // the ones who re-chunk, and re-chunking from the archive is the whole reason it exists.
    props.knowledgeBucket.grantReadWrite(this.apiRole);
    props.knowledgeBucket.grantDelete(this.apiRole);
  }
}
