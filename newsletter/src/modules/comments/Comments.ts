import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Security } from '../platform/Security';

// Blog comments — pending-by-default moderation. A submission lands as
// `pending` and is invisible everywhere public until the operator
// approves it from the dashboard; spam therefore has zero payoff. The
// public read path serves approved rows only and NEVER includes the
// email column.
//
// Threads are TWO levels: a top-level comment (parent_id NULL, root_id
// = own id) and its replies (root_id = the thread, parent_id = whoever
// is being answered — possibly another reply). Depth never grows past
// two; answering a reply addresses it with an @mention instead.
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

  // @mention shape in a body: "@Ada Lovelace" — up to three words so
  // display names with spaces resolve, matched against the thread's
  // own participants (never a global user table; there are no accounts).
  static get MENTION_PATTERN() {
    return /@([\p{L}\p{N}][\p{L}\p{N}'’.-]*(?:[ \t][\p{L}\p{N}][\p{L}\p{N}'’.-]*){0,2})/gu;
  }

  // Validate and store a submission as pending. Returns the stored row
  // id; throws with a reader-facing message on invalid input.
  static async submit(
    env: Env,
    submission: {
      slug: string;
      name: string;
      email: string;
      body: string;
      parentId?: number | null;
      subscribeReplies?: boolean;
    },
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

    // A reply resolves its thread from the parent, which must exist, be
    // approved (you cannot reply into an invisible comment), live on the
    // same post, and belong to an unlocked thread.
    let parentId: number | null = null;
    let rootId: number | null = null;
    const requestedParent = Number(submission.parentId ?? 0);
    if (requestedParent > 0) {
      const parent = await this.rowFor(env, requestedParent);
      if (!parent || parent.status !== 'approved')
        throw new Error('That comment is no longer available.');
      if (parent.slug !== slug)
        throw new Error('That comment belongs to another post.');
      parentId = parent.id;
      rootId = parent.rootId ?? parent.id;
      if (await this.threadLocked(env, rootId))
        throw new Error('Replies are locked on this thread.');
    }

    const avatarSeed = await Security.Class.avatarSeed(email, env);
    // the opt-in is RECORDED now; the subscription row is created at
    // approval (a comment that never goes public leaves nothing behind)
    const subscribeReplies = submission.subscribeReplies !== false ? 1 : 0;
    const outcome = await env.DB.prepare(
      'INSERT INTO comments ' +
        '(slug, name, email, body, submitted_at, status, parent_id, root_id, ' +
        'avatar_seed, subscribe_replies) ' +
        "VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
    )
      .bind(
        slug,
        name,
        email,
        body,
        Http.Class.nowSeconds(),
        parentId,
        rootId,
        avatarSeed,
        subscribeReplies,
      )
      .run();
    const id = Number(
      (outcome as { meta?: { last_row_id?: number } }).meta?.last_row_id ?? 0,
    );

    // a top-level comment IS its own thread root
    if (!rootId && id > 0) {
      await env.DB.prepare('UPDATE comments SET root_id = ? WHERE id = ?')
        .bind(id, id)
        .run();
    }

    return id;
  }

  // ---- threads -------------------------------------------------------

  // One row, by id — the internal shape (email included; callers are
  // server-side only).
  static async rowFor(env: Env, id: number): Promise<CommentRow | null> {
    return env.DB.prepare(
      'SELECT id, slug, name, email, body, submitted_at AS submittedAt, ' +
        'status, parent_id AS parentId, root_id AS rootId, locked, ' +
        'avatar_seed AS avatarSeed, subscribe_replies AS subscribeReplies ' +
        'FROM comments WHERE id = ?',
    )
      .bind(id)
      .first<CommentRow>();
  }

  static async threadLocked(env: Env, rootId: number): Promise<boolean> {
    const row = await env.DB.prepare(
      'SELECT locked FROM comments WHERE id = ?',
    )
      .bind(rootId)
      .first<{ locked: number }>();
    return Boolean(row?.locked);
  }

  // Lock/unlock a thread. Only meaningful on a root row; locking a
  // reply locks the thread it belongs to.
  static async setLocked(
    env: Env,
    id: number,
    locked: boolean,
  ): Promise<boolean> {
    const row = await this.rowFor(env, id);
    if (!row) return false;
    const rootId = row.rootId ?? row.id;
    const outcome = await env.DB.prepare(
      'UPDATE comments SET locked = ? WHERE id = ?',
    )
      .bind(locked ? 1 : 0, rootId)
      .run();
    return (outcome as { meta: { changes: number } }).meta.changes > 0;
  }

  // ---- reply subscriptions ------------------------------------------

  static async subscribe(
    env: Env,
    rootId: number,
    email: string,
  ): Promise<void> {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO comment_subscriptions (root_id, email, created_at) ' +
        'VALUES (?, ?, ?)',
    )
      .bind(rootId, email.trim().toLowerCase(), Http.Class.nowSeconds())
      .run();
  }

  static async unsubscribe(
    env: Env,
    rootId: number,
    email: string,
  ): Promise<boolean> {
    const outcome = await env.DB.prepare(
      'DELETE FROM comment_subscriptions WHERE root_id = ? AND email = ?',
    )
      .bind(rootId, email.trim().toLowerCase())
      .run();
    return (outcome as { meta: { changes: number } }).meta.changes > 0;
  }

  static async subscribed(
    env: Env,
    rootId: number,
    email: string,
  ): Promise<boolean> {
    const row = await env.DB.prepare(
      'SELECT 1 AS present FROM comment_subscriptions WHERE root_id = ? AND email = ?',
    )
      .bind(rootId, email.trim().toLowerCase())
      .first<{ present: number }>();
    return Boolean(row?.present);
  }

  // Who hears about a new reply. The rule, deliberately narrow:
  //   • the author of the comment being answered (parent), and
  //   • anyone @mentioned by name inside the thread.
  // The thread STARTER is not notified for deep replies unless one of
  // those two things makes them a recipient — a busy sub-thread never
  // spams the person who opened the conversation. The replier never
  // gets their own reply, and consent is always checked.
  static async replyRecipients(
    env: Env,
    reply: CommentRow,
  ): Promise<CommentRecipient[]> {
    const rootId = reply.rootId ?? reply.id;
    const { results: participants } = await env.DB.prepare(
      'SELECT id, name, email FROM comments ' +
        "WHERE root_id = ? AND status = 'approved' AND id != ? ORDER BY id",
    )
      .bind(rootId, reply.id)
      .all<{ id: number; name: string; email: string }>();

    const addressed = new Map<string, string>();
    const parent = participants.find((row) => row.id === reply.parentId);
    if (parent) addressed.set(parent.email.toLowerCase(), parent.name);

    // A display name is not an identity (anyone can type "Ada"). An
    // @mention resolves to the EARLIEST participant who used that name
    // in this thread — the original holder, never a later impostor.
    // (participants come back in id order.)
    for (const mentioned of this.mentionsIn(reply.body)) {
      const original = participants.find(
        (row) => row.name.trim().toLowerCase() === mentioned,
      );
      if (original) addressed.set(original.email.toLowerCase(), original.name);
    }

    const authorEmail = reply.email.trim().toLowerCase();
    const recipients: CommentRecipient[] = [];
    for (const [email, name] of addressed) {
      if (email === authorEmail) continue; // never your own reply
      if (!(await this.subscribed(env, rootId, email))) continue; // consent
      recipients.push({ email, name });
    }
    return recipients;
  }

  // Names mentioned in a body, lowercased. Longest-first matching is
  // unnecessary here: callers compare against real participant names.
  static mentionsIn(body: string): string[] {
    const found = new Set<string>();
    for (const match of String(body ?? '').matchAll(this.MENTION_PATTERN)) {
      const raw = match[1].trim().toLowerCase();
      // "@Ada Lovelace said" → also try the shorter prefixes, so a
      // trailing sentence word cannot swallow the name
      const words = raw.split(/\s+/);
      for (let count = words.length; count >= 1; count--)
        found.add(words.slice(0, count).join(' '));
    }
    return [...found];
  }

  // ---- reads ---------------------------------------------------------

  // The public read: approved only, oldest first (a conversation reads
  // downward), and WITHOUT the email column — the projection is the
  // privacy guarantee. Thread shape (parentId/rootId), the lock flag
  // and the avatar seed ride along; the client assembles the tree.
  static async approvedFor(env: Env, slug: string): Promise<PublicComment[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, name, body, submitted_at AS submittedAt, ' +
        'parent_id AS parentId, root_id AS rootId, locked, ' +
        'avatar_seed AS avatarSeed FROM comments ' +
        "WHERE slug = ? AND status = 'approved' ORDER BY submitted_at, id",
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
        'SELECT id, slug, name, email, body, submitted_at AS submittedAt, ' +
          'status, parent_id AS parentId, root_id AS rootId, locked, ' +
          'avatar_seed AS avatarSeed ' +
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

  // Approve — the ONLY path onto the public site. Returns true exactly
  // ONCE per comment: the WHERE clause requires 'pending', so a second
  // approve matches nothing (SQLite's `changes` counts matched rows —
  // without the status guard a re-approve would report success and the
  // caller would re-send notifications). The author's reply
  // subscription is created HERE, from the intent recorded at submit.
  static async approve(env: Env, id: number): Promise<boolean> {
    const outcome = await env.DB.prepare(
      "UPDATE comments SET status = 'approved' WHERE id = ? AND status = 'pending'",
    )
      .bind(id)
      .run();
    const approved = (outcome as { meta: { changes: number } }).meta.changes > 0;
    if (!approved) return false;
    const row = await this.rowFor(env, id);
    if (row?.subscribeReplies && (row.rootId ?? row.id))
      await this.subscribe(env, row.rootId ?? row.id, row.email);
    return true;
  }

  // Delete keeps the thread graph closed (no dangling parent_id /
  // root_id): deleting a ROOT removes the whole thread and its
  // subscriptions; deleting a REPLY re-parents the replies that
  // answered it onto the root, so they stay in the conversation.
  static async remove(env: Env, id: number): Promise<boolean> {
    const row = await this.rowFor(env, id);
    if (!row) return false;
    const rootId = row.rootId ?? row.id;
    if (!row.parentId) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM comments WHERE root_id = ?').bind(rootId),
        env.DB.prepare('DELETE FROM comment_subscriptions WHERE root_id = ?').bind(
          rootId,
        ),
      ]);
      return true;
    }
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE comments SET parent_id = ? WHERE parent_id = ?',
      ).bind(rootId, id),
      env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id),
    ]);
    return true;
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
  parentId: number | null;
  rootId: number | null;
  locked: number;
  avatarSeed: string;
}

export interface CommentRow extends PublicComment {
  slug: string;
  email: string;
  status: 'pending' | 'approved';
  subscribeReplies?: number;
}

export interface CommentRecipient {
  email: string;
  name: string;
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
