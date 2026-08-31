import { randomUUID } from 'node:crypto';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { agents, businessProfileVersions, conversations, messages } from '@voomate/db';
import {
  businessOperatingProfileSchema,
  businessProfileGuidance,
  inferBusinessProfile,
  operatingProfileGuidance,
  webDeploymentPolicyFromAppearance,
  webSurfaceForLocation,
} from '@voomate/core';
import { getWebAgentDb } from './db';
import { attachImagesToMessage, consumeImagesForMessage } from './images';
import { logRunEvent, recordRunUsage, type RunContext } from './log';
import { retrieveWebAgentKnowledge } from './knowledge';
import { runBedrockInlineAgentTurn } from './bedrock-inline-agent';
import { createCustomerFacingStream, validateCustomerFacingReply } from './customer-language';
import { widgetVisitorFingerprint, type WidgetClaims } from './security';
import { decideDialogue } from './dialogue-manager';
import { listLiveReadCapabilities } from './live-data';
import { planWebAgentTurn, repairPlatformTranscription } from './orchestration';
import { buildResponsePresentation, type ResponsePresentation } from './presentation';
import {
  sanitizePageContext,
  pageContextRoleGuidance,
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
  const visitorFingerprint = widgetVisitorFingerprint(claims);
  const agentQuery = db
    .select({
      id: agents.id,
      persona: agents.persona,
      name: agents.name,
      transcriptRetentionDays: agents.transcriptRetentionDays,
      businessProfileVersionId: agents.businessProfileVersionId,
      allowedOrigins: agents.allowedOrigins,
      appearance: agents.appearance,
    })
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, claims.organizationId),
        eq(agents.id, claims.agentId),
        eq(agents.status, 'active'),
        eq(agents.desiredStateRevision, claims.configurationRevision),
        eq(agents.executionLeaseId, claims.executionLeaseId),
        gt(agents.executionLeaseExpiresAt, new Date()),
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

  // A session may have been created on an allowed page before an SPA navigation or a policy
  // toggle. Re-evaluate the exact current URL before recording or processing any page context.
  const activePageUrl = pageContext?.url ?? input.pageUrl;
  if (activePageUrl) {
    const url = new URL(activePageUrl);
    const policy = webDeploymentPolicyFromAppearance(agent.appearance, agent.allowedOrigins);
    if (
      url.origin.toLowerCase() !== claims.origin ||
      webSurfaceForLocation(policy, claims.origin, url.pathname) === undefined
    ) {
      throw new Error('Agent is not enabled on this page.');
    }
  }

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
  recordRunUsage(context, 'agent_runs', 1);
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
          agentInventory: pageContext.operatingState?.agentInventory,
        }
      : null,
  });
  if (input.channel === 'text') recordRunUsage(context, 'text_messages', 1);
  const [novaImages, previousMessages, approvedProfileRows] = await Promise.all([
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
    agent.businessProfileVersionId
      ? db
          .select({
            id: businessProfileVersions.id,
            revision: businessProfileVersions.revision,
            profile: businessProfileVersions.profile,
          })
          .from(businessProfileVersions)
          .where(
            and(
              eq(businessProfileVersions.organizationId, claims.organizationId),
              eq(businessProfileVersions.id, agent.businessProfileVersionId),
              eq(businessProfileVersions.status, 'approved'),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const persona = agent.persona as { company?: string; displayName?: string; name?: string };
  const businessName = persona.company ?? agent.name;
  const agentName = persona.displayName ?? persona.name ?? agent.name;
  // Preserve the original transcript for auditability. The repaired form is used only for
  // deterministic intent recognition and model grounding when this is the Voomate platform.
  const runtimeMessage = repairPlatformTranscription(
    input.message,
    businessName.trim().toLowerCase() === 'voomate',
  );
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
    message: runtimeMessage,
    agentName,
    businessName,
    previousVisitorMessages: chronologicalHistory
      .filter((turn) => turn.role === 'visitor')
      .map((turn) => turn.content),
  });
  const availableLiveCapabilities =
    decision.kind === 'agent' ? await listLiveReadCapabilities(context) : [];
  const orchestration = planWebAgentTurn({
    message: runtimeMessage,
    availableCapabilities: availableLiveCapabilities,
    pageContext,
    platformMode: businessName.trim().toLowerCase() === 'voomate',
    agentName,
    businessName,
  });
  // Navigation and answers backed entirely by the signed host page context must not wait for
  // lexical/vector retrieval or a model call. On cold Bedrock paths that unnecessary embedding
  // request was the dominant source of the widget's multi-second delay.
  const knowledge =
    decision.kind === 'agent'
      ? await retrieveWebAgentKnowledge(
          context,
          runtimeMessage,
          orchestration.useKnowledge && !orchestration.directReply,
        )
      : [];
  const businessProfile = inferBusinessProfile(
    pageContext?.businessSummary,
    pageContext?.description,
    pageContext?.headings.join(' '),
    knowledge.map(({ title, content }) => `${title}\n${content}`).join('\n'),
    availableLiveCapabilities.map(({ name, description }) => `${name} ${description}`).join('\n'),
  );
  const [approvedProfileRow] = approvedProfileRows;
  const approvedProfile = approvedProfileRow
    ? businessOperatingProfileSchema.parse(approvedProfileRow.profile)
    : undefined;
  await logRunEvent(context, 'orchestration_plan', 'success', {
    route: orchestration.route,
    selection: orchestration.selection,
    availableCapabilityCount: orchestration.availableCapabilityCount,
    selectedCapabilities: orchestration.capabilities.map(({ name }) => name),
    controlledActions: orchestration.controlledActions,
    executionSteps: orchestration.executionSteps,
    sources: orchestration.sources,
    clientCommands: orchestration.clientCommands.map(({ type, label }) => ({ type, label })),
    destinationDecision: orchestration.destinationDecision,
    platformJourney: orchestration.platformJourney,
    deterministicReply: Boolean(orchestration.directReply),
    knowledgeSkippedForDeterministicReply: Boolean(
      orchestration.directReply && orchestration.useKnowledge,
    ),
    learningMode: 'offline_reviewed_promotion',
    businessProfile: approvedProfileRow
      ? {
          source: 'approved_operating_profile',
          id: approvedProfileRow.id,
          revision: approvedProfileRow.revision,
        }
      : { source: 'turn_inference', ...businessProfile },
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
  const responseGuardInterventions = new Set<string>();
  const validateReply = (candidate: string): string => {
    const checked = validateCustomerFacingReply(candidate, input.message);
    if (checked.reason) responseGuardInterventions.add(checked.reason);
    return checked.reply;
  };
  const customerStream = createCustomerFacingStream(args.onTextDelta, {
    visitorMessage: input.message,
    onCorrection: (reason) => responseGuardInterventions.add(reason),
  });
  if (decision.kind === 'agent' && orchestration.directReply) {
    reply = validateReply(orchestration.directReply);
    await customerStream.push(reply);
    await customerStream.flush();
    await logRunEvent(context, 'platform_assistance_policy', 'success', {
      route: orchestration.route,
      modelCallAvoided: true,
      sourceCount: orchestration.sources.length,
    });
  } else if (decision.kind === 'agent') {
    reply = await runBedrockInlineAgentTurn(context, runtimeMessage, {
      businessName,
      agentName,
      knowledge,
      liveCapabilities: orchestration.capabilities,
      enableOrderStatus: orchestration.controlledActions.includes('check_order_status'),
      pageContext: orchestration.usePageContext ? pageContext : undefined,
      responseGuidance: [
        orchestration.responseGuidance,
        pageContextRoleGuidance(pageContext),
        approvedProfile
          ? operatingProfileGuidance(approvedProfile)
          : businessProfileGuidance(businessProfile),
      ]
        .filter(Boolean)
        .join('\n'),
      images: novaImages,
      history: chronologicalHistory,
      onTextDelta: (text) => customerStream.push(text),
      onStructuredResult: (value) => structuredResults.push(value),
    });
    reply = validateReply(reply);
    await customerStream.flush();
  } else {
    reply = validateReply(decision.reply);
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
  await logRunEvent(context, 'customer_response_quality', 'success', {
    publicLanguageVerified: true,
    guardInterventions: [...responseGuardInterventions],
    responseShape: /\n(?:[-*]|\d+\.)\s/.test(reply)
      ? 'structured'
      : reply.split(/\s+/).length <= 45
        ? 'concise'
        : 'detailed',
    sourceCount: orchestration.sources.length,
    knowledgeSourceCount: knowledge.length,
    liveCapabilityCount: orchestration.capabilities.length,
    structuredResultCount: structuredResults.length,
  });
  recordRunUsage(context, 'response_guard_interventions', responseGuardInterventions.size);
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
