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
];

export function internalLanguageViolations(text: string): string[] {
  return INTERNAL_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
}

export function sanitizeCustomerFacingReply(text: string): string {
  return text
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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function createCustomerFacingStream(emit?: (text: string) => void | Promise<void>): {
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
      const ready = sanitizeCustomerFacingReply(buffer.slice(0, boundary + 1));
      buffer = buffer.slice(boundary + 1);
      if (ready) await emit?.(`${ready} `);
    },
    async flush() {
      const ready = sanitizeCustomerFacingReply(buffer);
      buffer = '';
      if (ready) await emit?.(ready);
    },
  };
}
