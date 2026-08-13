import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { agents, conversations, messages } from '@voomate/db';
import { businessProfileGuidance, inferBusinessProfile } from '@voomate/core';
import { getWebAgentDb } from './db';
import { attachImagesToMessage, consumeImagesForMessage } from './images';
import { logRunEvent, recordRunUsage, type RunContext } from './log';
import { retrieveWebAgentKnowledge } from './knowledge';
import { runBedrockInlineAgentTurn } from './bedrock-inline-agent';
import { createCustomerFacingStream, sanitizeCustomerFacingReply } from './customer-language';
import { sessionFingerprint, type WidgetClaims } from './security';
import { decideDialogue } from './dialogue-manager';
import { listLiveReadCapabilities } from './live-data';
import { planWebAgentTurn } from './orchestration';
import { buildResponsePresentation, type ResponsePresentation } from './presentation';
import {
  sanitizePageContext,
  type NavigateClientCommand,
  type WebAgentPageContext,
} from './page-context';

export interface WebAgentTurnInput {
  message: string;
  conversationId?: string;
  pageUrl?: string;
  pageContext?: WebAgentPageContext;
  imageIds: string[];
  channel: 'text' | 'voice';
}

export interface WebAgentTurnResult {
  conversationId: string;
  messageId: string;
  message: string;
  context: RunContext;
  clientCommands: NavigateClientCommand[];
  presentation: ResponsePresentation;
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
  const { claims, origin, input } = args;
  const pageContext = sanitizePageContext(input.pageContext, origin);
  const turnStartedAt = Date.now();
  const db = getWebAgentDb();
  const visitorFingerprint = sessionFingerprint(claims.visitorSessionId);
  const agentQuery = db
    .select({
      id: agents.id,
      persona: agents.persona,
      name: agents.name,
      transcriptRetentionDays: agents.transcriptRetentionDays,
    })
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
              eq(conversations.visitorId, visitorFingerprint),
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
      pageContext?.url ??
      (input.pageUrl && new URL(input.pageUrl).origin.toLowerCase() === origin
        ? input.pageUrl
        : undefined);
    const [conversation] = await db
      .insert(conversations)
      .values({
        organizationId: claims.organizationId,
        agentId: claims.agentId,
        channel: input.channel === 'voice' ? 'voice' : 'text',
        visitorId: visitorFingerprint,
        pageUrl,
        purgeAfter: new Date(
          Date.now() + Math.max(1, agent.transcriptRetentionDays) * 24 * 60 * 60 * 1_000,
        ),
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
    pageContext: pageContext
      ? {
          title: pageContext.title,
          surfaceId: pageContext.surface?.id,
          navigationCount: pageContext.navigation.length,
          navigationLabels: pageContext.navigation.map(({ label }) => label),
          factDestinations: pageContext.navigation
            .filter(({ facts }) => facts?.length)
            .map(({ label }) => label),
        }
      : null,
  });
  if (input.channel === 'text') recordRunUsage(context, 'text_messages', 1);
  const [novaImages, previousMessages] = await Promise.all([
    input.imageIds.length === 0
      ? Promise.resolve([])
      : consumeImagesForMessage({
          context,
          sessionFingerprint: visitorFingerprint,
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
  const businessName = persona.company ?? agent.name;
  const agentName = persona.displayName ?? persona.name ?? agent.name;
  const insertedMessages = await db
    .insert(messages)
    .values({
      organizationId: claims.organizationId,
      conversationId,
      role: 'visitor',
      content: input.message,
    })
    .returning({ id: messages.id });
  const [visitorMessage] = insertedMessages;
  if (!visitorMessage) throw new Error('Could not store visitor message.');
  if (input.imageIds.length > 0) {
    await attachImagesToMessage(context, input.imageIds, visitorMessage.id);
  }

  const chronologicalHistory = previousMessages.reverse().map((turn) => ({
    role: turn.role === 'visitor' ? ('visitor' as const) : ('agent' as const),
    content: turn.content,
  }));
  const decision = decideDialogue({
    message: input.message,
    agentName,
    businessName,
    previousVisitorMessages: chronologicalHistory
      .filter((turn) => turn.role === 'visitor')
      .map((turn) => turn.content),
  });
  const availableLiveCapabilities =
    decision.kind === 'agent' ? await listLiveReadCapabilities(context) : [];
  const orchestration = planWebAgentTurn({
    message: input.message,
    availableCapabilities: availableLiveCapabilities,
    pageContext,
    platformMode: businessName.trim().toLowerCase() === 'voomate',
  });
  const knowledge =
    decision.kind === 'agent'
      ? await retrieveWebAgentKnowledge(context, input.message, orchestration.useKnowledge)
      : [];
  const businessProfile = inferBusinessProfile(
    pageContext?.businessSummary,
    pageContext?.description,
    pageContext?.headings.join(' '),
    knowledge.map(({ title, content }) => `${title}\n${content}`).join('\n'),
    availableLiveCapabilities.map(({ name, description }) => `${name} ${description}`).join('\n'),
  );
  await logRunEvent(context, 'orchestration_plan', 'success', {
    route: orchestration.route,
    selection: orchestration.selection,
    availableCapabilityCount: orchestration.availableCapabilityCount,
    selectedCapabilities: orchestration.capabilities.map(({ name }) => name),
    controlledActions: orchestration.controlledActions,
    sources: orchestration.sources,
    clientCommands: orchestration.clientCommands.map(({ type, label }) => ({ type, label })),
    destinationDecision: orchestration.destinationDecision,
    learningMode: 'offline_reviewed_promotion',
    businessProfile,
  });
  if (decision.kind !== 'agent') {
    await logRunEvent(context, 'knowledge_retrieval', 'success', {
      sourceCount: 0,
      skipped: 'deterministic_dialogue_policy',
      embeddingInputTokens: 0,
    });
  }

  let reply: string;
  const structuredResults: unknown[] = [];
  const customerStream = createCustomerFacingStream(args.onTextDelta);
  if (decision.kind === 'agent' && orchestration.directReply) {
    reply = sanitizeCustomerFacingReply(orchestration.directReply);
    await customerStream.push(reply);
    await customerStream.flush();
    await logRunEvent(context, 'platform_assistance_policy', 'success', {
      route: orchestration.route,
      modelCallAvoided: true,
      sourceCount: orchestration.sources.length,
    });
  } else if (decision.kind === 'agent') {
    reply = await runBedrockInlineAgentTurn(context, input.message, {
      businessName,
      agentName,
      knowledge,
      liveCapabilities: orchestration.capabilities,
      enableOrderStatus: orchestration.controlledActions.includes('check_order_status'),
      pageContext: orchestration.usePageContext ? pageContext : undefined,
      responseGuidance: [orchestration.responseGuidance, businessProfileGuidance(businessProfile)]
        .filter(Boolean)
        .join('\n'),
      images: novaImages,
      history: chronologicalHistory,
      onTextDelta: (text) => customerStream.push(text),
      onStructuredResult: (value) => structuredResults.push(value),
    });
    reply = sanitizeCustomerFacingReply(reply);
    await customerStream.flush();
  } else {
    reply = sanitizeCustomerFacingReply(decision.reply);
  }
  if (decision.kind !== 'agent') {
    await customerStream.push(reply);
    await customerStream.flush();
    await logRunEvent(context, 'dialogue_policy', 'success', {
      decision: decision.kind,
      reason: decision.reason,
      modelCallAvoided: true,
    });
  }

  const [agentMessage] = await db
    .insert(messages)
    .values({
      organizationId: claims.organizationId,
      conversationId,
      role: 'agent',
      content: reply,
    })
    .returning({ id: messages.id });
  if (!agentMessage) throw new Error('Could not store assistant message.');
  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + 2`,
      ...(decision.escalate ? { status: 'escalated' as const } : {}),
    })
    .where(
      and(
        eq(conversations.organizationId, claims.organizationId),
        eq(conversations.id, conversationId),
      ),
    );
  if (decision.escalate) {
    await logRunEvent(context, 'human_handoff', 'success', {
      state: 'queued_for_review',
      reason: decision.reason,
    });
  }
  await logRunEvent(context, 'response_returned', 'success', { channel: input.channel });
  await logRunEvent(
    context,
    'agent_runtime',
    'success',
    { runtime: 'voomate-bedrock-agent', channel: input.channel },
    Date.now() - turnStartedAt,
  );
  return {
    conversationId,
    message: reply,
    messageId: agentMessage.id,
    context,
    clientCommands: orchestration.clientCommands,
    presentation: buildResponsePresentation(reply, structuredResults),
  };
}
