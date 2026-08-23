import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';

// Blog comments — pending-by-default moderation. A submission lands as
// `pending` and is invisible everywhere public until the operator
// approves it from the dashboard; spam therefore has zero payoff. The
// public read path serves approved rows only and NEVER includes the
// email column.
class $Comments {
  static get NAME_MAXIMUM_LENGTH() {
    return 80;
  }

  static get BODY_MAXIMUM_LENGTH() {
    return 2000;
  }

  static get PAGE_LIMIT_MAXIMUM() {
    return 200;
  }

  // Same address shape the subscribe path enforces.
  static get EMAIL_PATTERN() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  // Validate and store a submission as pending. Returns the stored row
  // id; throws with a reader-facing message on invalid input.
  static async submit(
    env: Env,
    submission: { slug: string; name: string; email: string; body: string },
  ): Promise<number> {
    const slug = String(submission.slug ?? '').trim();
    const name = String(submission.name ?? '')
      .trim()
      .slice(0, this.NAME_MAXIMUM_LENGTH);
    const email = String(submission.email ?? '')
      .trim()
      .toLowerCase();
    const body = String(submission.body ?? '').trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Bad post slug.');
    if (!name) throw new Error('A name is required.');
    if (!this.EMAIL_PATTERN.test(email))
      throw new Error('That email address does not look right.');
    if (!body) throw new Error('The comment is empty.');
    if (body.length > this.BODY_MAXIMUM_LENGTH)
      throw new Error(
        `Comments are capped at ${this.BODY_MAXIMUM_LENGTH} characters.`,
      );
    const outcome = await env.DB.prepare(
      'INSERT INTO comments (slug, name, email, body, submitted_at, status) ' +
        "VALUES (?, ?, ?, ?, ?, 'pending')",
    )
      .bind(slug, name, email, body, Http.Class.nowSeconds())
      .run();
    return Number(
      (outcome as { meta?: { last_row_id?: number } }).meta?.last_row_id ?? 0,
    );
  }

  // The public read: approved only, oldest first (a conversation reads
  // downward), and WITHOUT the email column — the projection is the
  // privacy guarantee.
  static async approvedFor(env: Env, slug: string): Promise<PublicComment[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, name, body, submitted_at AS submittedAt FROM comments ' +
        "WHERE slug = ? AND status = 'approved' ORDER BY submitted_at",
    )
      .bind(slug)
      .all<PublicComment>();
    return results;
  }

  // The dashboard page: pending first (the moderation queue), then
  // newest; optional status filter and recipient/slug/body search.
  static async page(env: Env, query: CommentPageQuery): Promise<CommentPage> {
    const status = (query.status ?? '').trim();
    const search = (query.search ?? '').trim();
    const searchPattern = `%${search}%`;
    const limit = Math.min(
      Math.max(1, query.limit ?? 50),
      this.PAGE_LIMIT_MAXIMUM,
    );
    const offset = Math.max(0, query.offset ?? 0);
    const whereClause =
      "WHERE (?1 = '' OR status = ?1) " +
      "AND (?2 = '' OR slug LIKE ?3 OR name LIKE ?3 OR email LIKE ?3 OR body LIKE ?3)";
    const [{ results: rows }, totalRow] = await Promise.all([
      env.DB.prepare(
        'SELECT id, slug, name, email, body, submitted_at AS submittedAt, status ' +
          'FROM comments ' +
          whereClause +
          " ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, submitted_at DESC " +
          'LIMIT ?4 OFFSET ?5',
      )
        .bind(status, search, searchPattern, limit, offset)
        .all<CommentRow>(),
      env.DB.prepare('SELECT COUNT(*) AS total FROM comments ' + whereClause)
        .bind(status, search, searchPattern)
        .first<{ total: number }>(),
    ]);
    return { total: totalRow?.total ?? 0, rows, limit, offset };
  }

  static async pendingCount(env: Env): Promise<number> {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM comments WHERE status = 'pending'",
    ).first<{ total: number }>();
    return row?.total ?? 0;
  }

  // Approve — the ONLY path onto the public site.
  static async approve(env: Env, id: number): Promise<boolean> {
    const outcome = await env.DB.prepare(
      "UPDATE comments SET status = 'approved' WHERE id = ?",
    )
      .bind(id)
      .run();
    return (outcome as { meta: { changes: number } }).meta.changes > 0;
  }

  static async remove(env: Env, id: number): Promise<boolean> {
    const outcome = await env.DB.prepare('DELETE FROM comments WHERE id = ?')
      .bind(id)
      .run();
    return (outcome as { meta: { changes: number } }).meta.changes > 0;
  }
}

export namespace Comments {
  export const $Class = Static($Comments);
  export let Class = $Class;
}

export interface PublicComment {
  id: number;
  name: string;
  body: string;
  submittedAt: number;
}

export interface CommentRow extends PublicComment {
  slug: string;
  email: string;
  status: 'pending' | 'approved';
}

export interface CommentPageQuery {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CommentPage {
  total: number;
  rows: CommentRow[];
  limit: number;
  offset: number;
}
