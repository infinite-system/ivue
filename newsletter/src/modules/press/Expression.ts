import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { XPoster } from '../socials/XPoster';
import { Tweets } from '../socials/Tweets';
import { Scheduler } from '../schedule/Scheduler';
import { Piece } from './Piece';
import { Posting } from './Posting';
import { Projection } from './Projection';

// An expression — one platform projection of a piece. Two modes:
// DERIVED rows regenerate from the piece's base (their body is never
// patched directly — edit the base, or detach); AUTHORED rows are
// hand-written and never track the base. A thread or card set is a
// parent with segment children under it; approval sits on the parent,
// a child carries only its skip flag. Approval is of the exact text:
// any body change or regeneration of an approved row returns it to
// draft and cancels its job. Every body/meta save keeps a revision.
class $Expression {
  static readonly STATUSES: readonly string[] = [
    'draft',
    'approved',
    'scheduled',
    'due',
    'sent',
    'archived',
  ];
  /** explicit moves; edits and regeneration return to draft on their own */
  static readonly TRANSITIONS: Record<string, readonly string[]> = {
    draft: ['approved', 'archived'],
    approved: ['draft', 'scheduled', 'sent', 'archived'],
    scheduled: ['approved', 'due', 'sent', 'archived'],
    due: ['sent', 'archived'],
    sent: ['archived'],
    archived: [],
  };
  static readonly MIRROR_PLATFORMS: readonly string[] = ['bluesky', 'mastodon', 'threads'];

  /* ---- reads ---- */

  static async byId(env: Env, id: number): Promise<Expression.Record | null> {
    const row = await env.DB.prepare('SELECT * FROM expression WHERE id = ?')
      .bind(id)
      .first<Expression.Row>();
    if (!row) return null;
    const record = this.toRecord(row);
    if (Projection.Class.isParentKind(record.kind))
      record.children = await this.children(env, id);
    return record;
  }

