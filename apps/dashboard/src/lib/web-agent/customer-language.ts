const INTERNAL_PATTERNS = [
  /\bi need to (?:find|fetch|query|look up) (?:the )?user(?:'s)? details\b/gi,
  /\bi need to ask (?:the )?user (?:for|to)\b/gi,
  /\bask (?:the )?user (?:for|to)\b/gi,
  /\b(?:available|enabled) actions?\b/gi,
  /\btool call\b/gi,
  /\bsystem prompt\b/gi,
  /\btenant id\b/gi,
  /\binternal (?:reasoning|notes?|workflow)\b/gi,
  /\bdatabase quer(?:y|ies)\b/gi,
  /\bthe user(?:'s)? (?:question|request|input)\b/gi,
  /\bthe user(?:'s)?\b/gi,
];

const CLARIFYING_REPLY =
  'I want to make sure I help with the right thing. Could you tell me a little more about what you’re looking for?';

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isQuestionEcho(reply: string, visitorMessage?: string): boolean {
  const response = normalized(reply);
  const input = normalized(visitorMessage ?? '');
  return input.length > 0 && response === input;
}

export function internalLanguageViolations(text: string): string[] {
  return INTERNAL_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
}

export function sanitizeCustomerFacingReply(text: string): string {
  const sanitized = text
    .replace(
      /\bthe (?:user(?:'s)?|visitor(?:'s)?) (?:question|request|input) is too vague[^.!?]*[.!?]?/gi,
      CLARIFYING_REPLY,
    )
    .replace(
      /\b(?:this|the (?:user(?:'s)?|visitor(?:'s)?) (?:question|request|input)) (?:requires?|needs?) more (?:specific )?(?:information|details)[^.!?]*[.!?]?/gi,
      CLARIFYING_REPLY,
    )
    .replace(
      /\bi need to (?:find|fetch|query|look up) (?:the )?user(?:'s)? details\b/gi,
      'I’ll check that for you',
    )
    .replace(/\bi need to ask (?:the )?user for (?:the )?/gi, 'Please share the ')
    .replace(/\bi need to ask (?:the )?user to /gi, 'Please ')
    .replace(/\bask (?:the )?user for (?:the )?/gi, 'ask you for the ')
    .replace(/\bask (?:the )?user to /gi, 'ask you to ')
    .replace(
      /the (?:requested )?action is not supported by the available actions/gi,
      'I can’t complete that change here',
    )
    .replace(/\b(?:using|through) (?:a )?tool call\b/gi, 'for you')
    .replace(/\baccording to (?:my|the) system prompt\b/gi, 'Based on the information available')
    .replace(/\bthe user(?:'s)? (?:question|request|input)\b/gi, 'your question')
    .replace(/\bthe user(?:'s)?\b/gi, 'you')
    // Collapse spacing inside prose without destroying indented blocks, lists, or paragraphs.
    .replace(/([^\t \n])[\t ]{2,}/g, '$1 ')
    .trim();

  // A partial model output is allowed to be imperfect, but system vocabulary must never
  // cross the public boundary. A useful clarification is safer than trying to repair prose
  // whose meaning came from an internal planning message.
  return internalLanguageViolations(sanitized).length > 0 ? CLARIFYING_REPLY : sanitized;
}

export function validateCustomerFacingReply(
  reply: string,
  visitorMessage?: string,
): {
  reply: string;
  corrected: boolean;
  reason?: 'empty' | 'echo' | 'internal_language' | 'rewritten';
} {
  const sanitized = sanitizeCustomerFacingReply(reply);
  if (!sanitized) return { reply: CLARIFYING_REPLY, corrected: true, reason: 'empty' };
  if (isQuestionEcho(sanitized, visitorMessage)) {
    return { reply: CLARIFYING_REPLY, corrected: true, reason: 'echo' };
  }
  if (internalLanguageViolations(sanitized).length > 0) {
    return { reply: CLARIFYING_REPLY, corrected: true, reason: 'internal_language' };
  }
  // Trimming stream-boundary whitespace is transport cleanup, not a quality intervention.
  return sanitized === reply.trim()
    ? { reply: sanitized, corrected: false }
    : {
        reply: sanitized,
        corrected: true,
        reason: internalLanguageViolations(reply).length > 0 ? 'internal_language' : 'rewritten',
      };
}

export function createCustomerFacingStream(
  emit?: (text: string) => void | Promise<void>,
  options?: {
    visitorMessage?: string;
    onCorrection?: (
      reason: NonNullable<ReturnType<typeof validateCustomerFacingReply>['reason']>,
    ) => void;
  },
): {
  push(text: string): Promise<void>;
  flush(): Promise<void>;
} {
  let buffer = '';
  return {
    async push(text) {
      buffer += text;
      const boundary = Math.max(
        buffer.lastIndexOf('. '),
        buffer.lastIndexOf('? '),
        buffer.lastIndexOf('! '),
        buffer.lastIndexOf('\n'),
      );
      if (boundary < 0) return;
      const checked = validateCustomerFacingReply(
        buffer.slice(0, boundary + 1),
        options?.visitorMessage,
      );
      if (checked.reason) options?.onCorrection?.(checked.reason);
      const ready = checked.reply;
      buffer = buffer.slice(boundary + 1);
      if (ready) await emit?.(`${ready} `);
    },
    async flush() {
      const checked = validateCustomerFacingReply(buffer, options?.visitorMessage);
      if (checked.reason) options?.onCorrection?.(checked.reason);
      const ready = checked.reply;
      buffer = '';
      if (ready) await emit?.(ready);
    },
  };
}
