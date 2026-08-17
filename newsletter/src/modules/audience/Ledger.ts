import { Static } from 'ivue/extras';

// invariant: at most one email per (subscriber, post), ever — the D1
// `sends` table IS the invariant. Every sender (cron drip, /broadcast,
// admin targeted send) writes this one ledger, so none can repeat what
// another already delivered. Deleting a row is the ONLY way to allow a
// repeat, and only the admin force-resend path does that, explicitly.
class $Ledger {
  static async sentSetForSlug(env: Env, slug: string): Promise<Set<string>> {
    const { results } = await env.DB.prepare(
      'SELECT email FROM sends WHERE slug = ?',
    )
      .bind(slug)
      .all<{ email: string }>();
    return new Set(results.map((row) => row.email));
  }

  // The whole ledger in one query — the drip planner folds it into
  // per-subscriber sent-sets and last-send times.
  static async allRows(env: Env): Promise<SendRow[]> {
    const { results } = await env.DB.prepare(
      'SELECT email, slug, sent_at AS sentAt FROM sends',
    ).all<SendRow>();
    return results;
  }

  // Everything one address has already received, newest first — the
  // dashboard's "emails already sent to this person" panel.
  static async historyFor(env: Env, address: string): Promise<SendRow[]> {
    const { results } = await env.DB.prepare(
      'SELECT email, slug, sent_at AS sentAt FROM sends WHERE email = ? ORDER BY sent_at DESC',
    )
      .bind(address)
      .all<SendRow>();
    return results;
  }

  static async record(
    env: Env,
    entries: { email: string; slug: string; sentAt: number }[],
  ): Promise<void> {
    if (!entries.length) return;
    await env.DB.batch(
      entries.map((entry) =>
        env.DB.prepare(
          'INSERT OR IGNORE INTO sends (email, slug, sent_at) VALUES (?, ?, ?)',
        ).bind(entry.email, entry.slug, entry.sentAt),
      ),
    );
  }

  // Force-resend support: erase the (email, slug) rows so the very next
  // send may repeat. Admin-only, always explicit.
  static async erase(
    env: Env,
    addresses: string[],
    slug: string,
  ): Promise<void> {
    if (!addresses.length) return;
    await env.DB.batch(
      addresses.map((address) =>
        env.DB.prepare('DELETE FROM sends WHERE email = ? AND slug = ?').bind(
          address,
          slug,
        ),
      ),
    );
  }

  static async statsPerPost(env: Env): Promise<PostSendStats[]> {
    const { results } = await env.DB.prepare(
      'SELECT slug, COUNT(*) AS sendCount, MAX(sent_at) AS lastSentAt ' +
        'FROM sends GROUP BY slug ORDER BY lastSentAt DESC',
    ).all<PostSendStats>();
    return results;
  }

  static async totalSends(env: Env): Promise<number> {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM sends',
    ).first<{ total: number }>();
    return row?.total ?? 0;
  }
}

export namespace Ledger {
  export const $Class = Static($Ledger);
  export let Class = $Class;
}

export interface SendRow {
  email: string;
  slug: string;
  sentAt: number;
}

export interface PostSendStats {
  slug: string;
  sendCount: number;
  lastSentAt: number;
}
