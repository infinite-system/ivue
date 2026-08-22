import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { LocalTime } from '../platform/LocalTime';
import { Posts } from '../content/Posts';
import { Settings } from '../config/Settings';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { Delivery } from './Delivery';
import type { Post } from '../content/Posts';
import type { Subscriber } from '../audience/Audience';
import type { SendRow } from '../audience/Ledger';
import type {
  DripSchedule,
  ListScheduleOverrides,
} from '../config/Settings';

// The drip: each due subscriber receives their oldest unsent post,
// every `cadenceDays` calendar days, at `sendHourLocal` in the
// subscriber's OWN timezone (their default-zone stand-in when unknown).
// The rule is calendar-based on purpose: "at least N local days since
// the last send" never drifts the way hour arithmetic does (a send at
// 9:03 must not push the next one to 10am). The cron fires HOURLY;
// `plan()` is the pure decision — the cron, the /drip endpoint, and the
// dashboard's drip preview all read the same plan, so what the preview
// shows IS what the cron does.
class $Drip {
  // how far ahead nextDueAt() scans before giving up (hour steps);
  // generous headroom over the largest allowed cadence
  static get DUE_SCAN_LIMIT_HOURS() {
    return (Settings.Class.CADENCE_MAXIMUM_DAYS + 2) * 24;
  }

  // Is this hour-aligned instant a send slot for this subscriber?
  // Slot = the local hour matches, and the last send is at least
  // cadenceDays LOCAL CALENDAR DAYS ago (never-sent = always old enough).
  static isSendSlot(
    epochSeconds: number,
    lastSentAt: number,
    timezone: string,
    schedule: DripSchedule,
  ): boolean {
    if (LocalTime.Class.hourAt(epochSeconds, timezone) !== schedule.sendHourLocal)
      return false;
    if (!lastSentAt) return true;
    return (
      LocalTime.Class.dayNumberAt(epochSeconds, timezone) -
        LocalTime.Class.dayNumberAt(lastSentAt, timezone) >=
      schedule.cadenceDays
    );
  }

  // The first send slot at or after `fromEpoch` — hour-by-hour scan
  // (DST-proof: every step re-asks Intl what the local clock says).
  static nextDueAt(
    fromEpoch: number,
    lastSentAt: number,
    timezone: string,
    schedule: DripSchedule,
  ): number {
    const hourStart = Math.floor(fromEpoch / 3600) * 3600;
    for (let step = 0; step <= this.DUE_SCAN_LIMIT_HOURS; step++) {
      const candidate = hourStart + step * 3600;
      if (this.isSendSlot(candidate, lastSentAt, timezone, schedule))
        return candidate;
    }
    return hourStart; // unreachable with valid settings; fail safe
  }

  static zoneOf(subscriber: Subscriber, schedule: DripSchedule): string {
    return (
      LocalTime.Class.normalizeTimezone(subscriber.timezone) ||
      schedule.defaultTimezone
    );
  }

  static plan(
    posts: Post[],
    recipients: Subscriber[],
    sendRows: SendRow[],
    schedule: DripSchedule,
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
      const timezone = this.zoneOf(recipient, schedule);
      return {
        email: recipient.email,
        name: recipient.name,
        timezone,
        nextSlug: nextPost?.slug ?? null,
        sentCount: sent.size,
        lastSentAt: lastSentAt || null,
        dueAt: this.nextDueAt(now, lastSentAt, timezone, schedule),
        sendNow:
          Boolean(nextPost) &&
          this.isSendSlot(now, lastSentAt, timezone, schedule),
      };
    });
  }

  // The whole audience's plan: EVERY list, each on its own effective
  // schedule (per-list overrides over the defaults). An email enrolled
  // in several lists is planned once, under the FIRST list that
  // carries it (list order), so one pass never queues it twice.
  static async planAll(env: Env, now: number): Promise<DripPlanEntry[]> {
    const posts = await Posts.Class.load(env); // oldest first
    if (!posts.length) return [];
    const lists = await Audience.Class.lists(env);
    const sendRows = await Ledger.Class.allRows(env);
    const defaults = await Settings.Class.dripSchedule(env);
    const overrides = await Settings.Class.listOverrides(env);

    const planned = new Set<string>();
    const entries: DripPlanEntry[] = [];
    for (const { list } of lists) {
      const recipients = (await Audience.Class.active(env, list)).filter(
        (recipient) => !planned.has(recipient.email),
      );
      if (!recipients.length) continue;
      for (const recipient of recipients) planned.add(recipient.email);
      const schedule = { ...defaults, ...overrides[list] };
      entries.push(
        ...this.plan(posts, recipients, sendRows, schedule, now).map(
          (entry) => ({ ...entry, list }),
        ),
      );
    }
    return entries;
  }

  // One full pass: plan every list, group due subscribers by the post
  // they are owed, one batched send per slug.
  static async run(env: Env): Promise<number> {
    const posts = await Posts.Class.load(env);
    if (!posts.length) return 0;
    const entries = await this.planAll(env, Http.Class.nowSeconds());

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
  static async preview(env: Env): Promise<DripPreview> {
    const [defaults, overrides, entries] = await Promise.all([
      Settings.Class.dripSchedule(env),
      Settings.Class.listOverrides(env),
      this.planAll(env, Http.Class.nowSeconds()),
    ]);
    return { ...defaults, listOverrides: overrides, entries };
  }
}

export namespace Drip {
  export const $Class = Static($Drip);
  export let Class = $Class;
}

export interface DripPreview extends DripSchedule {
  listOverrides: ListScheduleOverrides;
  entries: DripPlanEntry[];
}

export interface DripPlanEntry {
  email: string;
  name: string;
  timezone: string;
  list?: string;
  nextSlug: string | null;
  sentCount: number;
  lastSentAt: number | null;
  dueAt: number;
  sendNow: boolean;
}
