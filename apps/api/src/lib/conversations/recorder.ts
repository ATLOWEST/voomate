/**
 * Writing conversations down.
 *
 * Until this file existed, `conversations` and `messages` were empty tables with RLS policies
 * guarding nothing. Every question anyone had ever asked was discarded when the socket closed.
 *
 * The whole design follows from one number: the database is 208 ms away. A single awaited insert
 * in the middle of a voice turn would spend the entire 1.2 s speech-to-speech budget on
 * bookkeeping. So:
 *
 * 1. **Nothing here is ever awaited on the turn path.** `open` and `record` return `void`. They
 *    append to a chain of promises that drains behind the conversation.
 * 2. **Order is guaranteed, timing is not.** Writes are chained rather than fired in parallel,
 *    because the conversation row has to exist before its messages reference it, and turn three
 *    must not land before turn two.
 * 3. **A failed write never reaches the visitor.** Errors are logged and swallowed. Dropping
 *    someone's call because an analytics insert timed out trades the product for its telemetry.
 *
 * The cost of that choice is honest: if the process dies mid-conversation, the tail of the
 * queue is lost. That is the right trade for a transcript. It would be the wrong trade for
 * anything a merchant is billed on, which is why usage records are counted here and written on
 * close rather than being reconstructed from messages later.
 */
import { randomUUID } from 'node:crypto';
import type {
  AgentId,
  Citation,
  ConversationId,
  MessageLatency,
  OrganizationId,
  TurnGrounding,
} from '@voomate/core';
import { conversations, messages, usageRecords, type Database } from '@voomate/db';
import { eq, sql } from 'drizzle-orm';

export interface RecorderOptions {
  organizationId: OrganizationId;
  agentId: AgentId;
  channel: 'voice' | 'text';
  /** Anonymous per-browser identifier. Never joined to a user. */
  visitorId: string;
  pageUrl?: string;
  /** From the agent. The purge date is computed on the way in, not guessed later by a job. */
  transcriptRetentionDays: number;
  /** Pre-generated so the caller can put it on the wire before the row exists. */
  conversationId?: string;
}

export interface RecordedTurn {
  role: 'visitor' | 'agent' | 'system';
  content: string;
  language?: string;
  citations?: readonly Citation[];
  /** The visitor talked over this answer. `content` is what they actually heard. */
  interrupted?: boolean;
  latency?: MessageLatency;
  grounding?: TurnGrounding;
}

export interface RecorderDeps {
  db: Database;
  log?: (event: Record<string, unknown>) => void;
  now?: () => number;
}

/** Beyond this a transcript is not a conversation, it is a stuck loop writing to our database. */
const MAX_TURNS = 400;

/** Postgres will take far more, but a turn this long is a bug upstream, not a sentence. */
const MAX_CONTENT_CHARS = 8_000;

export class ConversationRecorder {
  readonly conversationId: string;

  private readonly db: Database;
  private readonly log: (event: Record<string, unknown>) => void;
  private readonly now: () => number;

  /** The write chain. Every enqueued write appends to this; nothing else awaits it. */
  private queue: Promise<void> = Promise.resolve();
  private opened = false;
  private closed = false;
  private turns = 0;
  private droppedTurns = 0;
  private startedAtMs: number;
  private languages = new Set<string>();
  private textTurns = 0;

  constructor(
    private readonly options: RecorderOptions,
    deps: RecorderDeps,
  ) {
    this.db = deps.db;
    this.log = deps.log ?? (() => undefined);
    this.now = deps.now ?? (() => Date.now());
    this.conversationId = options.conversationId ?? randomUUID();
    this.startedAtMs = this.now();
  }

  /** How many turns were dropped for exceeding the cap. Surfaced in tests and logs. */
  get dropped(): number {
    return this.droppedTurns;
  }

  /** Create the conversation row. Safe to call once; later calls are ignored. */
  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.startedAtMs = this.now();

    const purgeAfter = new Date(
      this.startedAtMs + this.options.transcriptRetentionDays * 24 * 60 * 60 * 1000,
    );

