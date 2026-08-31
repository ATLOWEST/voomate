import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const PROTOCOL_VERSION = '2026-08-01';
const MAX_CLOCK_SKEW_MS = 60_000;
const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const CAPABILITY_NAME = /^[a-z][a-z0-9_]{1,62}$/;
const FIELD_PATH = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*){0,5}$/;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export type ReadParameterType = 'string' | 'number' | 'integer' | 'boolean';

export interface ReadParameter {
  type: ReadParameterType;
  description: string;
  required?: boolean;
  maxLength?: number;
}

export interface ReadCapabilityManifest {
  name: string;
  description: string;
  parameters: Record<string, ReadParameter>;
  /** Dot paths are projected from the handler result. Everything else is discarded. */
  publicFields: string[];
  /** Customer capabilities must declare which query fields the handler verifies. */
  sensitivity: 'public' | 'customer';
  verificationFields?: string[];
}

export interface ReadCapability extends ReadCapabilityManifest {
  read: (input: Readonly<Record<string, unknown>>) => Promise<unknown> | unknown;
  timeoutMs?: number;
}

export interface ReadOnlyHandlerOptions {
  connectionId: string;
  secret: string;
  capabilities: Record<string, ReadCapability>;
  /** Optional distributed nonce store for multi-instance/serverless deployments. */
  nonceStore?: {
    claim: (nonce: string, expiresAt: Date) => Promise<boolean> | boolean;
  };
  onAudit?: (event: {
    capability: string;
    status: 'success' | 'denied' | 'error';
    latencyMs: number;
  }) => Promise<void> | void;
}

/**
 * A ready-to-wire capability pack for any commerce backend. The merchant keeps provider
 * credentials and data access in these server callbacks; Voomate receives only the explicitly
 * projected customer-safe fields below.
 */
export interface CommerceReadAdapter {
  searchProducts?: (input: Readonly<{ query: string }>) => Promise<unknown> | unknown;
  getProduct?: (input: Readonly<{ productRef: string }>) => Promise<unknown> | unknown;
  getOrderStatus?: (
    input: Readonly<{ orderId: string; email: string }>,
  ) => Promise<unknown> | unknown;
}

export type CommerceReadOnlyHandlerOptions = Omit<ReadOnlyHandlerOptions, 'capabilities'> & {
  commerce: CommerceReadAdapter;
};

/**
 * Creates a no-write product, price, and verified-order connection from named merchant callbacks.
 * It is a connector convenience, not an ecommerce-specific agent: the same governed capability
 * protocol and tenant/agent policy applies to every adapter.
 */
export function createCommerceReadOnlyHandler(options: CommerceReadOnlyHandlerOptions) {
  const capabilities: Record<string, ReadCapability> = {};
  if (options.commerce.searchProducts) {
    capabilities.search_products = {
      name: 'search_products',
      description: 'Search public products with current display prices and availability.',
      sensitivity: 'public',
      parameters: {
        query: {
          type: 'string',
          required: true,
          maxLength: 160,
          description: 'Product search phrase',
        },
      },
      publicFields: ['id', 'title', 'url', 'displayPrice', 'currency', 'availability', 'imageUrl'],
      read: ({ query }) => options.commerce.searchProducts!({ query: String(query) }),
    };
  }
  if (options.commerce.getProduct) {
    capabilities.get_product = {
      name: 'get_product',
      description: 'Read current public details, display price, and availability for one product.',
      sensitivity: 'public',
      parameters: {
        product_ref: {
          type: 'string',
          required: true,
          maxLength: 160,
          description: 'Public product ID, handle, or SKU',
        },
      },
      publicFields: [
        'id',
        'title',
        'url',
        'displayPrice',
        'currency',
        'availability',
        'description',
        'imageUrl',
      ],
      read: ({ product_ref }) => options.commerce.getProduct!({ productRef: String(product_ref) }),
    };
  }
  if (options.commerce.getOrderStatus) {
    capabilities.get_order_status = {
      name: 'get_order_status',
      description: 'Read a customer order status after verifying the checkout email address.',
      sensitivity: 'customer',
      parameters: {
        order_id: {
          type: 'string',
          required: true,
          maxLength: 100,
          description: 'Customer order number',
        },
        email: {
          type: 'string',
          required: true,
          maxLength: 254,
          description: 'Email used at checkout',
        },
      },
      verificationFields: ['email'],
      publicFields: ['orderId', 'status', 'trackingUrl', 'estimatedDelivery', 'fulfillmentStatus'],
      read: ({ order_id, email }) =>
        options.commerce.getOrderStatus!({ orderId: String(order_id), email: String(email) }),
    };
  }
  if (Object.keys(capabilities).length === 0) {
    throw new Error('Commerce connection needs at least one read callback.');
  }
  return createReadOnlyHandler({
    connectionId: options.connectionId,
    secret: options.secret,
    capabilities,
    ...(options.nonceStore ? { nonceStore: options.nonceStore } : {}),
    ...(options.onAudit ? { onAudit: options.onAudit } : {}),
  });
}

