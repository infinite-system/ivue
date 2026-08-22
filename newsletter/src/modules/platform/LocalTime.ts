import { Static } from 'ivue/extras';

// Wall-clock arithmetic in a subscriber's own timezone, built on Intl
// (the only DST-correct way to do this without a tz database of our
// own). Two primitives cover the whole drip: the local HOUR at an
// instant, and the local DAY NUMBER at an instant — "send at 9am local,
// at least N calendar days after the last send" needs nothing else.
class $LocalTime {
  static get DEFAULT_TIMEZONE() {
    return 'America/Toronto';
  }

  // one formatter per zone, cached — Intl.DateTimeFormat construction
  // is the expensive part
  static formatters = new Map<string, Intl.DateTimeFormat>();

  static formatter(timezone: string): Intl.DateTimeFormat {
    let cached = this.formatters.get(timezone);
    if (!cached) {
      cached = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
      });
      this.formatters.set(timezone, cached);
    }
    return cached;
  }

  static isValidTimezone(timezone: string): boolean {
    if (!timezone) return false;
    try {
      this.formatter(timezone);
      return true;
    } catch {
      return false;
    }
  }

  // normalized: a valid IANA zone, or '' (caller falls back)
  static normalizeTimezone(timezone: unknown): string {
    const candidate = String(timezone ?? '').trim();
    return this.isValidTimezone(candidate) ? candidate : '';
  }

  // the local hour (0–23) at this instant, in this zone
  static hourAt(epochSeconds: number, timezone: string): number {
    const parts = this.formatter(timezone).formatToParts(
      new Date(epochSeconds * 1000),
    );
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    // Intl quirk: some engines render midnight as "24"
    return hour === 24 ? 0 : hour;
  }

  // the local calendar day as a monotonic number (days since epoch of
  // the LOCAL date) — two instants are "the same local day" iff equal
  static dayNumberAt(epochSeconds: number, timezone: string): number {
    const parts = this.formatter(timezone).formatToParts(
      new Date(epochSeconds * 1000),
    );
    const value = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    return Math.floor(
      Date.UTC(value('year'), value('month') - 1, value('day')) / 86_400_000,
    );
  }
}

export namespace LocalTime {
  export const $Class = Static($LocalTime);
  export let Class = $Class;
}