  static async children(env: Env, parentId: number): Promise<Expression.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM expression WHERE parent_id = ? ORDER BY position, id',
    )
      .bind(parentId)
      .all<Expression.Row>();
    return results.map((row) => this.toRecord(row));
  }

  /** every top-level expression of a piece, segments nested */
  static async forPiece(env: Env, pieceId: number): Promise<Expression.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM expression WHERE piece_id = ? AND parent_id IS NULL ORDER BY position, id',
    )
      .bind(pieceId)
      .all<Expression.Row>();
    const records: Expression.Record[] = [];
    for (const row of results) {
      const record = this.toRecord(row);
      if (Projection.Class.isParentKind(record.kind))
        record.children = await this.children(env, record.id);
      records.push(record);
    }
    return records;
  }

  /** the list's rollup — one state per top-level expression */
  static async statesForPiece(env: Env, pieceId: number): Promise<Expression.State[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, kind, mode, venue, status, scheduled_at AS scheduledAt, calendar_id AS calendarId ' +
        'FROM expression WHERE piece_id = ? AND parent_id IS NULL ORDER BY position, id',
    )
      .bind(pieceId)
      .all<Expression.State>();
    return results;
  }

  static async byCalendarId(env: Env, calendarId: string): Promise<Expression.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM expression WHERE calendar_id = ? AND parent_id IS NULL ORDER BY id',
    )
      .bind(calendarId)
      .all<Expression.Row>();
    const records: Expression.Record[] = [];
    for (const row of results) records.push((await this.byId(env, row.id))!);
    return records;
  }

  /**
   * The calendar's lookup: an entry names its copy by source key — a
   * repo path the import recorded in meta.source, or an artifact key
   * (`x:thread`, `x:hooks`, `x:voice:3`) in meta.artifactKey; a group
   * key without an index matches every post of the group.
   */
  static async bySource(env: Env, key: string): Promise<Expression.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM expression WHERE parent_id IS NULL AND status != \'archived\' AND (' +
        "json_extract(meta, '$.source') = ? OR json_extract(meta, '$.artifactKey') = ? OR json_extract(meta, '$.artifactKey') LIKE ?" +
        ') ORDER BY id',
    )
      .bind(key, key, key.split(':').length === 2 ? `${key}:%` : key)
      .all<Expression.Row>();
    const records: Expression.Record[] = [];
    for (const row of results) records.push((await this.byId(env, row.id))!);
    return records;
  }

  /* ---- create ---- */

  static async create(env: Env, input: Expression.CreateInput): Promise<Expression.Record> {
    if (!Projection.Class.isKind(input.kind)) throw new Error(`Unknown kind: ${input.kind}`);
    const piece = await Piece.Class.byId(env, input.pieceId);
    if (!piece) throw new Error('No such piece.');
    const mode: Expression.Mode = input.mode === 'derived' ? 'derived' : 'authored';
    if (mode === 'derived' && !Projection.Class.isDerivable(input.kind))
      throw new Error(`${input.kind} is written by hand — it cannot derive from the base.`);
    const meta = { ...(input.meta ?? {}) };
    if (Projection.Class.RICH_KINDS.includes(input.kind) && !meta.cover && piece.banner)
      meta.cover = piece.banner;
    const derived = mode === 'derived' ? Projection.Class.derive(input.kind, piece, meta) : null;
    const segments = derived?.segments ?? input.segments ?? null;
    const body = derived ? derived.body : String(input.body ?? '');
    const now = Http.Class.nowSeconds();
    const position = await this.nextPosition(env, input.pieceId, null);
    const outcome = await env.DB.prepare(
      'INSERT INTO expression (piece_id, kind, mode, parent_id, position, label, venue, body, meta, mirrors, status, created_at, updated_at) ' +
        "VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)",
    )
      .bind(
        input.pieceId,
        input.kind,
        mode,
        position,
        String(input.label ?? ''),
        String(input.venue ?? ''),
        Projection.Class.isParentKind(input.kind) ? '' : body,
        JSON.stringify(meta),
        JSON.stringify(this.normalizeMirrors(input.mirrors)),
        now,
        now,
      )
      .run();
    const id = outcome.meta.last_row_id;
    if (Projection.Class.isParentKind(input.kind))
      await this.replaceChildren(env, id, input.pieceId, Projection.Class.childKind(input.kind), segments ?? [], now, undefined, mode);
    return (await this.byId(env, id))!;
  }

  static async addSegment(env: Env, parentId: number, body: string): Promise<Expression.Record | null> {
    const parent = await this.byId(env, parentId);
    if (!parent || !Projection.Class.isParentKind(parent.kind)) return null;
    if (parent.mode === 'derived') throw new Error('Segments of a derived thread come from the base — edit the base, or detach.');
    const now = Http.Class.nowSeconds();
    const position = await this.nextPosition(env, parent.pieceId, parentId);
    await env.DB.prepare(
      'INSERT INTO expression (piece_id, kind, mode, parent_id, position, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(parent.pieceId, Projection.Class.childKind(parent.kind), 'authored', parentId, position, String(body), now, now)
      .run();
    await this.unapproveOnChange(env, parent, 'a segment was added');
    return this.byId(env, parentId);
  }

  /* ---- edit ---- */

  /**
   * Patch fields. Body on a derived row is refused (edit the base, or
   * detach). A body/meta change writes a revision first; a change on
   * an approved (or scheduled) row returns it to draft and cancels
   * its job, because approval is of the exact text.
   */
  static async patch(
    env: Env,
    id: number,
    changes: Expression.PatchInput,
    author: Expression.Author = 'user',
  ): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    const bodyChange = changes.body !== undefined && String(changes.body) !== current.body;
    const metaChange = changes.meta !== undefined && JSON.stringify(changes.meta) !== JSON.stringify(current.meta);
    if (bodyChange && current.mode === 'derived')
      throw new Error('This text is derived from the base — edit the base, or detach the expression first.');
    const now = Http.Class.nowSeconds();
    if (bodyChange || metaChange)
      await env.DB.prepare(
        'INSERT INTO post_revision (expression_id, body, meta, author, saved_at) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(id, current.body, JSON.stringify(current.meta), author, now)
        .run();
    await env.DB.prepare(
      'UPDATE expression SET body = ?, meta = ?, label = ?, venue = ?, mirrors = ?, skipped = ?, calendar_id = ?, updated_at = ? WHERE id = ?',
    )
      .bind(
        changes.body !== undefined ? String(changes.body) : current.body,
        JSON.stringify(changes.meta !== undefined ? changes.meta : current.meta),
        changes.label !== undefined ? String(changes.label) : current.label,
        changes.venue !== undefined ? String(changes.venue) : current.venue,
        JSON.stringify(changes.mirrors !== undefined ? this.normalizeMirrors(changes.mirrors) : current.mirrors),
        changes.skipped !== undefined ? (changes.skipped ? 1 : 0) : current.skipped ? 1 : 0,
        changes.calendarId !== undefined ? changes.calendarId : current.calendarId,
        now,
        id,
      )
      .run();
    if (bodyChange || metaChange) await this.unapproveOnChange(env, current, 'the text changed');
    if (changes.skipped !== undefined && current.parentId) {
      const parent = await this.byId(env, current.parentId);
      if (parent) await this.unapproveOnChange(env, parent, 'a segment was skipped or restored');
    }
    // a segment's text change is a change of its thread's text
    if (bodyChange && current.parentId) {
      const parent = await this.byId(env, current.parentId);
      if (parent) await this.unapproveOnChange(env, parent, 'a segment changed');
    }
    return this.byId(env, current.parentId ?? id);
  }

  static async reorder(env: Env, parentId: number, orderedIds: number[]): Promise<Expression.Record | null> {
    const parent = await this.byId(env, parentId);
    if (!parent || !parent.children) return null;
    const known = new Set(parent.children.map((child) => child.id));
    if (orderedIds.length !== known.size || !orderedIds.every((childId) => known.has(childId)))
      throw new Error('The order must name every segment once.');
    for (const [position, childId] of orderedIds.entries())
      await env.DB.prepare('UPDATE expression SET position = ? WHERE id = ? AND parent_id = ?')
        .bind(position, childId, parentId)
        .run();
    await this.unapproveOnChange(env, parent, 'segments were reordered');
    return this.byId(env, parentId);
  }

  /** derived → authored, one way: the current text becomes hand-owned */
  static async detach(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    await env.DB.prepare("UPDATE expression SET mode = 'authored', updated_at = ? WHERE id = ? OR parent_id = ?")
      .bind(Http.Class.nowSeconds(), id, id)
      .run();
    return this.byId(env, id);
  }

  /** a new expression of another kind on the same piece, the body copied */
  static async clone(env: Env, id: number, kind: string): Promise<Expression.Record | null> {
    const source = await this.byId(env, id);
    if (!source) return null;
    return this.create(env, {
      pieceId: source.pieceId,
      kind,
      mode: 'authored',
      label: source.label,
      venue: '',
      body: source.children ? source.children.map((child) => child.body).join('\n\n') : source.body,
      meta: { ...source.meta },
      segments: Projection.Class.isParentKind(kind)
        ? source.children?.map((child) => child.body) ?? Projection.Class.segments(source.body)
        : null,
    });
  }

  /** every derived expression of the piece, regenerated from the base */
  static async regenerateForPiece(env: Env, pieceId: number): Promise<number> {
    const piece = await Piece.Class.byId(env, pieceId);
    if (!piece) return 0;
    const { results } = await env.DB.prepare(
      "SELECT * FROM expression WHERE piece_id = ? AND parent_id IS NULL AND mode = 'derived'",
    )
      .bind(pieceId)
      .all<Expression.Row>();
    const now = Http.Class.nowSeconds();
    for (const row of results) {
      const record = this.toRecord(row);
      const derived = Projection.Class.derive(record.kind, piece, record.meta);
      if (Projection.Class.isParentKind(record.kind)) {
        const before = await this.children(env, record.id);
        const texts = derived.segments ?? [];
        // skip flags survive by position when the count is unchanged, else clear
        const keepSkips = before.length === texts.length;
        await this.replaceChildren(
          env,
          record.id,
          pieceId,
          Projection.Class.childKind(record.kind),
          texts,
          now,
          keepSkips ? before.map((child) => child.skipped) : undefined,
        );
        const changed = !keepSkips || before.some((child, index) => child.body !== texts[index]);
        if (changed) await this.unapproveOnChange(env, record, 'the base changed');
      } else if (derived.body !== record.body) {
        await env.DB.prepare('UPDATE expression SET body = ?, updated_at = ? WHERE id = ?')
          .bind(derived.body, now, record.id)
          .run();
        await this.unapproveOnChange(env, record, 'the base changed');
      }
    }
    return results.length;
  }

  /* ---- status ---- */

  /** approval is of the exact text: the lint must pass on the live text */
  static async approve(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    const problems = this.lintRecord(current);
    if (problems.length) throw new Error(problems.join('; '));
    await this.transition(env, current, 'approved');
    return this.byId(env, id);
  }

  static async unapprove(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.status === 'scheduled') await this.cancelJob(env, current);
    await this.transition(env, current, 'draft');
    return this.byId(env, id);
  }

  static async archive(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.status === 'scheduled') await this.cancelJob(env, current);
    await this.transition(env, current, 'archived');
    return this.byId(env, id);
  }

  /** the lint over the live text — a parent lints its live segments */
  static lintRecord(record: Expression.Record): string[] {
    if (record.children) {
      const live = record.children.filter((child) => !child.skipped);
      if (!live.length) return ['every segment is skipped'];
      return live.flatMap((child, index) =>
        Projection.Class.lint(child.kind, child.body, child.meta).map(
          (problem) => `segment ${index + 1}: ${problem}`,
        ),
      );
    }
    return Projection.Class.lint(record.kind, record.body, record.meta);
  }

  static async transition(env: Env, record: Expression.Record, next: Expression.Status): Promise<void> {
    const allowed = this.TRANSITIONS[record.status] ?? [];
    if (record.status !== next && !allowed.includes(next))
      throw new Error(`${record.status} → ${next} is not a move this row can make.`);
    const now = Http.Class.nowSeconds();
    await env.DB.prepare(
      'UPDATE expression SET status = ?, approved_at = CASE WHEN ? = \'approved\' THEN ? ELSE approved_at END, ' +
        "scheduled_at = CASE WHEN ? IN ('draft', 'approved') THEN NULL ELSE scheduled_at END, updated_at = ? WHERE id = ?",
    )
      .bind(next, next, now, next, now, record.id)
      .run();
  }

  /** an approved or scheduled row whose text moved returns to draft; its job dies */
  static async unapproveOnChange(env: Env, record: Expression.Record, reason: string): Promise<void> {
    if (record.status !== 'approved' && record.status !== 'scheduled') return;
    if (record.status === 'scheduled') await this.cancelJob(env, record);
    await env.DB.prepare(
      "UPDATE expression SET status = 'draft', scheduled_at = NULL, meta = json_set(meta, '$.unapprovedBecause', ?), updated_at = ? WHERE id = ?",
    )
      .bind(reason, Http.Class.nowSeconds(), record.id)
      .run();
  }

  /* ---- scheduling ---- */

  static async schedule(
    env: Env,
    id: number,
    dueAt: number,
    platform?: string,
  ): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.status !== 'approved')
      throw new Error('Only an approved expression can be scheduled — approve the exact text first.');
    const target = platform ?? Projection.Class.platformOf(current.kind);
    await Scheduler.Class.schedule(env, 'expression', { expressionId: String(id), platform: target }, dueAt);
    await this.transition(env, current, 'scheduled');
    await env.DB.prepare('UPDATE expression SET scheduled_at = ? WHERE id = ?')
      .bind(Math.floor(dueAt), id)
      .run();
    return this.byId(env, id);
  }

  static async reschedule(env: Env, id: number, dueAt: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.status !== 'scheduled') throw new Error('Nothing is scheduled for this expression.');
    const job = await this.pendingJob(env, id);
    if (job) await Scheduler.Class.reschedule(env, job.id, dueAt);
    await env.DB.prepare('UPDATE expression SET scheduled_at = ?, updated_at = ? WHERE id = ?')
      .bind(Math.floor(dueAt), Http.Class.nowSeconds(), id)
      .run();
    return this.byId(env, id);
  }

  static async cancelSchedule(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.status !== 'scheduled') return current;
    await this.cancelJob(env, current);
    await this.transition(env, current, 'approved');
    return this.byId(env, id);
  }

  static async pendingJob(env: Env, id: number): Promise<{ id: number } | null> {
    const jobs = await Scheduler.Class.list(env);
    return (
      jobs.upcoming.find(
        (job) => job.kind === 'expression' && Number(job.payload.expressionId) === id,
      ) ?? null
    );
  }

  static async cancelJob(env: Env, record: Expression.Record): Promise<void> {
    const job = await this.pendingJob(env, record.id);
    if (job) await Scheduler.Class.cancel(env, job.id);
  }

  /**
   * The scheduler's execution of an `expression` job. The row is read
   * now, not at schedule time — but only a still-scheduled row ships;
   * an edit after scheduling already cancelled the job and returned
   * the row to draft, so this guard is the belt to that suspender.
   */
  static async executeJob(env: Env, payload: { expressionId: string; platform: string }): Promise<Scheduler.JobResult> {
    const id = Number(payload.expressionId);
    const current = await this.byId(env, id);
    if (!current) return { error: `expression ${id} no longer exists` };
    if (current.status !== 'scheduled')
      return { ok: false, detail: `expression ${id} is ${current.status}, not scheduled — nothing shipped` };
    if (payload.platform === 'x' && Projection.Class.platformOf(current.kind) === 'x') {
      if (!XPoster.Class.credentialsPresent(env)) return { error: 'X credentials not configured' };
      const posting = await this.postToX(env, current);
      return { ok: true, detail: `posted to X: ${posting.remoteIds.join(', ')}` };
    }
    await this.transition(env, current, 'due');
    return { ok: true, detail: `${payload.platform} has no API — due for manual posting` };
  }

  /* ---- posting ---- */

  /** post now through XPoster: live segments in order, one ledger row */
  static async post(env: Env, id: number): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    if (Projection.Class.platformOf(current.kind) !== 'x')
      throw new Error('Only X has an API we post to — copy the text and mark it sent.');
    if (!['approved', 'scheduled', 'due'].includes(current.status))
      throw new Error('Approve the exact text before posting.');
    if (!XPoster.Class.credentialsPresent(env)) throw new Error('X credentials not configured.');
    if (current.status === 'scheduled') await this.cancelJob(env, current);
    await this.postToX(env, current);
    return this.byId(env, id);
  }

  static async postToX(env: Env, record: Expression.Record): Promise<Posting.Record> {
    const postedAt = Http.Class.nowSeconds();
    let tweetIds: string[];
    if (record.children) {
      const live = record.children.filter((child) => !child.skipped);
      const segments = live.map((child) => ({
        text: child.body,
        imageUrls: Array.isArray(child.meta.imageUrls) ? (child.meta.imageUrls as string[]) : [],
      }));
      if (segments.length === 1) {
        const single = await XPoster.Class.postWithImages(env, segments[0].text, segments[0].imageUrls);
        tweetIds = [single.tweetId];
      } else {
        tweetIds = (await XPoster.Class.postThread(env, segments)).tweetIds;
      }
      for (const [index, tweetId] of tweetIds.entries())
        await Tweets.Class.record(env, { tweetId, text: segments[index].text, slug: null }, postedAt);
    } else {
      const single = await XPoster.Class.postWithImages(
        env,
        record.body,
        Array.isArray(record.meta.imageUrls) ? (record.meta.imageUrls as string[]) : [],
      );
      tweetIds = [single.tweetId];
      await Tweets.Class.record(env, { tweetId: single.tweetId, text: record.body, slug: null }, postedAt);
    }
    const url = `https://x.com/i/status/${tweetIds[0]}`;
    const posting = await Posting.Class.record(env, {
      expressionId: record.id,
      platform: 'x',
      venue: record.venue || 'X',
      url,
      remoteIds: tweetIds,
      postedBy: 'api',
      calendarId: record.calendarId,
      postedAt,
    });
    await this.markSentRow(env, record.id, url, postedAt);
    return posting;
  }

  /** manual: copied and posted by hand — the ledger row is the same shape */
  static async markSent(
    env: Env,
    id: number,
    sent: { url?: string; platform?: string; venue?: string; calendarId?: string | null },
  ): Promise<Expression.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    const platform = sent.platform ?? Projection.Class.platformOf(current.kind);
    const postedAt = Http.Class.nowSeconds();
    await Posting.Class.record(env, {
      expressionId: id,
      platform,
      venue: sent.venue ?? current.venue,
      url: sent.url ?? null,
      postedBy: 'manual',
      calendarId: sent.calendarId ?? current.calendarId,
      postedAt,
    });
    if (this.MIRROR_PLATFORMS.includes(platform) && platform !== Projection.Class.platformOf(current.kind)) {
      const mirrors = current.mirrors.map((mirror) =>
        mirror.platform === platform ? { ...mirror, sentAt: postedAt, url: sent.url ?? null } : mirror,
      );
      if (!mirrors.some((mirror) => mirror.platform === platform))
        mirrors.push({ platform, sentAt: postedAt, url: sent.url ?? null });
      await env.DB.prepare('UPDATE expression SET mirrors = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(mirrors), postedAt, id)
        .run();
      return this.byId(env, id);
    }
    if (current.status === 'scheduled') await this.cancelJob(env, current);
    await this.markSentRow(env, id, sent.url ?? null, postedAt);
    return this.byId(env, id);
  }

  static async markSentRow(env: Env, id: number, url: string | null, sentAt: number): Promise<void> {
    await env.DB.prepare(
      "UPDATE expression SET status = 'sent', sent_at = ?, sent_url = ?, scheduled_at = NULL, updated_at = ? WHERE id = ?",
    )
      .bind(sentAt, url, sentAt, id)
      .run();
  }

  /* ---- revisions ---- */

  static async revisions(env: Env, id: number): Promise<Expression.Revision[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, body, meta, author, saved_at AS savedAt FROM post_revision WHERE expression_id = ? ORDER BY saved_at DESC, id DESC',
    )
      .bind(id)
      .all<{ id: number; body: string; meta: string; author: string; savedAt: number }>();
    return results.map((row) => ({ ...row, meta: JSON.parse(row.meta || '{}') as Record<string, unknown> }));
  }

  /** restore = a new save of the old text; the history keeps growing */
  static async restore(env: Env, id: number, revisionId: number, author: Expression.Author = 'user'): Promise<Expression.Record | null> {
    const revision = await env.DB.prepare(
      'SELECT body, meta FROM post_revision WHERE id = ? AND expression_id = ?',
    )
      .bind(revisionId, id)
      .first<{ body: string; meta: string }>();
    if (!revision) return null;
    const current = await this.byId(env, id);
    if (!current) return null;
    if (current.mode === 'derived') await this.detach(env, id);
    return this.patch(env, id, { body: revision.body, meta: JSON.parse(revision.meta || '{}') as Record<string, unknown> }, author);
  }

  /* ---- helpers ---- */

  static async replaceChildren(
    env: Env,
    parentId: number,
    pieceId: number,
    kind: string,
    texts: string[],
    now: number,
    skips?: boolean[],
    mode: Expression.Mode = 'derived',
  ): Promise<void> {
    await env.DB.prepare('DELETE FROM expression WHERE parent_id = ?').bind(parentId).run();
    // a segment's mode follows its parent: an authored thread's tweets edit in place
    for (const [position, text] of texts.entries())
      await env.DB.prepare(
        'INSERT INTO expression (piece_id, kind, mode, parent_id, position, body, skipped, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(pieceId, kind, mode, parentId, position, text, skips?.[position] ? 1 : 0, now, now)
        .run();
  }

  static async nextPosition(env: Env, pieceId: number, parentId: number | null): Promise<number> {
    const row = await env.DB.prepare(
      parentId === null
        ? 'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM expression WHERE piece_id = ? AND parent_id IS NULL'
        : 'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM expression WHERE parent_id = ?',
    )
      .bind(parentId === null ? pieceId : parentId)
      .first<{ next: number }>();
    return row?.next ?? 0;
  }

  static normalizeMirrors(mirrors: unknown): Expression.Mirror[] {
    if (!Array.isArray(mirrors)) return [];
    return mirrors
      .map((entry) =>
        typeof entry === 'string'
          ? { platform: entry, sentAt: null, url: null }
          : {
              platform: String((entry as Expression.Mirror).platform ?? ''),
              sentAt: (entry as Expression.Mirror).sentAt ?? null,
              url: (entry as Expression.Mirror).url ?? null,
            },
      )
      .filter((mirror) => this.MIRROR_PLATFORMS.includes(mirror.platform));
  }

  static toRecord(row: Expression.Row): Expression.Record {
    return {
      id: row.id,
      pieceId: row.piece_id,
      kind: row.kind,
      mode: row.mode === 'derived' ? 'derived' : 'authored',
      parentId: row.parent_id,
      position: row.position,
      label: row.label,
      venue: row.venue,
      body: row.body,
      meta: JSON.parse(row.meta || '{}') as Record<string, unknown>,
      mirrors: JSON.parse(row.mirrors || '[]') as Expression.Mirror[],
      status: row.status as Expression.Status,
      skipped: row.skipped === 1,
      calendarId: row.calendar_id,
      approvedAt: row.approved_at,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      sentUrl: row.sent_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      children: null,
    };
  }
}