    this.enqueue('open', async () => {
      await this.db.insert(conversations).values({
        id: this.conversationId,
        organizationId: this.options.organizationId,
        agentId: this.options.agentId,
        channel: this.options.channel,
        status: 'active',
        visitorId: this.options.visitorId,
        ...(this.options.pageUrl !== undefined ? { pageUrl: this.options.pageUrl } : {}),
        startedAt: new Date(this.startedAtMs),
        purgeAfter,
      });
    });
  }

  /**
   * Append a turn.
   *
   * Called from the middle of a live conversation, so it does no work beyond appending to the
   * queue — no validation round trip, no read-back, no await.
   */
  record(turn: RecordedTurn): void {
    if (this.closed) return;
    if (!this.opened) this.open();

    if (this.turns >= MAX_TURNS) {
      // Logged once, at the boundary, so a runaway session is visible without a log per turn.
      if (this.droppedTurns === 0) {
        this.log({ event: 'recorder.turn_cap', conversationId: this.conversationId });
      }
      this.droppedTurns += 1;
      return;
    }
    this.turns += 1;

    const content = turn.content.slice(0, MAX_CONTENT_CHARS);
    if (turn.language !== undefined) this.languages.add(turn.language);
    // Billing counts what a visitor asked and what the agent answered, not system notes.
    if (turn.role !== 'system') this.textTurns += 1;

    const createdAt = new Date(this.now());

    this.enqueue('record', async () => {
      await this.db.insert(messages).values({
        organizationId: this.options.organizationId,
        conversationId: this.conversationId,
        role: turn.role,
        content,
        ...(turn.language !== undefined ? { language: turn.language } : {}),
        ...(turn.citations !== undefined ? { citations: turn.citations } : {}),
        ...(turn.interrupted === true ? { interrupted: true } : {}),
        ...(turn.latency !== undefined ? { latency: turn.latency } : {}),
        ...(turn.grounding !== undefined ? { grounding: turn.grounding } : {}),
        createdAt,
      });
    });
  }

  /**
   * Finish the conversation and settle the queue.
   *
   * The one method that is awaited, and only after the socket has already been closed — by then
   * the visitor is gone and a slow write costs nobody anything.
   */
  async close(status: 'completed' | 'abandoned' | 'failed' = 'completed'): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (!this.opened) return; // Nothing was ever said. No row, nothing to close.

    // Map recorder status names to the DB enum values.
    // 'completed' → 'ended'; 'failed' → 'abandoned' (the schema doesn't distinguish
    // a clean close from a crash — both are over).
    const dbStatus =
      status === 'completed'
        ? ('ended' as const)
        : status === 'failed'
          ? ('abandoned' as const)
          : ('abandoned' as const);

    const endedAt = new Date(this.now());
    const durationMs = endedAt.getTime() - this.startedAtMs;
    const languages = [...this.languages];
    const turns = this.turns;
    const textTurns = this.textTurns;

    this.enqueue('close', async () => {
      await this.db
        .update(conversations)
        .set({
          status: dbStatus,
          endedAt,
          messageCount: turns,
          // The primary language is the first one heard; `multilingual` is the interesting bit,
          // and it is the honest definition — more than one language actually appeared.
          ...(languages[0] !== undefined ? { detectedLanguage: languages[0] } : {}),
          multilingual: languages.length > 1,
        })
        .where(eq(conversations.id, this.conversationId));
    });

    this.enqueue('usage', async () => {
      const periodHour = new Date(this.startedAtMs);
      periodHour.setUTCMinutes(0, 0, 0);

      const baseFields = {
        organizationId: this.options.organizationId,
        agentId: this.options.agentId,
        conversationId: this.conversationId,
        periodHour,
      };

      // Billed per minute of session wall-clock, which is what the media path actually costs:
      // Transcribe streams for the whole session whether or not anyone is speaking.
      if (this.options.channel === 'voice') {
        await this.db.insert(usageRecords).values([
          { ...baseFields, kind: 'text_messages' as const, quantity: textTurns },
          { ...baseFields, kind: 'voice_minutes' as const, quantity: durationMs / 60_000 },
        ]);
      } else {
        await this.db
          .insert(usageRecords)
          .values([{ ...baseFields, kind: 'text_messages' as const, quantity: textTurns }]);
      }
    });

    await this.drain();
  }

  /** Wait for everything queued so far. Tests use this; the turn path never does. */
  async drain(): Promise<void> {
    await this.queue;
  }

  private enqueue(step: string, work: () => Promise<void>): void {
    this.queue = this.queue.then(async () => {
      try {
        await work();
      } catch (error) {
        // Deliberately terminal. The conversation is the product; its transcript is not, and a
        // rethrow here would surface as an unhandled rejection in the middle of a live call.
        this.log({
          event: 'recorder.failed',
          step,
          conversationId: this.conversationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}

/**
 * Mark a conversation as having ended badly without a full recorder.
 *
 * Used by the socket's shutdown path when the session never got far enough to have one.
 */
export const markConversationFailed = async (
  db: Database,
  conversationId: ConversationId,
): Promise<void> => {
  await db
    .update(conversations)
    .set({ status: 'abandoned', endedAt: sql`now()` })
    .where(eq(conversations.id, conversationId));
};
