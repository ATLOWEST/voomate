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
 * `@voomate/core/prompt`, under test, because that is where the injection boundary is enforced.
 */
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  ConverseCommand,
  type ContentBlock,
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
  type TurnGrounding,
} from '@voomate/core';
import { agentActiveTools, matchKnowledgeChunks, type Database } from '@voomate/db';
import type { AgentId, OrganizationId } from '@voomate/core';
import { and, eq } from 'drizzle-orm';
import { getAwsConfig } from '../config.js';
import { embedText } from './embeddings.js';
import { getAllTools, buildToolConfig, toBedrockDocument } from './tools/registry.js';
import { executeToolHarness } from './execution-harness.js';

let client: BedrockRuntimeClient | undefined;

const getClient = (): BedrockRuntimeClient => {
  client ??= new BedrockRuntimeClient({ region: getAwsConfig().BEDROCK_REGION });
  return client;
};

// --------------------------------------------------------------------------------
// Phase 4: Rate Limiting & Caching (Upstash Redis)
// --------------------------------------------------------------------------------
import { Redis } from '@upstash/redis';

// Caching and distributed rate limiting are optional in local development. Credentials must
// always be supplied by the deployment; falling back to a shared endpoint would mix tenants
// and leak an operational secret into source control.
const redis =
  process.env.UPSTASH_REDIS_REST_URL !== undefined &&
  process.env.UPSTASH_REDIS_REST_TOKEN !== undefined
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const checkRateLimit = async (orgId: string) => {
  if (redis === undefined) return;
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 50;
  const key = `ratelimit:${orgId}`;

  const currentCount = await redis.incr(key);
  if (currentCount === 1) {
    // First request in the window, set expiry
    await redis.pexpire(key, windowMs);
  }

  if (currentCount > maxRequests) {
    throw new Error(`Rate limit exceeded for organization ${orgId}. Please slow down.`);
  }
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
  /**
   * How well the merchant's own content supported this answer.
   *
   * Computed here because this is the only place that sees both the retrieved chunks and which
   * of them the model actually cited. Recorded per turn, and it is what Phase 4 learns from.
   */
  grounding: TurnGrounding;
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
export const answer = async (
  request: AnswerRequest,
  onDelta?: (chunk: AnswerChunk) => void,
): Promise<AnswerResult> => {
  // 1. Rate Limiting Check
  await checkRateLimit(request.organizationId);

  // 2. Response Caching Check
  // We only cache if there is no history (i.e. a fresh simple FAQ query)
  const cacheKey = `cache:${request.organizationId}:${request.question.trim().toLowerCase()}`;
  if (!request.history || request.history.length === 0) {
    const cachedStr = await redis?.get<string>(cacheKey);
    if (cachedStr) {
      const cached = typeof cachedStr === 'string' ? JSON.parse(cachedStr) : cachedStr;
      // Simulate streaming
      onDelta?.({ delta: cached.text });
      return cached;
    }
  }

  // 2.5 Auto-Escalation: Detect Repetitive Queries (User is stuck)
  if (request.history && request.history.length >= 4) {
    const lastUserTurn = request.question.toLowerCase().trim();
    const historyUserTurns = request.history
      .filter((h) => h.role === 'visitor')
      .map((h) => h.content.toLowerCase().trim());

    // If the last 2 user queries in history match the current one exactly, escalate.
    if (
      historyUserTurns.length >= 2 &&
      historyUserTurns.slice(-2).every((q) => q === lastUserTurn)
    ) {
      console.warn(`[Agent] Auto-escalating due to repetitive user query.`);
      await executeToolHarness({
        db: request.db,
        organizationId: request.organizationId,
        agentId: request.agentId,
        toolName: 'escalate_to_human',
        toolInput: {
          reason: 'User repeated the exact same question 3 times in a row.',
          summary: request.question,
        },
      });
      const handoffText =
        "I'm sorry, I seem to be having trouble understanding. I'm escalating this to a human agent right now to help you.";
      onDelta?.({ delta: handoffText });
      return {
        text: handoffText,
        citations: [],
        ungrounded: true,
        grounding: { sourceCount: 0, citedDocumentIds: [], ungrounded: true },
        latency: { embeddingMs: 0, retrievalMs: 0, firstTokenMs: 0, totalMs: 0 },
      };
    }
  }

  const startedEmbedding = Date.now();

  // 'query' rather than 'document': Titan optimises the two differently, and a short question
  // embedded as a document loses a few points of recall for nothing.
  const { embedding } = await embedText(request.question, 'query');
  const embeddingMs = Date.now() - startedEmbedding;

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

  const baseSystem = buildSystemPrompt({
    persona: request.persona,
    language: request.language,
    channel: request.channel,
    ...(request.pageUrl !== undefined ? { pageUrl: request.pageUrl } : {}),
  });

  const strictGuardrails = `
CRITICAL DIRECTIVES:
1. You are a deterministic Business Agent. DO NOT invent prices, dates, links, or booking availability.
2. If you are going to book an appointment or generate a payment link, YOU MUST use the exact data retrieved in the context block or explicitly provided by the user. Do not hallucinate costs.
3. If a tool throws an error, you must accurately report the failure to the user. Do not fabricate a success message.
4. CONFIDENCE & ESCALATION: If you are uncertain about a policy, or if the user explicitly asks for a human, call the \`escalate_to_human\` tool immediately.
5. APPROVAL CHECKPOINTS: If the user requests an irreversible/sensitive action (like a refund or cancellation), DO NOT proceed. You MUST call the \`request_approval\` tool to queue it for the business owner.`;

  const system = baseSystem + '\n' + strictGuardrails;

  const messages = toMessages(request.history, buildUserTurn(request.question, block));
  let text = '';
  let firstTokenMs = 0;

  const allTools = getAllTools();

  const [activeIntegrations, activeToolRows] = await Promise.all([
    request.db.query.organizationIntegrations.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.organizationId, request.organizationId), eq(t.status, 'active')),
    }),
    request.db
      .select({ toolName: agentActiveTools.toolName })
      .from(agentActiveTools)
      .where(
        and(
          eq(agentActiveTools.organizationId, request.organizationId),
          eq(agentActiveTools.agentId, request.agentId),
          eq(agentActiveTools.status, 'active'),
        ),
      ),
  ]);

  const activeProviders = new Set(activeIntegrations.map((i) => i.provider));
  const activeToolNames = new Set(activeToolRows.map(({ toolName }) => toolName));

  const tools = allTools.filter(
    (tool) =>
      tool.implementation !== 'placeholder' &&
      (tool.builtin === true || activeToolNames.has(tool.name)) &&
      (!tool.provider || activeProviders.has(tool.provider)),
  );
  const toolConfig = buildToolConfig(tools);

  // --------------------------------------------------------------------------------
  // Phase 3: Speed Optimization & Model Routing
  // Fast pre-classification using Nova Micro to decide if we need Nova Pro.
  // --------------------------------------------------------------------------------
  let targetModelId = 'amazon.nova-lite-v1:0'; // Default to faster/cheaper model

  try {
    const classifyCmd = new ConverseCommand({
      modelId: 'amazon.nova-micro-v1:0',
      messages: [
        {
          role: 'user',
          content: [
            {
              text: `Classify if this customer query requires complex multi-step reasoning or high-risk actions (refunds, cancellations). Output only the word "COMPLEX" or "SIMPLE". Query: "${request.question}"`,
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: 10, temperature: 0 },
    });
    const classifyRes = await getClient().send(classifyCmd, { abortSignal: request.signal });
    const classification = classifyRes.output?.message?.content?.[0];
    if (classification && 'text' in classification && classification.text?.includes('COMPLEX')) {
      targetModelId = 'amazon.nova-pro-v1:0';
    }
  } catch (e) {
    // If classifier fails or times out, default safely to Pro
    console.warn(`[Agent] Classifier failed, defaulting to Pro.`, e);
    targetModelId = 'amazon.nova-pro-v1:0';
  }

  try {
    // ReAct loop: keep talking to Nova Pro until it gives us a text response.
    let iterationCount = 0;
    const MAX_ITERATIONS = 5;

    while (true) {
      if (iterationCount >= MAX_ITERATIONS) {
        console.warn(
          `[Agent] Aborting ReAct loop for org ${request.organizationId}: Exceeded max iterations (${MAX_ITERATIONS})`,
        );

        // Auto-Escalate when stuck in a tool loop
        const escalation = await executeToolHarness({
          db: request.db,
          organizationId: request.organizationId,
          agentId: request.agentId,
          toolName: 'escalate_to_human',
          toolInput: {
            reason: 'System detected an infinite tool loop (Agent Stuck).',
            summary: request.question,
          },
        });

        const loopHandoffText =
          escalation.status === 'success'
            ? '\n\nI am having trouble completing this request, so I paused this conversation for the support team to review.'
            : '\n\nI could not complete this request or create a handoff. Please contact the support team directly; no action was completed.';
        text += loopHandoffText;
        onDelta?.({ delta: loopHandoffText });
        break;
      }
      iterationCount++;
      const command = new ConverseStreamCommand({
        modelId: targetModelId,
        system: [{ text: system }],
        messages,
        toolConfig,
        inferenceConfig: {
          temperature: 0.3,
          maxTokens: request.channel === 'voice' ? 300 : 800,
        },
      });
      const response = await getClient().send(command, { abortSignal: request.signal });
      if (response.stream === undefined) throw internal('Bedrock returned no stream.');

      let stopReason: string | undefined;
      const toolUseBlocks: { toolUseId: string; name: string; input: string }[] = [];
      let currentToolUseIdx = -1;

      // Ensure we record the assistant's turn in the history
      const assistantMessage: Message = { role: 'assistant', content: [] };

      for await (const event of response.stream) {
        if (event.contentBlockStart?.start?.toolUse) {
          const start = event.contentBlockStart.start.toolUse;
          toolUseBlocks.push({
            toolUseId: start.toolUseId!,
            name: start.name!,
            input: '',
          });
          currentToolUseIdx++;
        }

        if (event.contentBlockDelta?.delta?.toolUse) {
          const block = toolUseBlocks[currentToolUseIdx];
          if (block) {
            block.input += event.contentBlockDelta.delta.toolUse.input || '';
          }
        }

        if (event.contentBlockDelta?.delta?.text) {
          const delta = event.contentBlockDelta.delta.text;
          if (firstTokenMs === 0) firstTokenMs = Date.now() - startedEmbedding;
          text += delta;

          // Append text to the ongoing assistant message so we can save it in history if needed
          let textBlock = assistantMessage.content?.find((c) => 'text' in c);
          if (!textBlock) {
            textBlock = { text: '' };
            assistantMessage.content?.push(textBlock);
          }
          if ('text' in textBlock && textBlock.text !== undefined) {
            textBlock.text += delta;
          }

          onDelta?.({ delta });
        }

        if (event.messageStop?.stopReason) {
          stopReason = event.messageStop.stopReason;
        }
      }

      if (stopReason === 'tool_use') {
        // Build the assistant message that requested the tools to append to history
        for (const tu of toolUseBlocks) {
          assistantMessage.content!.push({
            toolUse: {
              toolUseId: tu.toolUseId,
              name: tu.name,
              input: JSON.parse(tu.input || '{}'),
            },
          });
        }
        messages.push(assistantMessage);

        // Execute all requested tools via the Secure Execution Harness
        const toolResultBlocks: ContentBlock[] = [];
        for (const tu of toolUseBlocks) {
          const result = await executeToolHarness({
            db: request.db,
            organizationId: request.organizationId,
            agentId: request.agentId,
            toolName: tu.name,
            toolInput: JSON.parse(tu.input || '{}'),
          });

          toolResultBlocks.push({
            toolResult: {
              toolUseId: tu.toolUseId,
              content: [
                {
                  json: toBedrockDocument(
                    result.result ?? { error: result.error ?? 'Tool execution failed.' },
                  ),
                },
              ],
              status: result.status === 'success' ? 'success' : 'error',
            },
          });
        }

        // Send the tool results back to Nova Pro
        messages.push({ role: 'user', content: toolResultBlocks });

        // Loop again so Nova Pro can read the results and output a text response
        continue;
      }

      // If we reach here, the model finished normally (end_turn)
      break;
    }
  } catch (error) {
    if (request.signal?.aborted === true) {
      const { text: clean, cited } = extractCitations(text, block.markers);
      return {
        text: clean,
        citations: toCitations(cited),
        ungrounded: sources.length === 0,
        grounding: toGrounding(sources, cited),
        latency: {
          embeddingMs,
          retrievalMs,
          firstTokenMs,
          totalMs: Date.now() - startedEmbedding,
        },
      };
    }
    if (error instanceof Error && error.name === 'AppError') throw error;
    console.error('[Answer] Inner error:', error);
    throw internal('Answer generation failed.', error);
  }

  const { text: clean, cited } = extractCitations(text, block.markers);

  const result: AnswerResult = {
    text: clean,
    citations: toCitations(cited),
    // Distinct from "the model said it didn't know". This says retrieval returned nothing at
    // all, which usually means the corpus is thin rather than the question unusual — and it
    // is the metric that tells a merchant to add content.
    ungrounded: sources.length === 0,
    grounding: toGrounding(sources, cited),
    latency: {
      embeddingMs,
      retrievalMs,
      firstTokenMs,
      totalMs: Date.now() - startedEmbedding,
    },
  };

  // 3. Cache the Result (if it was a simple stateless query)
  if (!request.history || request.history.length === 0) {
    // Cache for 5 minutes
    await redis?.setex(cacheKey, 300, JSON.stringify(result));
  }

  return result;
};

const toGrounding = (
  sources: readonly GroundingSource[],
  cited: readonly GroundingSource[],
): TurnGrounding => ({
  // `sources` is already ordered by similarity — the retrieval query does that — so the first
  // one is the best evidence there was.
  ...(sources[0] !== undefined ? { topSimilarity: sources[0].similarity } : {}),
  sourceCount: sources.length,
  citedDocumentIds: [...new Set(cited.map((source) => source.documentId as KnowledgeDocumentId))],
  ungrounded: sources.length === 0,
});

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

/** Voice sessions use the same grounded answer loop as text; only the channel instructions vary. */
export const answerQuestion = answer;
