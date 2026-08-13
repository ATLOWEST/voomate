import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AgentId, OrganizationId } from '@voomate/core';
import { and, eq } from 'drizzle-orm';
import { knowledgeChunks, matchKnowledgeChunks, matchKnowledgeChunksLexically } from '@voomate/db';
import { getWebAgentDb } from './db';
import { logRunEvent, type RunContext } from './log';

const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1024);
const embeddingModelId = process.env.EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0';
let client: BedrockRuntimeClient | undefined;

function bedrock(): BedrockRuntimeClient {
  client ??= new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  });
  return client;
}

interface TitanResponse {
  embedding?: number[];
  inputTextTokenCount?: number;
}

export interface WebAgentKnowledge {
  title: string;
  url: string | null;
  content: string;
}

const casualConversation =
  /^\s*(?:(?:hi|hello|hey)(?:[,\s]+(?:can you hear me|are you there))?|thanks?|thank you|good(?:bye| morning| afternoon| evening)|bye|can you hear me|are you there)[!?.\s]*$/i;
const conversationMemoryQuestion =
  /\b(?:remember (?:that|this)|what .{0,30} did i (?:just )?(?:say|tell|mention)|did i (?:just )?(?:say|tell|mention))\b/i;

export function shouldRetrieveKnowledge(message: string): boolean {
  return !casualConversation.test(message) && !conversationMemoryQuestion.test(message);
}

/**
 * Tenant-scoped pgvector retrieval for the embedded Web Agent. Real-time action requests skip
 * RAG because their source of truth is the tool, which saves an embedding round trip.
 */
export async function retrieveWebAgentKnowledge(
  context: RunContext,
  message: string,
  enabled = true,
): Promise<WebAgentKnowledge[]> {
  const startedAt = Date.now();
  if (!enabled) {
    await logRunEvent(context, 'knowledge_retrieval', 'success', {
      sourceCount: 0,
      skipped: 'orchestrator_not_required',
    });
    return [];
  }
  if (!shouldRetrieveKnowledge(message)) {
    await logRunEvent(context, 'knowledge_retrieval', 'success', {
      sourceCount: 0,
      skipped: casualConversation.test(message) ? 'casual_conversation' : 'conversation_memory',
      embeddingInputTokens: 0,
    });
    return [];
  }

  const db = getWebAgentDb();
  const [available] = await db
    .select({ id: knowledgeChunks.id })
    .from(knowledgeChunks)
    .where(
      and(
        eq(knowledgeChunks.organizationId, context.organizationId),
        eq(knowledgeChunks.agentId, context.agentId),
      ),
    )
    .limit(1);

  if (!available) {
    await logRunEvent(
      context,
      'knowledge_retrieval',
      'success',
      { sourceCount: 0, skipped: 'empty_knowledge_base' },
      Date.now() - startedAt,
    );
    return [];
  }

  const lexicalChunks = await matchKnowledgeChunksLexically(db, {
    organizationId: context.organizationId as OrganizationId,
    agentId: context.agentId as AgentId,
    query: message,
  });
  if (lexicalChunks.length > 0) {
    await logRunEvent(
      context,
      'knowledge_retrieval',
      'success',
      { sourceCount: lexicalChunks.length, mode: 'lexical_fast_path', embeddingInputTokens: 0 },
      Date.now() - startedAt,
    );
    return lexicalChunks.map((chunk) => ({
      title: chunk.sourceTitle ?? 'Business knowledge',
      url: chunk.sourceUrl,
      content: chunk.content,
    }));
  }

  const response = await bedrock().send(
    new InvokeModelCommand({
      modelId: embeddingModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: message.trim().slice(0, 32_768),
        dimensions,
        normalize: true,
      }),
    }),
  );
  const parsed = JSON.parse(new TextDecoder().decode(response.body)) as TitanResponse;
  if (!parsed.embedding || parsed.embedding.length !== dimensions) {
    throw new Error(
      `Embedding model returned an invalid ${String(parsed.embedding?.length ?? 0)}-dimension vector.`,
    );
  }

  const chunks = await matchKnowledgeChunks(db, {
    organizationId: context.organizationId as OrganizationId,
    agentId: context.agentId as AgentId,
    queryEmbedding: parsed.embedding,
  });
  await logRunEvent(
    context,
    'knowledge_retrieval',
    'success',
    {
      sourceCount: chunks.length,
      mode: 'semantic_vector',
      embeddingModel: embeddingModelId,
      embeddingInputTokens: parsed.inputTextTokenCount,
    },
    Date.now() - startedAt,
  );
  return chunks.map((chunk) => ({
    title: chunk.sourceTitle ?? 'Business knowledge',
    url: chunk.sourceUrl,
    content: chunk.content,
  }));
}
