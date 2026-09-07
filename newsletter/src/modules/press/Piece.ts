import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Posts } from '../content/Posts';
import { Expression } from './Expression';

// The piece — the argument every expression projects. Usually a blog
// article, sometimes a bare post. A piece has no date, no status, no
// venue: those belong to its expressions. Its base is the one text
// derived expressions regenerate from; a base save writes a revision
// and regenerates every derived row of the piece. Bootstrapping from a
// blog post COPIES the post's text in — the site is never read again.
class $Piece {
  static async list(env: Env, query: Piece.ListQuery = {}): Promise<Piece.Summary[]> {
    const search = (query.search ?? '').trim().toLowerCase();
    const clauses: string[] = [];
    const parameters: unknown[] = [];
    if (search) {
      clauses.push('(LOWER(title) LIKE ? OR LOWER(claim) LIKE ? OR LOWER(COALESCE(slug, \'\')) LIKE ?)');
      parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (query.wave) {
      clauses.push('wave = ?');
      parameters.push(query.wave);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { results } = await env.DB.prepare(
      `SELECT * FROM piece ${whereClause} ORDER BY updated_at DESC, id DESC`,
    )
      .bind(...parameters)
      .all<Piece.Row>();
    const summaries: Piece.Summary[] = [];
    for (const row of results) {
      const expressions = await Expression.Class.statesForPiece(env, row.id);
      if (query.status && !expressions.some((state) => state.status === query.status)) continue;
      if (query.kind && !expressions.some((state) => state.kind === query.kind)) continue;
      summaries.push({
        ...this.toRecord(row),
        expressions,
        nextDueAt: expressions.reduce<number | null>(
          (soonest, state) =>
            state.scheduledAt && (soonest === null || state.scheduledAt < soonest)
              ? state.scheduledAt
              : soonest,
          null,
        ),
        calendarIds: expressions
          .map((state) => state.calendarId)
          .filter((id): id is string => Boolean(id)),
      });
    }
    return summaries;
  }

  static async byId(env: Env, id: number): Promise<Piece.Record | null> {
    const row = await env.DB.prepare('SELECT * FROM piece WHERE id = ?')
      .bind(id)
      .first<Piece.Row>();
    return row ? this.toRecord(row) : null;
  }

  static async bySlug(env: Env, slug: string): Promise<Piece.Record | null> {
    const row = await env.DB.prepare('SELECT * FROM piece WHERE slug = ?')
      .bind(slug)
      .first<Piece.Row>();
    return row ? this.toRecord(row) : null;
  }

  /** the piece with every expression (segments nested) — the piece page */
  static async detail(env: Env, id: number): Promise<Piece.Detail | null> {
    const piece = await this.byId(env, id);
    if (!piece) return null;
    return { ...piece, expressions: await Expression.Class.forPiece(env, id) };
  }

  static async create(env: Env, input: Piece.CreateInput): Promise<Piece.Record> {
    const now = Http.Class.nowSeconds();
    let seed: Partial<Piece.Record> = {};
    if (input.fromSlug) {
      const catalog = await Posts.Class.load(env);
      const post = Posts.Class.find(catalog, input.fromSlug);
      if (!post) throw new Error(`Unknown post slug: ${input.fromSlug}`);
      seed = {
        slug: post.slug,
        title: post.title,
        claim: post.description,
        links: [{ label: post.title, url: post.url }],
        banner: `/blog/${post.slug}.png`,
        base: post.plainText ?? '',
      };
    }
    const title = String(input.title ?? seed.title ?? '').trim();
    if (!title) throw new Error('A piece needs a title.');
    const slug = (input.slug ?? seed.slug ?? null) || null;
    if (slug && (await this.bySlug(env, slug)))
      throw new Error(`A piece for ${slug} already exists.`);
    const outcome = await env.DB.prepare(
      'INSERT INTO piece (slug, title, claim, links, banner, base, wave, notes, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        slug,
        title,
        String(input.claim ?? seed.claim ?? ''),
        JSON.stringify(input.links ?? seed.links ?? []),
        input.banner ?? seed.banner ?? null,
        String(input.base ?? seed.base ?? ''),
        input.wave === 2 ? 2 : 1,
        String(input.notes ?? ''),
        now,
        now,
      )
      .run();
    return (await this.byId(env, outcome.meta.last_row_id))!;
  }

  /**
   * Edit the piece. A base change writes a base_revision (the base
   * BEFORE the save) and regenerates every derived expression; approved
   * derived expressions return to draft there.
   */
  static async patch(
    env: Env,
    id: number,
    changes: Piece.PatchInput,
    author: Expression.Author = 'user',
  ): Promise<Piece.Record | null> {
    const current = await this.byId(env, id);
    if (!current) return null;
    const now = Http.Class.nowSeconds();
    const next: Piece.Record = {
      ...current,
      title: changes.title !== undefined ? String(changes.title).trim() || current.title : current.title,
      claim: changes.claim !== undefined ? String(changes.claim) : current.claim,
      links: changes.links !== undefined ? changes.links : current.links,
      banner: changes.banner !== undefined ? changes.banner : current.banner,
      base: changes.base !== undefined ? String(changes.base) : current.base,
      wave: changes.wave !== undefined ? (changes.wave === 2 ? 2 : 1) : current.wave,
      notes: changes.notes !== undefined ? String(changes.notes) : current.notes,
      slug: changes.slug !== undefined ? changes.slug || null : current.slug,
    };
    const baseChanged = next.base !== current.base;
    if (baseChanged)
      await env.DB.prepare(
        'INSERT INTO base_revision (piece_id, base, author, saved_at) VALUES (?, ?, ?, ?)',
      )
        .bind(id, current.base, author, now)
        .run();
    await env.DB.prepare(
      'UPDATE piece SET slug = ?, title = ?, claim = ?, links = ?, banner = ?, base = ?, wave = ?, notes = ?, updated_at = ? WHERE id = ?',
    )
      .bind(
        next.slug,
        next.title,
        next.claim,
        JSON.stringify(next.links),
        next.banner,
        next.base,
        next.wave,
        next.notes,
        now,
        id,
      )
      .run();
    // title, links and banner feed derivations too (hn title, the canonical link, the cover)
    if (baseChanged || next.title !== current.title || next.links !== current.links || next.banner !== current.banner)
      await Expression.Class.regenerateForPiece(env, id);
    return this.byId(env, id);
  }

  static async baseRevisions(env: Env, id: number): Promise<Piece.BaseRevision[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, base, author, saved_at AS savedAt FROM base_revision WHERE piece_id = ? ORDER BY saved_at DESC, id DESC',
    )
      .bind(id)
      .all<Piece.BaseRevision>();
    return results;
  }

  /** restore = a new save of the old base, so the history keeps growing */
  static async restoreBase(
    env: Env,
    id: number,
    revisionId: number,
    author: Expression.Author = 'user',
  ): Promise<Piece.Record | null> {
    const revision = await env.DB.prepare(
      'SELECT base FROM base_revision WHERE id = ? AND piece_id = ?',
    )
      .bind(revisionId, id)
      .first<{ base: string }>();
    if (!revision) return null;
    return this.patch(env, id, { base: revision.base }, author);
  }

  static toRecord(row: Piece.Row): Piece.Record {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      claim: row.claim,
      links: JSON.parse(row.links || '[]') as Piece.Link[],
      banner: row.banner,
      base: row.base,
      wave: row.wave === 2 ? 2 : 1,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export namespace Piece {
  export const $Class = Static($Piece);
  export let Class = $Class;

  export interface Link {
    label: string;
    url: string;
  }

  export interface Row {
    id: number;
    slug: string | null;
    title: string;
    claim: string;
    links: string;
    banner: string | null;
    base: string;
    wave: number;
    notes: string;
    created_at: number;
    updated_at: number;
  }

  export interface Record {
    id: number;
    slug: string | null;
    title: string;
    claim: string;
    links: Link[];
    banner: string | null;
    base: string;
    wave: 1 | 2;
    notes: string;
    createdAt: number;
    updatedAt: number;
  }

  export interface Summary extends Record {
    expressions: Expression.State[];
    nextDueAt: number | null;
    calendarIds: string[];
  }

  export interface Detail extends Record {
    expressions: Expression.Record[];
  }

  export interface ListQuery {
    search?: string;
    status?: string;
    kind?: string;
    wave?: number;
  }

  export interface CreateInput {
    fromSlug?: string;
    title?: string;
    slug?: string | null;
    claim?: string;
    links?: Link[];
    banner?: string | null;
    base?: string;
    wave?: number;
    notes?: string;
  }

  export interface PatchInput {
    title?: string;
    slug?: string | null;
    claim?: string;
    links?: Link[];
    banner?: string | null;
    base?: string;
    wave?: number;
    notes?: string;
  }

  export interface BaseRevision {
    id: number;
    base: string;
    author: string;
    savedAt: number;
  }
}
