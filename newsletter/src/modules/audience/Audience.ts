import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';

// The audience layer — subscribers and the global suppression table.
// D1 is the single source of truth (Postmark has no contact-list
// product); a subscriber row belongs to one list, the same email may
// join several lists, and an unsubscribe suppresses the ADDRESS across
// every list — matching Postmark's per-address suppression model.
class $Audience {
  static get DEFAULT_LIST() {
    return 'newsletter';
  }

  static get PAGE_LIMIT_MAXIMUM() {
    return 200;
  }

  // Active recipients of one list: subscribed and not suppressed.
  static async active(env: Env, list: string): Promise<Subscriber[]> {
    const { results } = await env.DB.prepare(
      'SELECT email, name, timezone FROM subscribers WHERE list = ? ' +
        'AND email NOT IN (SELECT email FROM unsubscribes)',
    )
      .bind(list)
      .all<Subscriber>();
    return results;
  }

  // Subscribe (public form or admin add). A returning subscriber cancels
  // any previous unsubscribe — the sequence RESUMES, it never restarts,
  // because the sends ledger survives. A known timezone updates; an
  // unknown one (admin add, curl) never clobbers a captured value.
  static async enroll(
    env: Env,
    address: string,
    name: string,
    list: string,
    timezone: string | null = null,
  ): Promise<void> {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO subscribers (email, list, name, subscribed_at, timezone) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(email, list) DO UPDATE SET name = excluded.name, ' +
          'timezone = COALESCE(excluded.timezone, timezone)',
      ).bind(address, list, name, Http.Class.nowSeconds(), timezone || null),
      env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?').bind(address),
    ]);
  }

  static async suppress(env: Env, address: string): Promise<void> {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO unsubscribes (email, unsubscribed_at) VALUES (?, ?)',
    )
      .bind(address, Http.Class.nowSeconds())
      .run();
  }

  static async unsuppress(env: Env, address: string): Promise<void> {
    await env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?')
      .bind(address)
      .run();
  }

  static async suppressMany(env: Env, addresses: string[]): Promise<void> {
    if (!addresses.length) return;
    const timestamp = Http.Class.nowSeconds();
    await env.DB.batch(
      addresses.map((address) =>
        env.DB.prepare(
          'INSERT OR REPLACE INTO unsubscribes (email, unsubscribed_at) VALUES (?, ?)',
        ).bind(address, timestamp),
      ),
    );
  }

  static async unsuppressMany(env: Env, addresses: string[]): Promise<void> {
    if (!addresses.length) return;
    await env.DB.batch(
      addresses.map((address) =>
        env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?').bind(
          address,
        ),
      ),
    );
  }

  // Remove addresses from the audience entirely (every list). With
  // purgeSends the ledger rows go too — the address would be re-dripped
  // from the beginning if it ever re-subscribes.
  static async removeMany(
    env: Env,
    addresses: string[],
    purgeSends: boolean,
  ): Promise<void> {
    if (!addresses.length) return;
    const statements = addresses.flatMap((address) => [
      env.DB.prepare('DELETE FROM subscribers WHERE email = ?').bind(address),
      env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?').bind(address),
      ...(purgeSends
        ? [env.DB.prepare('DELETE FROM sends WHERE email = ?').bind(address)]
        : []),
    ]);
    await env.DB.batch(statements);
  }

  // One page of the audience with per-subscriber aggregates — what the
  // dashboard table renders. Search matches email or name.
  static async page(
    env: Env,
    query: AudiencePageQuery,
  ): Promise<AudiencePage> {
    const list = query.list ?? '';
    const search = (query.search ?? '').trim();
    const searchPattern = `%${search}%`;
    const limit = Math.min(
      Math.max(1, query.limit ?? 50),
      this.PAGE_LIMIT_MAXIMUM,
    );
    const offset = Math.max(0, query.offset ?? 0);
    const whereClause =
      "WHERE (?1 = '' OR subscriber.list = ?1) " +
      "AND (?2 = '' OR subscriber.email LIKE ?3 OR subscriber.name LIKE ?3)";
    const [{ results: rows }, totalRow] = await Promise.all([
      env.DB.prepare(
        'SELECT subscriber.email, subscriber.list, subscriber.name, ' +
          'subscriber.timezone, ' +
          'subscriber.subscribed_at AS subscribedAt, ' +
          'suppression.unsubscribed_at AS unsubscribedAt, ' +
          '(SELECT COUNT(*) FROM sends WHERE sends.email = subscriber.email) AS sendCount, ' +
          '(SELECT MAX(sent_at) FROM sends WHERE sends.email = subscriber.email) AS lastSentAt ' +
          'FROM subscribers subscriber ' +
          'LEFT JOIN unsubscribes suppression ON suppression.email = subscriber.email ' +
          whereClause +
          ' ORDER BY subscriber.subscribed_at DESC, subscriber.email LIMIT ?4 OFFSET ?5',
      )
        .bind(list, search, searchPattern, limit, offset)
        .all<SubscriberRow>(),
      env.DB.prepare(
        'SELECT COUNT(*) AS total FROM subscribers subscriber ' + whereClause,
      )
        .bind(list, search, searchPattern)
        .first<{ total: number }>(),
    ]);
    return { total: totalRow?.total ?? 0, rows, limit, offset };
  }

  // Every membership row for one address, plus its suppression state.
  static async memberships(
    env: Env,
    address: string,
  ): Promise<SubscriberRow[]> {
    const { results } = await env.DB.prepare(
      'SELECT subscriber.email, subscriber.list, subscriber.name, ' +
        'subscriber.timezone, ' +
        'subscriber.subscribed_at AS subscribedAt, ' +
        'suppression.unsubscribed_at AS unsubscribedAt, ' +
        '(SELECT COUNT(*) FROM sends WHERE sends.email = subscriber.email) AS sendCount, ' +
        '(SELECT MAX(sent_at) FROM sends WHERE sends.email = subscriber.email) AS lastSentAt ' +
        'FROM subscribers subscriber ' +
        'LEFT JOIN unsubscribes suppression ON suppression.email = subscriber.email ' +
        'WHERE subscriber.email = ?',
    )
      .bind(address)
      .all<SubscriberRow>();
    return results;
  }

  static async lists(env: Env): Promise<ListSummary[]> {
    const { results } = await env.DB.prepare(
      'SELECT list, COUNT(*) AS members, ' +
        'SUM(CASE WHEN email NOT IN (SELECT email FROM unsubscribes) THEN 1 ELSE 0 END) AS active ' +
        'FROM subscribers GROUP BY list ORDER BY list',
    ).all<ListSummary>();
    return results;
  }

  static async signupsByDay(env: Env, days: number): Promise<DayCount[]> {
    const since = Http.Class.nowSeconds() - days * 86_400;
    const { results } = await env.DB.prepare(
      "SELECT date(subscribed_at, 'unixepoch') AS day, COUNT(*) AS count " +
        'FROM subscribers WHERE subscribed_at >= ? GROUP BY day ORDER BY day',
    )
      .bind(since)
      .all<DayCount>();
    return results;
  }
}

export namespace Audience {
  export const $Class = Static($Audience);
  export let Class = $Class;
}

export interface Subscriber {
  email: string;
  name: string;
  // IANA zone captured at signup; null/absent = unknown (drip falls
  // back to the default_timezone setting)
  timezone?: string | null;
}

export interface SubscriberRow extends Subscriber {
  list: string;
  subscribedAt: number;
  unsubscribedAt: number | null;
  sendCount: number;
  lastSentAt: number | null;
}

export interface AudiencePageQuery {
  list?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AudiencePage {
  total: number;
  rows: SubscriberRow[];
  limit: number;
  offset: number;
}

export interface ListSummary {
  list: string;
  members: number;
  active: number;
}

export interface DayCount {
  day: string;
  count: number;
}