export interface InvokeReadOnlyOptions {
  endpoint: string;
  connectionId: string;
  secret: string;
  capability: string;
  input?: Record<string, unknown>;
  timeoutMs?: number;
  allowInsecureLoopback?: boolean;
  fetchImpl?: typeof fetch;
}

export interface ReadOnlyInvocationResult {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  outputFields: string[];
}

/** AES-256-GCM envelope used only by Voomate's server to keep connection secrets out of rows. */
export function sealConnectionSecret(secret: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  if (key.byteLength !== 32 || secret.length < 32) throw new Error('Invalid encryption material.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('voomate:read-connection:v1'));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function openConnectionSecret(sealed: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  const [version, iv, tag, ciphertext] = sealed.split('.');
  if (key.byteLength !== 32 || version !== 'v1' || !iv || !tag || !ciphertext) {
    throw new Error('Invalid encrypted connection secret.');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from('voomate:read-connection:v1'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

type ProtocolBody =
  | { operation: 'describe'; connectionId: string }
  | {
      operation: 'query';
      connectionId: string;
      capability: string;
      input: Record<string, unknown>;
    };

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).byteLength;

function signature(secret: string, timestamp: string, nonce: string, body: string): string {
  return createHmac('sha256', secret)
    .update(`${PROTOCOL_VERSION}.${timestamp}.${nonce}.${body}`)
    .digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function safeJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function valueAt(source: unknown, path: string[]): unknown {
  let value = source;
  for (const segment of path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function setAt(target: Record<string, unknown>, path: string[], value: unknown): void {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    const current = cursor[segment];
    if (!current || typeof current !== 'object' || Array.isArray(current)) cursor[segment] = {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[path.at(-1)!] = value;
}

function isSafeFieldPath(path: string): boolean {
  return (
    FIELD_PATH.test(path) && path.split('.').every((segment) => !UNSAFE_OBJECT_KEYS.has(segment))
  );
}

export function projectPublicFields(
  value: unknown,
  paths: readonly string[],
): Record<string, unknown> | Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => projectOne(item, paths));
  return projectOne(value, paths);
}

function projectOne(value: unknown, paths: readonly string[]): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const path of paths) {
    const segments = path.split('.');
    const field = valueAt(value, segments);
    if (field !== undefined) setAt(projected, segments, safeJson(field));
  }
  return projected;
}

function validateCapability(capability: ReadCapability): void {
  if (!CAPABILITY_NAME.test(capability.name)) throw new Error('Invalid capability name.');
  if (capability.description.trim().length < 12 || capability.description.length > 500) {
    throw new Error(`Capability ${capability.name} needs a concise description.`);
  }
  if (capability.publicFields.length === 0 || capability.publicFields.length > 40) {
    throw new Error(`Capability ${capability.name} needs 1-40 public fields.`);
  }
  if (capability.publicFields.some((path) => !isSafeFieldPath(path))) {
    throw new Error(`Capability ${capability.name} has an invalid public field path.`);
  }
  const parameters = Object.entries(capability.parameters);
  if (parameters.length > 20) throw new Error(`Capability ${capability.name} has too many inputs.`);
  for (const [name, parameter] of parameters) {
    if (!CAPABILITY_NAME.test(name) || parameter.description.trim().length < 3) {
      throw new Error(`Capability ${capability.name} has an invalid parameter.`);
    }
  }
  if (
    capability.sensitivity === 'customer' &&
    (!capability.verificationFields?.length ||
      capability.verificationFields.some((field) => !capability.parameters[field]?.required))
  ) {
    throw new Error(
      `Customer capability ${capability.name} must require explicit verification fields.`,
    );
  }
}

export function validateReadCapabilityInput(
  capability: ReadCapabilityManifest,
  input: Record<string, unknown>,
): void {
  const allowed = new Set(Object.keys(capability.parameters));
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new Error('Query contains an undeclared field.');
  }
  for (const [name, parameter] of Object.entries(capability.parameters)) {
    const value = input[name];
    if (value === undefined) {
      if (parameter.required) throw new Error(`Missing required field: ${name}.`);
      continue;
    }
    if (parameter.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error('Invalid input.');
    } else if (typeof value !== parameter.type) {
      throw new Error('Invalid input.');
    }
    if (
      typeof value === 'string' &&
      value.length > Math.min(Math.max(parameter.maxLength ?? 500, 1), 2_000)
    ) {
      throw new Error('Input is too long.');
    }
  }
  for (const field of capability.verificationFields ?? []) {
    const value = input[field];
    if (value === undefined || value === '') throw new Error('Identity verification is required.');
  }
}

function manifestOf(capabilities: Record<string, ReadCapability>): ReadCapabilityManifest[] {
  return Object.entries(capabilities).map(([key, value]) => {
    if (key !== value.name) throw new Error('Capability registry key must match its name.');
    validateCapability(value);
    return {
      name: value.name,
      description: value.description,
      parameters: value.parameters,
      publicFields: value.publicFields,
      sensitivity: value.sensitivity,
      ...(value.verificationFields ? { verificationFields: value.verificationFields } : {}),
    };
  });
}

const localNonces = new Map<string, number>();

function claimLocalNonce(nonce: string, now: number): boolean {
  for (const [key, expiry] of localNonces) if (expiry <= now) localNonces.delete(key);
  if (localNonces.has(nonce)) return false;
  if (localNonces.size >= 10_000) localNonces.delete(localNonces.keys().next().value!);
  localNonces.set(nonce, now + MAX_CLOCK_SKEW_MS * 2);
  return true;
}

function signedResponse(
  secret: string,
  requestTimestamp: string,
  nonce: string,
  payload: unknown,
  status = 200,
): Response {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-voomate-protocol': PROTOCOL_VERSION,
      'x-voomate-response-timestamp': timestamp,
      'x-voomate-response-signature': signature(
        secret,
        `${requestTimestamp}:${timestamp}`,
        nonce,
        body,
      ),
    },
  });
}

