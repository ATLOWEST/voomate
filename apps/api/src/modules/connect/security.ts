/**
 * High-confidence credential patterns rejected before business content reaches storage or
 * Bedrock. This is deliberately not a broad PII filter: public phone numbers and support email
 * addresses are valid knowledge. Customer records must never be mapped into Connect content in
 * the first place and remain behind authenticated live tools.
 */
const CREDENTIAL_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s]+/i,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_[A-Za-z0-9_-]{32,}\b/,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_./+~-]{12,}/i,
] as const;

export const containsSensitiveCredential = (value: string): boolean =>
  CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
