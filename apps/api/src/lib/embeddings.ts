/**
 * Text → vector, via Amazon Titan Embed Text v2.
 *
 * The one place that turns text into an embedding. Ingestion and query-time retrieval both go
 * through it, and that is the point: a query embedded by a different model, or at a different
 * dimensionality, or with a different normalisation setting, than the corpus it is searching
 * produces cosine scores that are *numerically fine and semantically meaningless*. Retrieval
 * does not error; it just quietly returns the wrong chunks. Sharing one code path makes that
 * mismatch impossible rather than merely unlikely.
 */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-runtime';
import { internal } from '@soniq/core';
import { getAwsConfig } from '../config.js';

/**
 * Titan distinguishes the two, and the distinction is worth honouring: `search_document` is
 * optimised for text being stored, `search_query` for the short text searching it. Using one
 * for both costs a few points of recall for nothing.
 */
export type EmbeddingPurpose = 'document' | 'query';

interface TitanRequest {
  inputText: string;
  dimensions: number;
  /**
   * Unit-normalised vectors make cosine similarity and inner product equivalent, which is
   * what lets the pgvector index use `vector_cosine_ops` without a per-query normalisation
   * step. Turning this off silently breaks the ranking rather than erroring.
   */
  normalize: boolean;
  embeddingTypes?: string[];
}

interface TitanResponse {
  embedding?: number[];
  inputTextTokenCount?: number;
}

let client: BedrockRuntimeClient | undefined;

const getClient = (): BedrockRuntimeClient => {
  const aws = getAwsConfig();
  // The SDK's default credential chain resolves the task role in Fargate and the static keys
  // from `.env` locally. Passing credentials explicitly would break the deployed path.
  client ??= new BedrockRuntimeClient({ region: aws.BEDROCK_REGION });
  return client;
};

export interface EmbeddingResult {
  embedding: number[];
  /** Titan's own count, which is the only exact token number in the ingestion pipeline. */
  inputTokens: number;
}

/**
 * Titan's per-request input ceiling is 8192 tokens. Chunks are built well under that, but
 * ingestion also embeds merchant-authored Q&A and manual text that nothing else bounds, so
 * the truncation happens here rather than being assumed upstream.
 *
 * Truncating is right for a *query* — a 9000-token question is not a question. For a document
 * it means silent data loss, which is why `embedText` warns rather than swallowing it.
 */
const MAX_INPUT_CHARS = 8192 * 4;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const isRetryable = (error: unknown): boolean => {
  if (error instanceof ThrottlingException) return true;
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return status !== undefined && RETRYABLE_STATUS.has(status);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embed one piece of text.
 *
 * Retries on throttling with exponential backoff plus jitter. Bedrock throttles per account,
 * so an ingestion job and a live visitor's question compete for the same budget — without
 * jitter, a batch that gets throttled retries in lockstep and throttles itself again.
 */
export const embedText = async (
  text: string,
  purpose: EmbeddingPurpose = 'document',
  attempt = 0,
): Promise<EmbeddingResult> => {
  const aws = getAwsConfig();
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw internal('Refusing to embed empty text — an all-zero vector matches everything.');
  }

  const input = trimmed.length > MAX_INPUT_CHARS ? trimmed.slice(0, MAX_INPUT_CHARS) : trimmed;
  if (input.length < trimmed.length && purpose === 'document') {
    console.warn(
      `[embeddings] truncated document input from ${String(trimmed.length)} to ${String(MAX_INPUT_CHARS)} chars; ` +
        'the chunker should have prevented this.',
    );
  }

  const body: TitanRequest = {
    inputText: input,
    dimensions: aws.EMBEDDING_DIMENSIONS,
    normalize: true,
  };

  try {
    const response = await getClient().send(
      new InvokeModelCommand({
        modelId: aws.EMBEDDING_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      }),
    );

    const parsed = JSON.parse(new TextDecoder().decode(response.body)) as TitanResponse;
    const embedding = parsed.embedding;

    if (embedding === undefined || embedding.length !== aws.EMBEDDING_DIMENSIONS) {
      // Almost always a model/dimension mismatch in configuration. Failing loudly here beats
      // storing a vector that will never match anything.
      throw internal(
        `Embedding model returned ${String(embedding?.length ?? 0)} dimensions, expected ${String(aws.EMBEDDING_DIMENSIONS)}.`,
      );
    }

    return { embedding, inputTokens: parsed.inputTextTokenCount ?? 0 };
  } catch (error) {
    if (isRetryable(error) && attempt < 4) {
      // 200ms, 400, 800, 1600 — plus up to 100ms of jitter to break up lockstep retries.
      const backoff = 200 * 2 ** attempt + Math.random() * 100;
      await sleep(backoff);
      return embedText(text, purpose, attempt + 1);
    }
    if (error instanceof Error && error.name === 'AppError') throw error;
    throw internal('Embedding request failed.', error);
  }
};

/**
 * Embed many texts with bounded concurrency.
 *
 * Titan's InvokeModel has no batch form, so this is N calls. Concurrency is capped low on
 * purpose: a merchant's 500-page crawl must not consume the account's whole Bedrock quota and
 * throttle the live conversation happening on another tenant's site. Slow ingestion is
 * invisible; a stalled voice agent is not.
 *
 * Order is preserved, because chunk ordinals depend on it.
 */
export const embedBatch = async (
  texts: readonly string[],
  purpose: EmbeddingPurpose = 'document',
  concurrency = 4,
): Promise<EmbeddingResult[]> => {
  const results = new Array<EmbeddingResult>(texts.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < texts.length) {
      const index = next;
      next += 1;
      results[index] = await embedText(texts[index]!, purpose);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return results;
};

/** Test seam. The module-level client is cached, and tests must not inherit one. */
export const __resetEmbeddingClient = (): void => {
  client = undefined;
};