/**
 * Builds a fetch-compatible POST handler for a customer's server. It exposes only declared
 * read callbacks and public fields; there is no generic SQL, mutation, or credential surface.
 */
export function createReadOnlyHandler(options: ReadOnlyHandlerOptions) {
  const manifest = manifestOf(options.capabilities);
  if (!options.connectionId || options.secret.length < 32) throw new Error('Invalid connection.');

  return async (request: Request): Promise<Response> => {
    const startedAt = Date.now();
    const timestamp = request.headers.get('x-voomate-timestamp') ?? '';
    const nonce = request.headers.get('x-voomate-nonce') ?? '';
    let capabilityName = 'protocol';
    try {
      if (request.method !== 'POST') return new Response(null, { status: 405 });
      if (request.headers.get('x-voomate-protocol') !== PROTOCOL_VERSION) {
        throw new Error('Unsupported protocol.');
      }
      if (
        !/^\d{13}$/.test(timestamp) ||
        Math.abs(Date.now() - Number(timestamp)) > MAX_CLOCK_SKEW_MS
      ) {
        throw new Error('Expired request.');
      }
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(nonce)) throw new Error('Invalid nonce.');
      const claimed = options.nonceStore
        ? await options.nonceStore.claim(nonce, new Date(Number(timestamp) + MAX_CLOCK_SKEW_MS * 2))
        : claimLocalNonce(`${options.connectionId}:${nonce}`, Date.now());
      if (!claimed) throw new Error('Replayed request.');

      const body = await request.text();
      if (utf8Bytes(body) > MAX_REQUEST_BYTES) throw new Error('Request is too large.');
      const provided = (request.headers.get('x-voomate-signature') ?? '').replace(/^v1=/, '');
      const expected = signature(options.secret, timestamp, nonce, body);
      if (!constantTimeEqual(provided, expected)) throw new Error('Invalid signature.');

      const parsed = JSON.parse(body) as ProtocolBody;
      if (parsed.connectionId !== options.connectionId) throw new Error('Wrong connection.');
      if (parsed.operation === 'describe') {
        await options.onAudit?.({
          capability: 'describe',
          status: 'success',
          latencyMs: Date.now() - startedAt,
        });
        return signedResponse(options.secret, timestamp, nonce, {
          ok: true,
          protocolVersion: PROTOCOL_VERSION,
          capabilities: manifest,
        });
      }
      if (parsed.operation !== 'query' || !parsed.input || Array.isArray(parsed.input)) {
        throw new Error('Malformed request.');
      }
      capabilityName = parsed.capability;
      const capability = options.capabilities[parsed.capability];
      if (!capability) throw new Error('Capability is not allowed.');
      validateReadCapabilityInput(capability, parsed.input);
      const timeoutMs = Math.min(Math.max(capability.timeoutMs ?? 4_000, 100), 10_000);
      const result = await Promise.race([
        Promise.resolve(capability.read(Object.freeze({ ...parsed.input }))),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Read timed out.')), timeoutMs),
        ),
      ]);
      const data = projectPublicFields(result, capability.publicFields);
      const responseBody = { ok: true, data };
      if (utf8Bytes(JSON.stringify(responseBody)) > MAX_RESPONSE_BYTES) {
        throw new Error('Filtered response is too large.');
      }
      await options.onAudit?.({
        capability: capabilityName,
        status: 'success',
        latencyMs: Date.now() - startedAt,
      });
      return signedResponse(options.secret, timestamp, nonce, responseBody);
    } catch {
      await options.onAudit?.({
        capability: capabilityName,
        status: 'denied',
        latencyMs: Date.now() - startedAt,
      });
      // Do not disclose whether the signature, connection, capability, or validation failed.
      return signedResponse(
        options.secret,
        timestamp,
        nonce,
        { ok: false, error: 'Request denied.' },
        401,
      );
    }
  };
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  const version = isIP(normalized);

  if (version === 4) {
    const [first = 0, second = 0] = normalized.split('.').map(Number);
    if (first === 0 || first === 10 || first === 127) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && (second === 0 || second === 168)) return true;
    if (first === 198 && (second === 18 || second === 19)) return true;
    return first >= 224;
  }

  if (version === 6) {
    if (normalized === '::' || normalized === '::1') return true;
    if (/^(fc|fd|fe[89ab]|ff)/.test(normalized)) return true;

    const dottedMapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
    if (dottedMapped?.[1]) return isPrivateAddress(dottedMapped[1]);
    const hexMapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
    if (hexMapped?.[1] && hexMapped[2]) {
      const high = Number.parseInt(hexMapped[1], 16);
      const low = Number.parseInt(hexMapped[2], 16);
      return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return false;
  }

  return true;
}

