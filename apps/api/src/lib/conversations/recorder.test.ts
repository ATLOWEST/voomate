/**
 * The recorder, against a stand-in database.
 *
 * Two properties matter more than the SQL: it must never make the caller wait, and it must never
 * throw at the caller. Everything else it does is an insert.
 */
import type { AgentId, OrganizationId } from '@voomate/core';
import type { Database } from '@voomate/db';
import { getTableName } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { ConversationRecorder } from './recorder.js';

interface Insert {
  table: string;
  values: Record<string, unknown>[];
}

interface Update {
  table: string;
  set: Record<string, unknown>;
}

/**
 * A drizzle-shaped fake. It records what was asked of it rather than executing anything, and
 * `stall` lets a test hold a write open to prove the caller is not waiting on it.
 */
class FakeDb {
  readonly inserts: Insert[] = [];
  readonly updates: Update[] = [];
  failNext = false;
  private release: (() => void) | undefined;

  /** Block the next write until `resume()` is called. */
  stall(): void {
    this.gate = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  resume(): void {
    this.release?.();
    this.gate = undefined;
  }

  private gate: Promise<void> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(table: any) {
    return {
      values: async (values: Record<string, unknown> | Record<string, unknown>[]) => {
        if (this.gate !== undefined) await this.gate;
        if (this.failNext) {
          this.failNext = false;
          throw new Error('connection terminated unexpectedly');
        }
        this.inserts.push({
          table: getTableName(table),
          values: Array.isArray(values) ? values : [values],
        });
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(table: any) {
    return {
      set: (set: Record<string, unknown>) => ({
        where: async () => {
          if (this.gate !== undefined) await this.gate;
          this.updates.push({ table: getTableName(table), set });
        },
      }),
    };
  }

  rows(table: string): Record<string, unknown>[] {
    return this.inserts.filter((insert) => insert.table === table).flatMap((i) => i.values);
  }
}

const ORG = '11111111-1111-1111-1111-111111111111' as OrganizationId;
const AGENT = '22222222-2222-2222-2222-222222222222' as AgentId;

const build = (
  overrides: Partial<ConstructorParameters<typeof ConversationRecorder>[0]> = {},
): { recorder: ConversationRecorder; db: FakeDb; logs: Record<string, unknown>[] } => {
  const db = new FakeDb();
  const logs: Record<string, unknown>[] = [];
  const recorder = new ConversationRecorder(
    {
      organizationId: ORG,
      agentId: AGENT,
      channel: 'voice',
      visitorId: 'visitor-abc',
      transcriptRetentionDays: 90,
      ...overrides,
    },
    { db: db as unknown as Database, log: (event) => logs.push(event) },
  );
  return { recorder, db, logs };
};

describe('staying off the critical path', () => {
  it('returns from record() while the database is still busy', async () => {
    // The point of the whole file. A turn that awaits a write in Tokyo spends the latency
    // budget on bookkeeping.
    const { recorder, db } = build();
    db.stall();

    const before = Date.now();
    recorder.open();
    recorder.record({ role: 'visitor', content: 'where is my order?' });
    recorder.record({ role: 'agent', content: 'let me check' });
    const elapsed = Date.now() - before;

    expect(elapsed).toBeLessThan(20);
    expect(db.inserts).toEqual([]); // genuinely nothing has been written yet

    db.resume();
    await recorder.drain();
    expect(db.rows('messages')).toHaveLength(2);
  });

  it('does not throw at the caller when a write fails', async () => {
    const { recorder, db, logs } = build();
    db.failNext = true;

    expect(() => {
      recorder.open();
      recorder.record({ role: 'visitor', content: 'hello' });
    }).not.toThrow();

    await expect(recorder.drain()).resolves.toBeUndefined();
    expect(logs.some((entry) => entry.event === 'recorder.failed')).toBe(true);
  });

  it('keeps recording after a failed write', async () => {
    // A single dropped insert must not silently end the transcript.
    const { recorder, db } = build();
    recorder.open();
    // Flush the conversations insert before setting failNext, so the failure
    // targets the first *message* insert — not the conversation row itself.
    await recorder.drain();
    db.failNext = true;
    recorder.record({ role: 'visitor', content: 'first' });
    recorder.record({ role: 'agent', content: 'second' });
    await recorder.drain();

    expect(db.rows('messages').map((row) => row.content)).toEqual(['second']);
  });

  it('writes in the order the conversation happened', async () => {
    const { recorder, db } = build();
    recorder.open();
    for (const content of ['one', 'two', 'three', 'four']) {
      recorder.record({ role: 'visitor', content });
    }
    await recorder.drain();

    expect(db.inserts[0]!.table).toBe('conversations'); // before any message references it
    expect(db.rows('messages').map((row) => row.content)).toEqual(['one', 'two', 'three', 'four']);
  });
});

describe('the conversation row', () => {
  it('is created once, however many turns arrive', async () => {
    const { recorder, db } = build();
    recorder.open();
    recorder.open();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.drain();

    expect(db.rows('conversations')).toHaveLength(1);
  });

  it('is opened implicitly by the first turn', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.drain();

    expect(db.rows('conversations')).toHaveLength(1);
  });

  it('sets the purge date from the agent’s retention policy', async () => {
    // Computed on the way in. A cleanup job that has to work out what policy applied at the
    // time cannot do it once the agent's settings have changed.
    const { recorder, db } = build({ transcriptRetentionDays: 30 });
    recorder.open();
    await recorder.drain();

    const row = db.rows('conversations')[0]!;
    const days =
      ((row.purgeAfter as Date).getTime() - (row.startedAt as Date).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it('records nothing at all when the visitor never spoke', async () => {
    // A visitor who opens the widget and leaves is not a conversation, and a table full of
    // empty ones makes every analytic wrong.
    const { recorder, db } = build();
    await recorder.close();

    expect(db.inserts).toEqual([]);
    expect(db.updates).toEqual([]);
  });
});

describe('what a turn stores', () => {
  it('keeps citations, latency and grounding', async () => {
    const { recorder, db } = build();
    recorder.record({
      role: 'agent',
      content: 'You have 30 days.',
      language: 'en-US',
      citations: [{ documentId: 'doc-1' as never, title: 'Returns', score: 0.82 }],
      latency: { totalToFirstAudioMs: 1331 },
      grounding: { topSimilarity: 0.82, sourceCount: 3, citedDocumentIds: [], ungrounded: false },
    });
    await recorder.drain();

    const row = db.rows('messages')[0]!;
    expect(row.language).toBe('en-US');
    expect(row.citations).toHaveLength(1);
    expect(row.latency).toEqual({ totalToFirstAudioMs: 1331 });
    expect((row.grounding as { topSimilarity: number }).topSimilarity).toBe(0.82);
  });

  it('keeps what the visitor actually heard when they interrupted', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'agent', content: 'You have 30 d—', interrupted: true });
    await recorder.drain();

    expect(db.rows('messages')[0]!.interrupted).toBe(true);
  });

  it('truncates a turn that is too long to be a sentence', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'agent', content: 'x'.repeat(50_000) });
    await recorder.drain();

    expect((db.rows('messages')[0]!.content as string).length).toBe(8_000);
  });

  it('stops recording a conversation that will not end', async () => {
    const { recorder, db, logs } = build();
    for (let i = 0; i < 450; i += 1) recorder.record({ role: 'visitor', content: `turn ${i}` });
    await recorder.drain();

    expect(db.rows('messages')).toHaveLength(400);
    expect(recorder.dropped).toBe(50);
    // Once, not fifty times.
    expect(logs.filter((entry) => entry.event === 'recorder.turn_cap')).toHaveLength(1);
  });
});

