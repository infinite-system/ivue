import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Delivery } from '../delivery/Delivery';
import { XPoster } from '../socials/XPoster';
import { Tweets } from '../socials/Tweets';

// The scheduling queue: broadcasts and X posts enqueued for a future
// time, executed by the 5-minute cron. A job is CLAIMED by stamping
// executed_at where it is still NULL — the write's changed-row count is
// the lock, so two overlapping ticks can never run the same job twice.
// One attempt per job; the outcome (ok or error) is recorded on the row,
// so executed rows double as the history and a failure stays visible
// instead of retrying blind.
class $Scheduler {
  static get KINDS() {
    return ['broadcast', 'tweet'] as const;
  }

  static async schedule(
    env: Env,
    kind: JobKind,
    payload: BroadcastPayload | TweetPayload,
    dueAt: number,
  ): Promise<ScheduledJob> {
    if (!this.KINDS.includes(kind)) throw new Error(`Unknown kind: ${kind}`);
    const now = Http.Class.nowSeconds();
    if (!Number.isFinite(dueAt) || dueAt < now - 60)
      throw new Error('Schedule time must be in the future.');
    if (kind === 'broadcast' && !(payload as BroadcastPayload).slug)
      throw new Error('A broadcast needs a post slug.');
    if (kind === 'tweet' && !(payload as TweetPayload).text?.trim())
      throw new Error('A tweet needs text.');
    await env.DB.prepare(
      'INSERT INTO scheduled_jobs (kind, payload, due_at, created_at) VALUES (?, ?, ?, ?)',
    )
      .bind(kind, JSON.stringify(payload), Math.floor(dueAt), now)
      .run();
    const row = await env.DB.prepare(
      'SELECT * FROM scheduled_jobs ORDER BY id DESC LIMIT 1',
    ).first<JobRow>();
    return this.toJob(row!);
  }

  static async list(env: Env): Promise<{
    upcoming: ScheduledJob[];
    recent: ScheduledJob[];
  }> {
    const [{ results: upcoming }, { results: recent }] = await Promise.all([
      env.DB.prepare(
        'SELECT * FROM scheduled_jobs WHERE executed_at IS NULL ORDER BY due_at',
      ).all<JobRow>(),
      env.DB.prepare(
        'SELECT * FROM scheduled_jobs WHERE executed_at IS NOT NULL ORDER BY executed_at DESC LIMIT 20',
      ).all<JobRow>(),
    ]);
    return {
      upcoming: upcoming.map((row) => this.toJob(row)),
      recent: recent.map((row) => this.toJob(row)),
    };
  }

  // Cancel = delete, and only while still pending.
  static async cancel(env: Env, id: number): Promise<boolean> {
    const outcome = await env.DB.prepare(
      'DELETE FROM scheduled_jobs WHERE id = ? AND executed_at IS NULL',
    )
      .bind(id)
      .run();
    return outcome.meta.changes > 0;
  }

  static async runDue(env: Env): Promise<number> {
    const now = Http.Class.nowSeconds();
    const { results: due } = await env.DB.prepare(
      'SELECT * FROM scheduled_jobs WHERE executed_at IS NULL AND due_at <= ? ORDER BY due_at',
    )
      .bind(now)
      .all<JobRow>();
    let executed = 0;
    for (const row of due) {
      // the claim: only the writer that flips NULL→now owns the job
      const claim = await env.DB.prepare(
        'UPDATE scheduled_jobs SET executed_at = ? WHERE id = ? AND executed_at IS NULL',
      )
        .bind(now, row.id)
        .run();
      if (claim.meta.changes === 0) continue;
      const result = await this.execute(env, row);
      await env.DB.prepare(
        'UPDATE scheduled_jobs SET result = ? WHERE id = ?',
      )
        .bind(JSON.stringify(result), row.id)
        .run();
      executed++;
    }
    return executed;
  }

  static async execute(env: Env, row: JobRow): Promise<JobResult> {
    try {
      const payload = JSON.parse(row.payload) as BroadcastPayload &
        TweetPayload;
      if (row.kind === 'broadcast') {
        const report = await Delivery.Class.broadcastPost(
          env,
          payload.slug,
          payload.list || 'newsletter',
        );
        return { ok: true, detail: `delivered ${report.delivered}, skipped ${report.skippedAsRepeat}` };
      }
      if (!XPoster.Class.credentialsPresent(env))
        return { error: 'X credentials not configured' };
      const tweet = await XPoster.Class.postWithOptionalBanner(
        env,
        payload.text.trim(),
        {
          slug: payload.slug || undefined,
          attachBanner: payload.attachBanner === '1',
        },
      );
      await Tweets.Class.record(
        env,
        {
          tweetId: tweet.tweetId,
          text: payload.text.trim(),
          slug: payload.slug || null,
        },
        Http.Class.nowSeconds(),
      );
      return { ok: true, detail: `tweet ${tweet.tweetId}` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  static toJob(row: JobRow): ScheduledJob {
    return {
      id: row.id,
      kind: row.kind,
      payload: JSON.parse(row.payload) as Record<string, string>,
      dueAt: row.due_at,
      createdAt: row.created_at,
      executedAt: row.executed_at,
      result: row.result ? (JSON.parse(row.result) as JobResult) : null,
    };
  }
}

export namespace Scheduler {
  export const $Class = Static($Scheduler);
  export let Class = $Class;
}

export type JobKind = 'broadcast' | 'tweet';

export interface BroadcastPayload {
  slug: string;
  list: string;
}

export interface TweetPayload {
  text: string;
  slug: string;
  attachBanner?: string; // '1' = fetch + attach the post banner at run time
}

export interface JobResult {
  ok?: boolean;
  detail?: string;
  error?: string;
}

export interface ScheduledJob {
  id: number;
  kind: JobKind;
  payload: Record<string, string>;
  dueAt: number;
  createdAt: number;
  executedAt: number | null;
  result: JobResult | null;
}

interface JobRow {
  id: number;
  kind: JobKind;
  payload: string;
  due_at: number;
  created_at: number;
  executed_at: number | null;
  result: string | null;
}
