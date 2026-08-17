import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Posts } from '../content/Posts';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { Delivery } from './Delivery';
import type { Post } from '../content/Posts';
import type { Subscriber } from '../audience/Audience';
import type { SendRow } from '../audience/Ledger';

// The drip: each due subscriber receives their oldest unsent post, at
// most one email per CADENCE_HOURS. `plan()` is the pure decision —
// the cron, the /drip endpoint, and the dashboard's drip preview all
// read the same plan, so what the preview shows IS what the cron does.
class $Drip {
  static plan(
    posts: Post[],
    recipients: Subscriber[],
    sendRows: SendRow[],
    cadenceSeconds: number,
    now: number,
  ): DripPlanEntry[] {
    const sentByEmail = new Map<string, Set<string>>();
    const lastSentByEmail = new Map<string, number>();
    for (const row of sendRows) {
      let sentSet = sentByEmail.get(row.email);
      if (!sentSet) {
        sentSet = new Set();
        sentByEmail.set(row.email, sentSet);
      }
      sentSet.add(row.slug);
      lastSentByEmail.set(
        row.email,
        Math.max(lastSentByEmail.get(row.email) ?? 0, row.sentAt),
      );
    }
    return recipients.map((recipient) => {
      const sent = sentByEmail.get(recipient.email) ?? new Set();
      const nextPost = posts.find((candidate) => !sent.has(candidate.slug));
      const lastSentAt = lastSentByEmail.get(recipient.email) ?? 0;
      const dueAt = lastSentAt + cadenceSeconds;
      return {
        email: recipient.email,
        name: recipient.name,
        nextSlug: nextPost?.slug ?? null,
        sentCount: sent.size,
        lastSentAt: lastSentAt || null,
        dueAt: lastSentAt ? dueAt : now,
        sendNow: Boolean(nextPost) && now >= dueAt,
      };
    });
  }

  // One full pass: plan, group due subscribers by the post they are
  // owed, one batched send per slug. Drips the DEFAULT list only —
  // other lists are broadcast/targeted-send audiences.
  static async run(env: Env): Promise<number> {
    const posts = await Posts.Class.load(env); // oldest first
    const recipients = await Audience.Class.active(
      env,
      Audience.Class.DEFAULT_LIST,
    );
    if (!posts.length || !recipients.length) return 0;

    const sendRows = await Ledger.Class.allRows(env);
    const cadenceSeconds = Number(env.CADENCE_HOURS) * 3600;
    const entries = this.plan(
      posts,
      recipients,
      sendRows,
      cadenceSeconds,
      Http.Class.nowSeconds(),
    );

    const queueBySlug = new Map<string, Subscriber[]>();
    for (const entry of entries) {
      if (!entry.sendNow || !entry.nextSlug) continue;
      let queue = queueBySlug.get(entry.nextSlug);
      if (!queue) {
        queue = [];
        queueBySlug.set(entry.nextSlug, queue);
      }
      queue.push({ email: entry.email, name: entry.name });
    }

    let delivered = 0;
    for (const [slug, group] of queueBySlug) {
      const post = Posts.Class.find(posts, slug);
      if (post)
        delivered += (await Delivery.Class.sendPost(env, post, group))
          .delivered;
    }
    return delivered;
  }

  // The dashboard's preview: the same plan the next cron tick executes.
  static async preview(env: Env): Promise<DripPlanEntry[]> {
    const posts = await Posts.Class.load(env);
    const recipients = await Audience.Class.active(
      env,
      Audience.Class.DEFAULT_LIST,
    );
    const sendRows = await Ledger.Class.allRows(env);
    return this.plan(
      posts,
      recipients,
      sendRows,
      Number(env.CADENCE_HOURS) * 3600,
      Http.Class.nowSeconds(),
    );
  }
}

export namespace Drip {
  export const $Class = Static($Drip);
  export let Class = $Class;
}

export interface DripPlanEntry {
  email: string;
  name: string;
  nextSlug: string | null;
  sentCount: number;
  lastSentAt: number | null;
  dueAt: number;
  sendNow: boolean;
}
