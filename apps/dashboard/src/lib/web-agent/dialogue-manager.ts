export type DialogueDecision =
  | { kind: 'social'; reply: string; escalate: false; reason: 'greeting' | 'thanks' }
  | { kind: 'identity'; reply: string; escalate: false; reason: 'identity' }
  | { kind: 'assist_first'; reply: string; escalate: false; reason: 'first_handoff_request' }
  | { kind: 'memory_ack'; reply: string; escalate: false; reason: 'explicit_memory' }
  | {
      kind: 'handoff';
      reply: string;
      escalate: true;
      reason: 'repeated_handoff_request' | 'serious_issue';
    }
  | { kind: 'agent'; escalate: false };

const HUMAN_REQUEST =
  /\b(human|person|representative|manager|supervisor|support (?:agent|team)|real (?:agent|person)|someone from (?:the )?team|talk to someone|speak to someone|connect me)\b/i;
const SERIOUS_ISSUE =
  /\b(fraud|stolen|unsafe|danger|threat|harass|legal notice|lawyer|charged twice|unauthori[sz]ed charge|account (?:hacked|locked)|medical emergency|self[- ]?harm|suicide)\b/i;
const IDENTITY_QUESTION =
  /^\s*(?:hey\s+|hi\s+|hello\s+)?(?:(?:what(?:'s| is)|tell me)\s+(?:your|ur)\s+name|who are you)\s*[?.!]*\s*$/i;
const GREETING =
  /^\s*(?:hi|hello|hey)(?:[,.!\s]+(?:there|can you hear me|are you there))?[?.!\s]*$/i;
const THANKS =
  /^\s*(?:thanks|thank you)(?:[,.!\s]+(?:that (?:helps|answers it)|got it))?[?.!\s]*$/i;
const EXPLICIT_MEMORY = /^\s*(?:please\s+)?remember\s+that\s+(.{2,300})[.!?]*\s*$/i;

export function asksForHuman(message: string): boolean {
  return HUMAN_REQUEST.test(message);
}

export function isSeriousIssue(message: string): boolean {
  return SERIOUS_ISSUE.test(message);
}

export function decideDialogue(args: {
  message: string;
  agentName: string;
  businessName: string;
  previousVisitorMessages: readonly string[];
}): DialogueDecision {
  const message = args.message.trim();
  if (GREETING.test(message)) {
    return {
      kind: 'social',
      reply: /hear me|are you there/i.test(message)
        ? 'Yes, I can hear you.'
        : 'Hi! What can I help with?',
      escalate: false,
      reason: 'greeting',
    };
  }
  if (THANKS.test(message)) {
    return {
      kind: 'social',
      reply: 'You’re welcome!',
      escalate: false,
      reason: 'thanks',
    };
  }
  if (IDENTITY_QUESTION.test(message)) {
    return {
      kind: 'identity',
      reply: `I’m ${args.agentName}, ${args.businessName}’s assistant.`,
      escalate: false,
      reason: 'identity',
    };
  }
  const memory = message
    .match(EXPLICIT_MEMORY)?.[1]
    ?.replace(/[.!?]+$/, '')
    .trim();
  if (memory) {
    return {
      kind: 'memory_ack',
      reply: `Got it. I’ll remember that ${memory}.`,
      escalate: false,
      reason: 'explicit_memory',
    };
  }

  const serious = isSeriousIssue(message);
  if (serious) {
    return {
      kind: 'handoff',
      reply:
        'I’ve flagged this conversation for urgent human review. Add any important details here; if anyone is in immediate danger, contact local emergency services now.',
      escalate: true,
      reason: 'serious_issue',
    };
  }

  const wantsHuman = asksForHuman(message);
  if (!wantsHuman) return { kind: 'agent', escalate: false };

  const priorRequests = args.previousVisitorMessages.filter(asksForHuman).length;
  if (priorRequests > 0) {
    return {
      kind: 'handoff',
      reply:
        'I’ve flagged this conversation for human review. You can add any important details here for the team.',
      escalate: true,
      reason: 'repeated_handoff_request',
    };
  }

  return {
    kind: 'assist_first',
    reply:
      'I can likely help with this first—tell me what’s going wrong. If you still want a person, ask again and I’ll flag it for the team.',
    escalate: false,
    reason: 'first_handoff_request',
  };
}
