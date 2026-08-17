import { Static } from 'ivue/extras';

// Operator settings — D1-stored overrides with env-var fallback, so a
// fresh database behaves exactly like the wrangler.jsonc defaults and
// the dashboard can retune without a deploy. First setting: the drip
// cadence (minimum hours between two emails to the same subscriber).
class $Settings {
  static get CADENCE_KEY() {
    return 'cadence_hours';
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