async function assertSafeEndpoint(value: string, allowLoopback: boolean): Promise<URL> {
  const url = new URL(value);
  if (url.username || url.password || url.hash) throw new Error('Unsafe endpoint.');
  const loopbackHost =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(allowLoopback && loopbackHost && url.protocol === 'http:')) {
    throw new Error('Endpoint must use HTTPS.');
  }
  if (loopbackHost && allowLoopback) return url;
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Endpoint resolves to a private address.');
  }
  return url;
}

async function limitedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
    throw new Error('Response too large.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('Response too large.');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function invokeProtocol(
  options: Omit<InvokeReadOnlyOptions, 'capability' | 'input'>,
  bodyValue: ProtocolBody,
): Promise<unknown> {
  const url = await assertSafeEndpoint(options.endpoint, options.allowInsecureLoopback === true);
  const timestamp = String(Date.now());
  const nonce = randomBytes(24).toString('base64url');
  const body = JSON.stringify(bodyValue);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(Math.max(options.timeoutMs ?? 5_000, 500), 10_000),
  );
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'user-agent': '@voomate/connect-read/0.1.0',
        'x-voomate-protocol': PROTOCOL_VERSION,
        'x-voomate-timestamp': timestamp,
        'x-voomate-nonce': nonce,
        'x-voomate-signature': `v1=${signature(options.secret, timestamp, nonce, body)}`,
      },
      body,
    });
    const responseBody = await limitedText(response);
    const responseTimestamp = response.headers.get('x-voomate-response-timestamp') ?? '';
    const provided = response.headers.get('x-voomate-response-signature') ?? '';
    const expected = signature(
      options.secret,
      `${timestamp}:${responseTimestamp}`,
      nonce,
      responseBody,
    );
    if (!constantTimeEqual(provided, expected)) throw new Error('Invalid response signature.');
    if (
      !/^\d{13}$/.test(responseTimestamp) ||
      Math.abs(Date.now() - Number(responseTimestamp)) > MAX_CLOCK_SKEW_MS
    ) {
      throw new Error('Expired response.');
    }
    const parsed = JSON.parse(responseBody) as {
      ok?: boolean;
      data?: unknown;
      capabilities?: unknown;
    };
    if (!response.ok || parsed.ok !== true)
      throw new Error('Read-only endpoint denied the request.');
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

