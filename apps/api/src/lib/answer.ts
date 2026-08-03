/**
 * The answer loop: question in, grounded answer with citations out.
 *
 * embed question → retrieve → assemble prompt → Nova Pro → resolve citations.
 *
 * This is the piece Phase 3's voice pipeline will wrap, not replace. It streams because the
 * voice budget is spent in time-to-first-token: text-to-speech cannot start on a sentence the
 * model has not finished, so waiting for a complete answer before speaking adds the entire
 * generation time to the 1.2s speech-to-speech target and blows it every time.
 *
 * It is deliberately *not* Bedrock's RetrieveAndGenerate equivalent. Prompt assembly stays in
 * `@soniq/core/prompt`, under test, because that is where the injection boundary is enforced.
 */
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  type Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  buildGroundingBlock,
  buildSystemPrompt,
  buildUserTurn,
  extractCitations,
  internal,
  type AgentPersona,
  type Citation,
  type GroundingSource,
  type KnowledgeDocumentId,
} from '@soniq/core';
import { matchKnowledgeChunks, type Database } from '@soniq/db';
import type { AgentId, OrganizationId } from '@soniq/core';
import { getAwsConfig } from '../config.js';
import { embedText } from './embeddings.js';

let client: BedrockRuntimeClient | undefined;

const getClient = (): BedrockRuntimeClient => {
  client ??= new BedrockRuntimeClient({ region: getAwsConfig().BEDROCK_REGION });
  return client;
};

export interface AnswerRequest {
  db: Database;
  organizationId: OrganizationId;
  agentId: AgentId;
  persona: AgentPersona;
  /** BCP-47 tag to answer in. */
  language: string;
  channel: 'voice' | 'text';
  question: string;
  /** Prior turns, oldest first. Excludes the current question. */
  history?: readonly { role: 'visitor' | 'agent'; content: string }[];
  pageUrl?: string;
  /** Abort mid-generation when the visitor interrupts. Essential for barge-in. */
  signal?: AbortSignal;
}

export interface AnswerChunk {
  /** Text to append. May be a fragment of a word. */
  delta: string;
}

export interface AnswerResult {
  text: string;
  citations: readonly Citation[];
  /** True when retrieval found nothing above the similarity floor. */
  ungrounded: boolean;
  latency: {
    embeddingMs: number;
    retrievalMs: number;
    firstTokenMs: number;
    totalMs: number;
  };
}

/**
 * Conversation history sent to the model.
 *
 * Capped at the last 6 turns. Longer history costs time-to-first-token on every turn, and a
 * voice conversation that has run past six turns without resolving is one the visitor wants
 * escalated, not one where turn two still matters.
 */
const MAX_HISTORY_TURNS = 6;

const toMessages = (
  history: readonly { role: 'visitor' | 'agent'; content: string }[] | undefined,
  userTurn: string,
): Message[] => {
  const recent = (history ?? []).slice(-MAX_HISTORY_TURNS);
  const messages: Message[] = recent.map((turn) => ({
    role: turn.role === 'visitor' ? 'user' : 'assistant',
    content: [{ text: turn.content }],
  }));
  messages.push({ role: 'user', content: [{ text: userTurn }] });
  return messages;
};

/**
 * Stream a grounded answer.
 *
 * `onDelta` fires per token fragment. The returned promise resolves once generation is
 * complete, with the assembled text and its resolved citations — citations cannot be streamed
 * because a `[S1]` marker may not appear until the sentence it belongs to has finished.
 */
export const answerQuestion = async (
  request: AnswerRequest,
  onDelta?: (chunk: AnswerChunk) => void,
): Promise<AnswerResult> => {
  const aws = getAwsConfig();
  const started = Date.now();

  // 'query' rather than 'document': Titan optimises the two differently, and a short question
  // embedded as a document loses a few points of recall for nothing.
  const { embedding } = await embedText(request.question, 'query');
  const embeddingMs = Date.now() - started;

  const retrievalStarted = Date.now();
  const chunks = await matchKnowledgeChunks(request.db, {
    organizationId: request.organizationId,
    agentId: request.agentId,
    queryEmbedding: embedding,
  });
  const retrievalMs = Date.now() - retrievalStarted;

  const sources: GroundingSource[] = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    title: chunk.sourceTitle ?? 'Untitled',
    url: chunk.sourceUrl,
    content: chunk.content,
    similarity: chunk.similarity,
  }));

  const block = buildGroundingBlock(sources);

  const system = buildSystemPrompt({
    persona: request.persona,
    language: request.language,
    channel: request.channel,
    ...(request.pageUrl !== undefined ? { pageUrl: request.pageUrl } : {}),
  });

  const command = new ConverseStreamCommand({
    modelId: aws.BEDROCK_MODEL_ID,
    system: [{ text: system }],
    messages: toMessages(request.history, buildUserTurn(request.question, block)),
    inferenceConfig: {
      // Low but not zero. Grounded answers should restate the source, not reword it
      // creatively; a little variation stops the agent sounding like a recording when a
      // visitor asks the same thing twice.
      temperature: 0.3,
      // A spoken answer longer than this is one the visitor stopped listening to. The
      // instruction to be brief is in the prompt; this is the backstop.
      maxTokens: request.channel === 'voice' ? 300 : 800,
    },
  });

  let text = '';
  let firstTokenMs = 0;

  try {
    const response = await getClient().send(command, { abortSignal: request.signal });
    if (response.stream === undefined) throw internal('Bedrock returned no stream.');

    for await (const event of response.stream) {
      const delta = event.contentBlockDelta?.delta?.text;
      if (delta === undefined) continue;
      if (firstTokenMs === 0) firstTokenMs = Date.now() - started;
      text += delta;
      onDelta?.({ delta });
    }
  } catch (error) {
    // A visitor talking over the agent aborts this deliberately. Whatever was generated is
    // still the truthful record of what they heard, so it is returned rather than discarded.
    if (request.signal?.aborted === true) {
      const { text: clean, cited } = extractCitations(text, block.markers);
      return {
        text: clean,
        citations: toCitations(cited),
        ungrounded: sources.length === 0,
        latency: {
          embeddingMs,
          retrievalMs,
          firstTokenMs,
          totalMs: Date.now() - started,
        },
      };
    }
    if (error instanceof Error && error.name === 'AppError') throw error;
    throw internal('Answer generation failed.', error);
  }

  const { text: clean, cited } = extractCitations(text, block.markers);

  return {
    text: clean,
    citations: toCitations(cited),
    // Distinct from "the model said it didn't know". This says retrieval returned nothing at
    // all, which usually means the corpus is thin rather than the question unusual — and it
    // is the metric that tells a merchant to add content.
    ungrounded: sources.length === 0,
    latency: {
      embeddingMs,
      retrievalMs,
      firstTokenMs,
      totalMs: Date.now() - started,
    },
  };
};

const toCitations = (sources: readonly GroundingSource[]): Citation[] =>
  sources.map((source) => ({
    documentId: source.documentId as KnowledgeDocumentId,
    title: source.title,
    ...(source.url != null ? { url: source.url } : {}),
    score: source.similarity,
  }));

/** Test seam, matching `embeddings.ts`. */
export const __resetAnswerClient = (): void => {
  client = undefined;
};
