import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { agents, conversations, messages } from '@voomate/db';
import { getWebAgentDb } from './db';
import { attachImagesToMessage, consumeImagesForMessage } from './images';
import { logRunEvent, recordRunUsage, type RunContext } from './log';
import { retrieveWebAgentKnowledge } from './knowledge';
import { requiresRealTimeAction, runNovaTurnStream } from './nova';
import { sessionFingerprint, type WidgetClaims } from './security';

export interface WebAgentTurnInput {
  message: string;
  conversationId?: string;
  pageUrl?: string;
  imageIds: string[];
  channel: 'text' | 'voice';
}

export interface WebAgentTurnResult {
  conversationId: string;
  message: string;
  context: RunContext;
}

/** The single text/voice turn path: tenant checks, history, RAG, tools and persistence. */
export async function runWebAgentTurn(args: {
  claims: WidgetClaims;
  token: string;
  origin: string;
  input: WebAgentTurnInput;
  onTextDelta?: (text: string) => void | Promise<void>;
  onStarted?: (context: RunContext) => void | Promise<void>;
}): Promise<WebAgentTurnResult> {
  const { claims, token, origin, input } = args;
  const turnStartedAt = Date.now();
  const db = getWebAgentDb();
  const agentQuery = db
    .select({ id: agents.id, persona: agents.persona, name: agents.name })
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, claims.organizationId),
        eq(agents.id, claims.agentId),
        eq(agents.status, 'published'),
      ),
    )
    .limit(1);

  // On follow-up turns these tenant checks are independent. Running them together removes one
  // cross-region database round trip while preserving both predicates.
  const [agentRows, existingConversationRows] = await Promise.all([
    agentQuery,
    input.conversationId
      ? db
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            and(
              eq(conversations.organizationId, claims.organizationId),
              eq(conversations.agentId, claims.agentId),
              eq(conversations.id, input.conversationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  const [agent] = agentRows;
  if (!agent) throw new Error('Agent is no longer available.');

  let conversationId = input.conversationId;
  if (conversationId) {
    const [conversation] = existingConversationRows;
    if (!conversation) throw new Error('Conversation does not belong to this session.');
  } else {
    const pageUrl =
      input.pageUrl && new URL(input.pageUrl).origin.toLowerCase() === origin
        ? input.pageUrl
        : undefined;
    const [conversation] = await db
      .insert(conversations)
      .values({
        organizationId: claims.organizationId,
        agentId: claims.agentId,
        channel: input.channel === 'voice' ? 'voice' : 'text',
        visitorId: randomUUID(),
        pageUrl,
      })
      .returning({ id: conversations.id });
    if (!conversation) throw new Error('Could not start conversation.');
    conversationId = conversation.id;
  }

  const context: RunContext = {
    organizationId: claims.organizationId,
    agentId: claims.agentId,
    conversationId,
    runId: randomUUID(),
    eventBuffer: [],
    usageBuffer: [],
  };
  await args.onStarted?.(context);
  await logRunEvent(context, 'message_received', 'success', {
    channel: input.channel,
    imageCount: input.imageIds.length,
  });
  if (input.channel === 'text') recordRunUsage(context, 'text_messages', 1);
  const [novaImages, previousMessages] = await Promise.all([
    input.imageIds.length === 0
      ? Promise.resolve([])
      : consumeImagesForMessage({
          context,
          sessionFingerprint: sessionFingerprint(token),
          imageIds: input.imageIds,
        }),
    db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, claims.organizationId),
          eq(messages.conversationId, conversationId),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(12),
  ]);

  const persona = agent.persona as { company?: string; displayName?: string; name?: string };
  const [insertedMessages, knowledge] = await Promise.all([
    db
      .insert(messages)
      .values({
        organizationId: claims.organizationId,
        conversationId,
        role: 'visitor',
        content: input.message,
      })
      .returning({ id: messages.id }),
    retrieveWebAgentKnowledge(context, input.message, requiresRealTimeAction(input.message)),
  ]);
  const [visitorMessage] = insertedMessages;
  if (!visitorMessage) throw new Error('Could not store visitor message.');
  if (input.imageIds.length > 0) {
    await attachImagesToMessage(context, input.imageIds, visitorMessage.id);
  }

  const reply = await runNovaTurnStream(context, input.message, {
    businessName: persona.company ?? agent.name,
    agentName: persona.displayName ?? persona.name ?? agent.name,
    knowledge,
    images: novaImages,
    history: previousMessages.reverse().map((turn) => ({
      role: turn.role === 'visitor' ? 'visitor' : 'agent',
      content: turn.content,
    })),
    onTextDelta: args.onTextDelta,
  });
  await db.insert(messages).values({
    organizationId: claims.organizationId,
    conversationId,
    role: 'agent',
    content: reply,
  });
  await db
    .update(conversations)
    .set({ messageCount: sql`${conversations.messageCount} + 2` })
    .where(
      and(
        eq(conversations.organizationId, claims.organizationId),
        eq(conversations.id, conversationId),
      ),
    );
  await logRunEvent(context, 'response_returned', 'success', { channel: input.channel });
  await logRunEvent(
    context,
    'agent_runtime',
    'success',
    { runtime: 'voomate-bedrock-agent', channel: input.channel },
    Date.now() - turnStartedAt,
  );
  return { conversationId, message: reply, context };
}
