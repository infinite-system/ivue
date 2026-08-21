import { Static } from 'ivue/extras';

// Operator settings — D1-stored overrides with env-var fallback, so a
// fresh database behaves exactly like the wrangler.jsonc defaults and
// the dashboard can retune without a deploy. First setting: the drip
// cadence (minimum hours between two emails to the same subscriber).
class $Settings {
  static get CADENCE_KEY() {
    return 'cadence_hours';
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

  static get CADENCE_MINIMUM_HOURS() {
    return 1;
  }

  static get CADENCE_MAXIMUM_HOURS() {
    return 720; // one email a month, at the slowest
  }

  static async cadenceHours(env: Env): Promise<number> {
    const stored = Number(await this.read(env, this.CADENCE_KEY));
    if (this.isValidCadence(stored)) return stored;
    return Number(env.CADENCE_HOURS);
  }

  static async setCadenceHours(env: Env, hours: number): Promise<void> {
    if (!this.isValidCadence(hours))
      throw new Error(
        `Cadence must be ${this.CADENCE_MINIMUM_HOURS}–${this.CADENCE_MAXIMUM_HOURS} hours.`,
      );
    await this.write(env, this.CADENCE_KEY, String(hours));
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

  static isValidCadence(hours: number): boolean {
    return (
      Number.isFinite(hours) &&
      hours >= this.CADENCE_MINIMUM_HOURS &&
      hours <= this.CADENCE_MAXIMUM_HOURS
    );
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
}

export namespace Settings {
  export const $Class = Static($Settings);
  export let Class = $Class;
}
