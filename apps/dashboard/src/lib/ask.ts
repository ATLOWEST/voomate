'use client';

/**
 * Streaming client for the playground.
 *
 * `POST /v1/agents/:id/ask` with `Accept: text/event-stream` streams the answer back as
 * server-sent events. EventSource cannot be used — it is GET-only and cannot send an
 * Authorization header — so this reads the response body directly.
 *
 * Why stream at all for a text playground: time-to-first-token is the number the whole
 * product is designed around. A merchant who watches the answer appear word by word can feel
 * when retrieval is slow, months before a visitor hears it as a pause in a voice call.
 */
import { ErrorCode, type ErrorResponse } from '@voomate/core';
import { API_BASE_URL, ApiError } from '@/lib/api';

export interface Citation {
  documentId: string;
  title: string;
  url?: string;
  /** Cosine similarity, 0–1. Surfaced so a merchant can see a weak match for what it is. */
  score: number;
}

export interface AskLatency {
  embeddingMs: number;
  retrievalMs: number;
  firstTokenMs: number;
  totalMs: number;
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  /** Retrieval returned nothing above the floor — the corpus is thin, not the question odd. */
  ungrounded: boolean;
  latency: AskLatency;
}

export interface AskInput {
  question: string;
  history?: { role: 'visitor' | 'agent'; content: string }[];
  channel: 'voice' | 'text';
  language?: string;
}

export interface AskAuth {
  accessToken: string;
  organizationId: string;
}

export async function askStream(
  agentId: string,
  input: AskInput,
  auth: AskAuth,
  handlers: { onDelta: (text: string) => void; signal?: AbortSignal },
): Promise<AskResult> {
  const response = await fetch(`${API_BASE_URL}/v1/agents/${agentId}/ask`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${auth.accessToken}`,
      'x-organization-id': auth.organizationId,
    },
    body: JSON.stringify(input),
    ...(handlers.signal !== undefined ? { signal: handlers.signal } : {}),
    credentials: 'omit',
  });

  // Failures before the stream opens are still ordinary JSON errors — a 403 from the tenant
  // check, a 404 for an agent in someone else's org, a 400 from validation.
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    throw new ApiError(
      response.status,
      isErrorShape(payload)
        ? payload
        : { error: { code: ErrorCode.INTERNAL, message: response.statusText } },
    );
  }

  if (response.body === null) throw new Error('The API returned no response body.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AskResult | undefined;
  let failure: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line. Anything after the last one is a partial frame and
    // stays in the buffer — splitting on newlines alone would hand half a JSON object to
    // JSON.parse the moment a payload straddles two TCP packets.
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');

      const event = parseFrame(frame);
      if (event === undefined) continue;

      if (event.name === 'delta') {
        handlers.onDelta((event.data as { text: string }).text);
      } else if (event.name === 'done') {
        result = event.data as AskResult;
      } else if (event.name === 'error') {
        failure = (event.data as { message: string }).message;
      }
    }
  }

  // An `error` event arrives on a connection that already sent HTTP 200, so it cannot come
  // back as a status code. Turning it into a throw is what stops the UI rendering a failed
  // generation as a successful empty answer.
  if (failure !== undefined) throw new Error(failure);
  if (result === undefined) {
    throw new Error('The connection closed before the agent finished answering.');
  }
  return result;
}

function parseFrame(frame: string): { name: string; data: unknown } | undefined {
  let name = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return undefined;
  try {
    return { name, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return undefined;
  }
}

function isErrorShape(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  return typeof error === 'object' && error !== null && 'message' in error;
}
