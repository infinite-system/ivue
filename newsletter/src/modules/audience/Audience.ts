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
      'SELECT email, name, timezone FROM subscriber WHERE list = ? ' +
        'AND email NOT IN (SELECT email FROM unsubscribe)',
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
        'INSERT INTO subscriber (email, list, name, subscribed_at, timezone) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(email, list) DO UPDATE SET name = excluded.name, ' +
          'timezone = COALESCE(excluded.timezone, timezone)',
      ).bind(address, list, name, Http.Class.nowSeconds(), timezone || null),
      env.DB.prepare('DELETE FROM unsubscribe WHERE email = ?').bind(address),
      // organic lists self-register, so the registry is always complete
      env.DB.prepare(
        'INSERT OR IGNORE INTO list (name, created_at) VALUES (?, ?)',
      ).bind(list, Http.Class.nowSeconds()),
    ]);
  }

  static async suppress(env: Env, address: string): Promise<void> {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO unsubscribe (email, unsubscribed_at) VALUES (?, ?)',
    )
      .bind(address, Http.Class.nowSeconds())
      .run();
  }

  static async unsuppress(env: Env, address: string): Promise<void> {
    await env.DB.prepare('DELETE FROM unsubscribe WHERE email = ?')
      .bind(address)
      .run();
  }

  static async suppressMany(env: Env, addresses: string[]): Promise<void> {
    if (!addresses.length) return;
    const timestamp = Http.Class.nowSeconds();
    await env.DB.batch(
      addresses.map((address) =>
        env.DB.prepare(
          'INSERT OR REPLACE INTO unsubscribe (email, unsubscribed_at) VALUES (?, ?)',
        ).bind(address, timestamp),
      ),
    );
  }

  static async unsuppressMany(env: Env, addresses: string[]): Promise<void> {
    if (!addresses.length) return;
    await env.DB.batch(
      addresses.map((address) =>
        env.DB.prepare('DELETE FROM unsubscribe WHERE email = ?').bind(
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
      env.DB.prepare('DELETE FROM subscriber WHERE email = ?').bind(address),
      env.DB.prepare('DELETE FROM unsubscribe WHERE email = ?').bind(address),
      ...(purgeSends
        ? [env.DB.prepare('DELETE FROM send WHERE email = ?').bind(address)]
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
          '(SELECT COUNT(*) FROM send WHERE send.email = subscriber.email) AS sendCount, ' +
          '(SELECT MAX(sent_at) FROM send WHERE send.email = subscriber.email) AS lastSentAt ' +
          'FROM subscriber subscriber ' +
          'LEFT JOIN unsubscribe suppression ON suppression.email = subscriber.email ' +
          whereClause +
          ' ORDER BY subscriber.subscribed_at DESC, subscriber.email LIMIT ?4 OFFSET ?5',
      )
        .bind(list, search, searchPattern, limit, offset)
        .all<SubscriberRow>(),
      env.DB.prepare(
        'SELECT COUNT(*) AS total FROM subscriber subscriber ' + whereClause,
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
        '(SELECT COUNT(*) FROM send WHERE send.email = subscriber.email) AS sendCount, ' +
        '(SELECT MAX(sent_at) FROM send WHERE send.email = subscriber.email) AS lastSentAt ' +
        'FROM subscriber subscriber ' +
        'LEFT JOIN unsubscribe suppression ON suppression.email = subscriber.email ' +
        'WHERE subscriber.email = ?',
    )
      .bind(address)
      .all<SubscriberRow>();
    return results;
  }

  // valid list names: short lowercase slugs — they ride URLs, settings
  // keys, and the signup payload
  static get LIST_NAME_PATTERN() {
    return /^[a-z0-9][a-z0-9-]{0,39}$/;
  }

  static normalizeListName(name: unknown): string {
    const candidate = String(name ?? '')
      .trim()
      .toLowerCase();
    if (!this.LIST_NAME_PATTERN.test(candidate))
      throw new Error(
        'List names are 1–40 chars: lowercase letters, digits, dashes.',
      );
    return candidate;
  }

  // Every known list — the registry unioned with anything organically
  // present on subscriber rows — with membership aggregates. Empty
  // registered lists appear with zero members.
  static async lists(env: Env): Promise<ListSummary[]> {
    const { results } = await env.DB.prepare(
      'SELECT registry.name AS list, COUNT(subscriber.email) AS members, ' +
        'COALESCE(SUM(CASE WHEN subscriber.email NOT IN (SELECT email FROM unsubscribe) THEN 1 ELSE 0 END), 0) AS active ' +
        'FROM (SELECT name FROM list UNION SELECT DISTINCT list FROM subscriber) registry ' +
        'LEFT JOIN subscriber subscriber ON subscriber.list = registry.name ' +
        'GROUP BY registry.name ORDER BY registry.name',
    ).all<ListSummary>();
    return results;
  }

  static async createList(env: Env, name: string): Promise<string> {
    const list = this.normalizeListName(name);
    const existing = await env.DB.prepare(
      'SELECT name FROM list WHERE name = ? ' +
        'UNION SELECT DISTINCT list FROM subscriber WHERE list = ?',
    )
      .bind(list, list)
      .first<{ name: string }>();
    if (existing) throw new Error(`List "${list}" already exists.`);
    await this.registerList(env, list);
    return list;
  }

  static async registerList(env: Env, list: string): Promise<void> {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO list (name, created_at) VALUES (?, ?)',
    )
      .bind(list, Http.Class.nowSeconds())
      .run();
  }

  // Rename everywhere the name lives: registry, subscriber rows, and —
  // via the caller (AdminApi) — the per-list schedule overrides.
  static async renameList(env: Env, from: string, to: string): Promise<string> {
    const source = this.normalizeListName(from);
    const target = this.normalizeListName(to);
    if (source === this.DEFAULT_LIST)
      throw new Error(`"${this.DEFAULT_LIST}" is the default list — it cannot be renamed.`);
    const collision = await env.DB.prepare(
      'SELECT name FROM list WHERE name = ? ' +
        'UNION SELECT DISTINCT list FROM subscriber WHERE list = ?',
    )
      .bind(target, target)
      .first<{ name: string }>();
    if (collision) throw new Error(`List "${target}" already exists.`);
    await env.DB.batch([
      env.DB.prepare(
        'INSERT OR IGNORE INTO list (name, created_at) VALUES (?, ?)',
      ).bind(target, Http.Class.nowSeconds()),
      env.DB.prepare('DELETE FROM list WHERE name = ?').bind(source),
      env.DB.prepare('UPDATE subscriber SET list = ? WHERE list = ?').bind(
        target,
        source,
      ),
    ]);
    return target;
  }

  // Delete refuses while members remain — moving or removing people is
  // an explicit, separate operation, never a side effect.
  static async deleteList(env: Env, name: string): Promise<void> {
    const list = this.normalizeListName(name);
    if (list === this.DEFAULT_LIST)
      throw new Error(`"${this.DEFAULT_LIST}" is the default list — it cannot be deleted.`);
    const member = await env.DB.prepare(
      'SELECT email FROM subscriber WHERE list = ? LIMIT 1',
    )
      .bind(list)
      .first<{ email: string }>();
    if (member)
      throw new Error(
        `List "${list}" still has members — move or remove them first.`,
      );
    await env.DB.prepare('DELETE FROM list WHERE name = ?').bind(list).run();
  }

  static async signupsByDay(env: Env, days: number): Promise<DayCount[]> {
    const since = Http.Class.nowSeconds() - days * 86_400;
    const { results } = await env.DB.prepare(
      "SELECT date(subscribed_at, 'unixepoch') AS day, COUNT(*) AS count " +
        'FROM subscriber WHERE subscribed_at >= ? GROUP BY day ORDER BY day',
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