describe('closing', () => {
  it('counts the turns and marks the conversation done', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    recorder.record({ role: 'agent', content: 'hello' });
    await recorder.close();

    const update = db.updates.find((entry) => entry.table === 'conversations')!;
    expect(update.set.status).toBe('ended');
    expect(update.set.messageCount).toBe(2);
    expect(update.set.endedAt).toBeInstanceOf(Date);
  });

  it('notices when the visitor switched language mid-conversation', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'order kahan hai?', language: 'hi-IN' });
    recorder.record({ role: 'visitor', content: 'is it shipped?', language: 'en-IN' });
    await recorder.close();

    const update = db.updates.find((entry) => entry.table === 'conversations')!;
    expect(update.set.multilingual).toBe(true);
    expect(update.set.detectedLanguage).toBe('hi-IN');
  });

  it('does not call one language multilingual', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hello', language: 'en-US' });
    recorder.record({ role: 'agent', content: 'hi', language: 'en-US' });
    await recorder.close();

    expect(db.updates[0]!.set.multilingual).toBe(false);
  });

  it('writes usage for a voice conversation in minutes of wall clock', async () => {
    // Transcribe streams for the whole session whether anyone speaks or not, so wall clock is
    // what it actually costs us.
    let clock = 1_000_000;
    const db = new FakeDb();
    const recorder = new ConversationRecorder(
      {
        organizationId: ORG,
        agentId: AGENT,
        channel: 'voice',
        visitorId: 'v',
        transcriptRetentionDays: 90,
      },
      { db: db as unknown as Database, now: () => clock },
    );

    recorder.record({ role: 'visitor', content: 'hi' });
    clock += 90_000;
    await recorder.close();

    const usage = db.rows('usage_records');
    const voice = usage.find((row) => row.kind === 'voice_minutes')!;
    expect(voice.quantity).toBeCloseTo(1.5, 5);
  });

  it('bills a text conversation for messages and not for minutes', async () => {
    const { recorder, db } = build({ channel: 'text' });
    recorder.record({ role: 'visitor', content: 'hi' });
    recorder.record({ role: 'agent', content: 'hello' });
    recorder.record({ role: 'system', content: 'session ended' });
    await recorder.close();

    const usage = db.rows('usage_records');
    expect(usage.map((row) => row.kind)).toEqual(['text_messages']);
    // The system note is ours, not theirs.
    expect(usage[0]!.quantity).toBe(2);
  });

  it('buckets usage by the hour the conversation started', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.close();

    const periodHour = db.rows('usage_records')[0]!.periodHour as Date;
    expect(periodHour.getUTCMinutes()).toBe(0);
    expect(periodHour.getUTCSeconds()).toBe(0);
    expect(periodHour.getUTCMilliseconds()).toBe(0);
  });

  it('ignores turns recorded after the conversation ended', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.close();
    recorder.record({ role: 'visitor', content: 'too late' });
    await recorder.drain();

    expect(db.rows('messages')).toHaveLength(1);
  });

  it('is safe to close twice', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.close();
    await recorder.close();

    expect(db.updates.filter((entry) => entry.table === 'conversations')).toHaveLength(1);
  });

  it('records an abandoned conversation as abandoned', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    await recorder.close('abandoned');

    expect(db.updates[0]!.set.status).toBe('abandoned');
  });

  it('waits for everything queued before it resolves', async () => {
    const { recorder, db } = build();
    recorder.record({ role: 'visitor', content: 'hi' });
    db.stall();
    const closing = recorder.close();
    const settled = vi.fn();
    void closing.then(settled);

    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    db.resume();
    await closing;
    expect(db.rows('usage_records').length).toBeGreaterThan(0);
  });
});
