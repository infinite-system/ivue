import { Static } from 'ivue/extras';
import { LocalTime } from '../platform/LocalTime';

// Operator settings — D1-stored overrides with env-var fallback, so a
// fresh database behaves exactly like the wrangler.jsonc defaults and
// the dashboard can retune without a deploy. The drip cadence is
// timezone-aware: every N calendar days, at hour H in each
// subscriber's OWN timezone (default zone covers unknown addresses).
class $Settings {
  static get CADENCE_DAYS_KEY() {
    return 'cadence_days';
  }

  static get SEND_HOUR_KEY() {
    return 'send_hour_local';
  }

  static get DEFAULT_TIMEZONE_KEY() {
    return 'default_timezone';
  }

  static get TWEET_TEMPLATE_KEY() {
    return 'tweet_template';
  }

  // {title} and {url} are filled by the composer from the picked post
  static get TWEET_TEMPLATE_DEFAULT() {
    return 'New on the ivue blog — {title}\n\n{url}';
  }

  static get TWEET_CONTENT_TEMPLATE_KEY() {
    return 'tweet_content_template';
  }

  // the content-mode prefill — article substance in the tweet itself,
  // banner attached natively; {description} joins the placeholders
  static get TWEET_CONTENT_TEMPLATE_DEFAULT() {
    return '{title}\n\n{description}\n\n{url}';
  }

  static get CADENCE_MINIMUM_DAYS() {
    return 1;
  }

  static get CADENCE_MAXIMUM_DAYS() {
    return 30; // one email a month, at the slowest
  }

  static async cadenceDays(env: Env): Promise<number> {
    // NaN for a missing row — Number(null) is 0, which must never pass
    // validation as a real stored value
    const raw = await this.read(env, this.CADENCE_DAYS_KEY);
    const stored = raw === null ? NaN : Number(raw);
    if (this.isValidCadenceDays(stored)) return stored;
    return Number(env.CADENCE_DAYS);
  }

  static async setCadenceDays(env: Env, days: number): Promise<void> {
    if (!this.isValidCadenceDays(days))
      throw new Error(
        `Cadence must be ${this.CADENCE_MINIMUM_DAYS}–${this.CADENCE_MAXIMUM_DAYS} days.`,
      );
    await this.write(env, this.CADENCE_DAYS_KEY, String(days));
  }

  static async sendHourLocal(env: Env): Promise<number> {
    const raw = await this.read(env, this.SEND_HOUR_KEY);
    const stored = raw === null ? NaN : Number(raw);
    if (this.isValidSendHour(stored)) return stored;
    return Number(env.SEND_HOUR_LOCAL);
  }

  static async setSendHourLocal(env: Env, hour: number): Promise<void> {
    if (!this.isValidSendHour(hour))
      throw new Error('Send hour must be 0–23 (local time).');
    await this.write(env, this.SEND_HOUR_KEY, String(hour));
  }

  static async defaultTimezone(env: Env): Promise<string> {
    const stored = LocalTime.Class.normalizeTimezone(
      await this.read(env, this.DEFAULT_TIMEZONE_KEY),
    );
    return (
      stored ||
      LocalTime.Class.normalizeTimezone(env.DEFAULT_TIMEZONE) ||
      LocalTime.Class.DEFAULT_TIMEZONE
    );
  }

  static async setDefaultTimezone(env: Env, timezone: string): Promise<void> {
    const normalized = LocalTime.Class.normalizeTimezone(timezone);
    if (!normalized)
      throw new Error('Default timezone must be a valid IANA zone.');
    await this.write(env, this.DEFAULT_TIMEZONE_KEY, normalized);
  }

  // the drip's default clock in one read
  static async dripSchedule(env: Env): Promise<DripSchedule> {
    const [cadenceDays, sendHourLocal, defaultTimezone] = await Promise.all([
      this.cadenceDays(env),
      this.sendHourLocal(env),
      this.defaultTimezone(env),
    ]);
    return { cadenceDays, sendHourLocal, defaultTimezone };
  }

  // ---- per-list schedule overrides ----------------------------------
  // Each list may override cadence and send hour (keys
  // `list:<name>:cadence_days` / `list:<name>:send_hour_local`);
  // anything not overridden inherits the defaults above.

  static listCadenceKey(list: string): string {
    return `list:${list}:${this.CADENCE_DAYS_KEY}`;
  }

  static listSendHourKey(list: string): string {
    return `list:${list}:${this.SEND_HOUR_KEY}`;
  }