export namespace Expression {
  export const $Class = Static($Expression);
  export let Class = $Class;

  export type Mode = 'derived' | 'authored';
  export type Status = 'draft' | 'approved' | 'scheduled' | 'due' | 'sent' | 'archived';
  export type Author = 'user' | 'agent';

  export interface Mirror {
    platform: string;
    sentAt: number | null;
    url: string | null;
  }

  export interface Row {
    id: number;
    piece_id: number;
    kind: string;
    mode: string;
    parent_id: number | null;
    position: number;
    label: string;
    venue: string;
    body: string;
    meta: string;
    mirrors: string;
    status: string;
    skipped: number;
    calendar_id: string | null;
    approved_at: number | null;
    scheduled_at: number | null;
    sent_at: number | null;
    sent_url: string | null;
    created_at: number;
    updated_at: number;
  }

  export interface Record {
    id: number;
    pieceId: number;
    kind: string;
    mode: Mode;
    parentId: number | null;
    position: number;
    label: string;
    venue: string;
    body: string;
    meta: globalThis.Record<string, unknown>;
    mirrors: Mirror[];
    status: Status;
    skipped: boolean;
    calendarId: string | null;
    approvedAt: number | null;
    scheduledAt: number | null;
    sentAt: number | null;
    sentUrl: string | null;
    createdAt: number;
    updatedAt: number;
    /** segments of a thread / cards of a set; null for a leaf */
    children: Record[] | null;
  }

  export interface State {
    id: number;
    kind: string;
    mode: string;
    venue: string;
    status: string;
    scheduledAt: number | null;
    calendarId: string | null;
  }

  export interface CreateInput {
    pieceId: number;
    kind: string;
    mode?: Mode;
    label?: string;
    venue?: string;
    body?: string;
    /** children for a parent kind (authored); derived parents ignore it */
    segments?: string[] | null;
    meta?: globalThis.Record<string, unknown>;
    mirrors?: unknown;
  }

  export interface PatchInput {
    body?: string;
    meta?: globalThis.Record<string, unknown>;
    label?: string;
    venue?: string;
    mirrors?: unknown;
    skipped?: boolean;
    calendarId?: string | null;
  }

  export interface Revision {
    id: number;
    body: string;
    meta: globalThis.Record<string, unknown>;
    author: string;
    savedAt: number;
  }
}