export async function describeReadOnlyEndpoint(
  options: Omit<InvokeReadOnlyOptions, 'capability' | 'input'>,
): Promise<ReadCapabilityManifest[]> {
  const result = (await invokeProtocol(options, {
    operation: 'describe',
    connectionId: options.connectionId,
  })) as { capabilities?: ReadCapabilityManifest[] };
  if (!Array.isArray(result.capabilities)) throw new Error('Invalid capability manifest.');
  // Reuse strict SDK validation without ever executing a capability.
  for (const item of result.capabilities) validateCapability({ ...item, read: () => undefined });
  return result.capabilities;
}

export async function invokeReadOnlyCapability(
  options: InvokeReadOnlyOptions,
): Promise<ReadOnlyInvocationResult> {
  const result = (await invokeProtocol(options, {
    operation: 'query',
    connectionId: options.connectionId,
    capability: options.capability,
    input: options.input ?? {},
  })) as { data?: unknown };
  if (!result.data || typeof result.data !== 'object')
    throw new Error('Invalid filtered response.');
  const data = result.data as Record<string, unknown> | Array<Record<string, unknown>>;
  const first = Array.isArray(data) ? data[0] : data;
  return { data, outputFields: first ? Object.keys(first) : [] };
}

export const readOnlyProtocolVersion = PROTOCOL_VERSION;
export const __testing = { isPrivateAddress };
