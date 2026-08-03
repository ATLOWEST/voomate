/**
 * Deployment configuration.
 *
 * Region is not a free choice. The pipeline needs Bedrock (Nova Pro), Bedrock Knowledge
 * Bases, OpenSearch Serverless, Transcribe streaming with multi-language identification,
 * Polly generative voices, and Chime SDK media pipelines — all in the *same* region, because
 * cross-region hops cost latency we do not have inside a 1.2s speech-to-speech budget.
 *
 * us-east-1 is the only region where all of those have been simultaneously available for the
 * whole of the last year. Verify against the current service tables before changing it.
 */
export interface StageConfig {
  readonly stage: 'dev' | 'staging' | 'prod';
  readonly region: string;
  /** Domain serving the widget iframe app and the loader bundle. */
  readonly widgetDomain: string;
  /**
   * Retain data stores on stack deletion. Off in dev so teardown is cheap; on everywhere a
   * real conversation has ever been stored.
   */
  readonly retainData: boolean;
}

export const STAGES: Record<string, StageConfig> = {
  dev: {
    stage: 'dev',
    region: 'us-east-1',
    widgetDomain: 'widget.dev.soniq.example',
    retainData: false,
  },
  prod: {
    stage: 'prod',
    region: 'us-east-1',
    widgetDomain: 'widget.soniq.example',
    retainData: true,
  },
};

export const resolveStage = (name: string | undefined): StageConfig => {
  const config = STAGES[name ?? 'dev'];
  if (config === undefined) {
    throw new Error(
      `Unknown stage "${String(name)}". Expected one of: ${Object.keys(STAGES).join(', ')}`,
    );
  }
  return config;
};