  static async listOverrides(env: Env): Promise<ListScheduleOverrides> {
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM settings WHERE key LIKE 'list:%'",
    ).all<{ key: string; value: string }>();
    const overrides: ListScheduleOverrides = {};
    for (const row of results) {
      const match = row.key.match(/^list:(.+):([a-z_]+)$/);
      if (!match) continue;
      const [, list, key] = match;
      const entry = (overrides[list] ??= {});
      const value = Number(row.value);
      if (key === this.CADENCE_DAYS_KEY && this.isValidCadenceDays(value))
        entry.cadenceDays = value;
      if (key === this.SEND_HOUR_KEY && this.isValidSendHour(value))
        entry.sendHourLocal = value;
    }
    return overrides;
  }

  // the effective clock for one list: overrides over defaults
  static async dripScheduleForList(
    env: Env,
    list: string,
  ): Promise<DripSchedule> {
    const [defaults, overrides] = await Promise.all([
      this.dripSchedule(env),
      this.listOverrides(env),
    ]);
    return { ...defaults, ...overrides[list] };
  }

  // save one list's overrides; null/undefined clears back to inherit
  static async setListSchedule(
    env: Env,
    list: string,
    schedule: { cadenceDays?: number | null; sendHourLocal?: number | null },
  ): Promise<void> {
    const name = list.trim();
    if (!name) throw new Error('List name required.');
    if (schedule.cadenceDays === null || schedule.cadenceDays === undefined) {
      await this.remove(env, this.listCadenceKey(name));
    } else {
      if (!this.isValidCadenceDays(Number(schedule.cadenceDays)))
        throw new Error(
          `Cadence must be ${this.CADENCE_MINIMUM_DAYS}–${this.CADENCE_MAXIMUM_DAYS} days.`,
        );
      await this.write(
        env,
        this.listCadenceKey(name),
        String(schedule.cadenceDays),
      );
    }
    if (
      schedule.sendHourLocal === null ||
      schedule.sendHourLocal === undefined
    ) {
      await this.remove(env, this.listSendHourKey(name));
    } else {
      if (!this.isValidSendHour(Number(schedule.sendHourLocal)))
        throw new Error('Send hour must be 0–23 (local time).');
      await this.write(
        env,
        this.listSendHourKey(name),
        String(schedule.sendHourLocal),
      );
    }
  }

  static async tweetTemplate(env: Env): Promise<string> {
    return (
      (await this.read(env, this.TWEET_TEMPLATE_KEY)) ||
      this.TWEET_TEMPLATE_DEFAULT
    );
  }

  static async setTweetTemplate(env: Env, template: string): Promise<void> {
    await this.write(env, this.TWEET_TEMPLATE_KEY, this.validTemplate(template));
  }

  static async tweetContentTemplate(env: Env): Promise<string> {
    return (
      (await this.read(env, this.TWEET_CONTENT_TEMPLATE_KEY)) ||
      this.TWEET_CONTENT_TEMPLATE_DEFAULT
    );
  }

  static async setTweetContentTemplate(
    env: Env,
    template: string,
  ): Promise<void> {
    await this.write(
      env,
      this.TWEET_CONTENT_TEMPLATE_KEY,
      this.validTemplate(template),
    );
  }

  static validTemplate(template: string): string {
    const trimmed = template.trim();
    if (!trimmed || trimmed.length > 500)
      throw new Error('Template must be 1–500 characters.');
    return trimmed;
  }

  static isValidCadenceDays(days: number): boolean {
    return (
      Number.isInteger(days) &&
      days >= this.CADENCE_MINIMUM_DAYS &&
      days <= this.CADENCE_MAXIMUM_DAYS
    );
  }

  static isValidSendHour(hour: number): boolean {
    return Number.isInteger(hour) && hour >= 0 && hour <= 23;
  }

  static async read(env: Env, key: string): Promise<string | null> {
    const row = await env.DB.prepare(
      'SELECT value FROM settings WHERE key = ?',
    )
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  }

  static async write(env: Env, key: string, value: string): Promise<void> {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    )
      .bind(key, value)
      .run();
  }

  static async remove(env: Env, key: string): Promise<void> {
    await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
  }
}

export namespace Settings {
  export const $Class = Static($Settings);
  export let Class = $Class;
}

export interface DripSchedule {
  cadenceDays: number;
  sendHourLocal: number;
  defaultTimezone: string;
}

export type ListScheduleOverrides = Record<
  string,
  { cadenceDays?: number; sendHourLocal?: number }
>;
