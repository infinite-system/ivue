import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Posts } from '../content/Posts';
import { Scheduler } from '../schedule/Scheduler';
import { Piece } from './Piece';
import { Expression } from './Expression';
import { Posting } from './Posting';
import { Projection } from './Projection';

// The press routes — /admin/press/<resource>[/<id>[/<action>[/<sub>]]],
// every resource singular (piece, expression, posting, blog-post). Ids
// ride the path, so this is its own small router behind AdminApi's
// auth. The `X-Press-Author` header names who is writing: `agent` when
// the CLI calls, `user` otherwise — every revision records it.
class $PressApi {
  static async handle(request: Request, url: URL, env: Env): Promise<Response> {
    const [resource, idText, action, subText] = url.pathname
      .replace(/^\/admin\/press\/?/, '')
      .split('/')
      .filter(Boolean);
    const id = Number(idText);
    const author = this.authorOf(request);
    const method = request.method;
    // `return await` on purpose: a returned promise's rejection would
    // skip this catch, and every store error must become a JSON 400
    try {
      if (resource === 'blog-post' && method === 'GET') return await this.blogPosts(env);
      if (resource === 'import' && method === 'POST') return await this.importBatch(request, env);
      if (resource === 'posting' && method === 'GET' && !idText)
        return Http.Class.json(await Posting.Class.recent(env, Number(url.searchParams.get('limit') ?? 200)));
      if (resource === 'queue' && method === 'GET') return await this.queue(env);
      if (resource === 'piece')
        return await this.piece(request, url, env, method, idText, id, action, subText, author);
      if (resource === 'expression' && !idText && method === 'GET' && url.searchParams.has('calendar'))
        return Http.Class.json(await Expression.Class.byCalendarId(env, url.searchParams.get('calendar') ?? ''));
      if (resource === 'expression' && !idText && method === 'GET' && url.searchParams.has('source'))
        return Http.Class.json(await Expression.Class.bySource(env, url.searchParams.get('source') ?? ''));
      if (resource === 'expression' && idText)
        return await this.expression(request, env, method, id, action, subText, author);
      return Http.Class.notFound();
    } catch (error) {
      return Http.Class.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }

  static authorOf(request: Request): Expression.Author {
    return request.headers.get('x-press-author') === 'agent' ? 'agent' : 'user';
  }

  /* ---- piece ---- */

  static async piece(
    request: Request,
    url: URL,
    env: Env,
    method: string,
    idText: string | undefined,
    id: number,
    action: string | undefined,
    subText: string | undefined,
    author: Expression.Author,
  ): Promise<Response> {
    if (!idText) {
      if (method === 'GET')
        return Http.Class.json(
          await Piece.Class.list(env, {
            search: url.searchParams.get('q') ?? '',
            status: url.searchParams.get('status') ?? '',
            kind: url.searchParams.get('kind') ?? '',
            wave: Number(url.searchParams.get('wave') ?? 0) || undefined,
          }),
        );
      if (method === 'POST') {
        const body = await Http.Class.readJsonBody<Piece.CreateInput>(request);
        return Http.Class.json(await Piece.Class.create(env, body));
      }
      return Http.Class.notFound();
    }
    if (!Number.isInteger(id) || id <= 0) return Http.Class.notFound();
    if (!action) {
      if (method === 'GET') return this.found(await Piece.Class.detail(env, id), 'No such piece.');
      if (method === 'PATCH') {
        const body = await Http.Class.readJsonBody<Piece.PatchInput>(request);
        return this.found(await Piece.Class.patch(env, id, body, author), 'No such piece.');
      }
      return Http.Class.notFound();
    }
    switch (`${method} ${action}`) {
      case 'POST expression': {
        const body = await Http.Class.readJsonBody<Omit<Expression.CreateInput, 'pieceId'>>(request);
        return Http.Class.json(
          await Expression.Class.create(env, { ...body, kind: String(body.kind ?? ''), pieceId: id }),
        );
      }
      case 'GET posting':
        return Http.Class.json(await Posting.Class.forPiece(env, id));
      case 'GET base-revision':
        return Http.Class.json(await Piece.Class.baseRevisions(env, id));
      case 'POST base-revision':
        return this.found(
          await Piece.Class.restoreBase(env, id, Number(subText), author),
          'No such revision.',
        );
      default:
        return Http.Class.notFound();
    }
  }

  /* ---- expression ---- */

  static async expression(
    request: Request,
    env: Env,
    method: string,
    id: number,
    action: string | undefined,
    subText: string | undefined,
    author: Expression.Author,
  ): Promise<Response> {
    if (!Number.isInteger(id) || id <= 0) return Http.Class.notFound();
    if (!action) {
      if (method === 'GET') return this.found(await Expression.Class.byId(env, id), 'No such expression.');
      if (method === 'PATCH') {
        const body = await Http.Class.readJsonBody<Expression.PatchInput>(request);
        return this.found(await Expression.Class.patch(env, id, body, author), 'No such expression.');
      }
      return Http.Class.notFound();
    }
    const missing = 'No such expression.';
    switch (`${method} ${action}`) {
      case 'POST approve':
        return this.found(await Expression.Class.approve(env, id), missing);
      case 'POST unapprove':
        return this.found(await Expression.Class.unapprove(env, id), missing);
      case 'POST archive':
        return this.found(await Expression.Class.archive(env, id), missing);
      case 'POST segment': {
        const body = await Http.Class.readJsonBody<{ body: string }>(request);
        return this.found(await Expression.Class.addSegment(env, id, String(body.body ?? '')), missing);
      }
      case 'PATCH reorder': {
        const body = await Http.Class.readJsonBody<{ order: number[] }>(request);
        return this.found(
          await Expression.Class.reorder(env, id, (body.order ?? []).map(Number)),
          missing,
        );
      }
      case 'POST schedule': {
        const body = await Http.Class.readJsonBody<{ dueAt: number; platform?: string }>(request);
        return this.found(
          await Expression.Class.schedule(env, id, Number(body.dueAt), body.platform),
          missing,
        );
      }
      case 'POST reschedule': {
        const body = await Http.Class.readJsonBody<{ dueAt: number }>(request);
        return this.found(await Expression.Class.reschedule(env, id, Number(body.dueAt)), missing);
      }
      case 'POST cancel':
        return this.found(await Expression.Class.cancelSchedule(env, id), missing);
      case 'POST post':
        return this.found(await Expression.Class.post(env, id), missing);
      case 'POST sent': {
        const body = await Http.Class.readJsonBody<{
          url?: string;
          platform?: string;
          venue?: string;
          calendarId?: string | null;
        }>(request);
        return this.found(await Expression.Class.markSent(env, id, body), missing);
      }
      case 'POST clone': {
        const body = await Http.Class.readJsonBody<{ kind: string }>(request);
        return this.found(await Expression.Class.clone(env, id, String(body.kind ?? '')), missing);
      }
      case 'POST detach':
        return this.found(await Expression.Class.detach(env, id), missing);
      case 'GET posting':
        return Http.Class.json(await Posting.Class.forExpression(env, id));
      case 'GET revision':
        return Http.Class.json(await Expression.Class.revisions(env, id));
      case 'POST revision':
        return this.found(
          await Expression.Class.restore(env, id, Number(subText), author),
          'No such revision.',
        );
      case 'GET lint': {
        const record = await Expression.Class.byId(env, id);
        if (!record) return Http.Class.json({ error: missing }, 404);
        return Http.Class.json({ problems: Expression.Class.lintRecord(record) });
      }
      default:
        return Http.Class.notFound();
    }
  }

  /* ---- the rest ---- */

  /** the site's posts for the "start from a blog post" select */
  static async blogPosts(env: Env): Promise<Response> {
    const catalog = await Posts.Class.load(env);
    return Http.Class.json(
      catalog.map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.description,
        date: post.date,
        url: post.url,
      })),
    );
  }

  /** every pending job with its expression resolved, soonest first */
  static async queue(env: Env): Promise<Response> {
    const jobs = await Scheduler.Class.list(env);
    const upcoming: unknown[] = [];
    for (const job of jobs.upcoming) {
      const expression =
        job.kind === 'expression'
          ? await Expression.Class.byId(env, Number(job.payload.expressionId))
          : null;
      upcoming.push({ ...job, expression });
    }
    const { results: due } = await env.DB.prepare(
      "SELECT expression.*, piece.title AS pieceTitle FROM expression JOIN piece ON piece.id = expression.piece_id WHERE expression.status = 'due' ORDER BY expression.updated_at DESC",
    ).all<Expression.Row & { pieceTitle: string }>();
    return Http.Class.json({
      upcoming,
      recent: jobs.recent,
      due: due.map((row) => ({ ...Expression.Class.toRecord(row), pieceTitle: row.pieceTitle })),
    });
  }

  /**
   * The one-shot import: the CLI parses files and the artifact's posts
   * into this shape; the API only inserts. Each entry names its piece
   * by slug or title; the piece is created on first sight.
   */
  static async importBatch(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{ pieces: PressApi.ImportPiece[] }>(request);
    const report = { pieces: 0, expressions: 0, segments: 0, skipped: [] as string[] };
    for (const entry of body.pieces ?? []) {
      let piece =
        (entry.slug ? await Piece.Class.bySlug(env, entry.slug) : null) ??
        (await this.pieceByTitle(env, entry.title));
      if (!piece) {
        piece = await Piece.Class.create(env, {
          title: entry.title,
          slug: entry.slug ?? null,
          claim: entry.claim ?? '',
          links: entry.links ?? [],
          banner: entry.banner ?? null,
          base: entry.base ?? '',
          wave: entry.wave ?? 1,
          notes: entry.notes ?? '',
        });
        report.pieces++;
      }
      for (const expression of entry.expressions ?? []) {
        if (!Projection.Class.isKind(expression.kind)) {
          report.skipped.push(`${entry.title}: unknown kind ${expression.kind}`);
          continue;
        }
        const created = await Expression.Class.create(env, {
          pieceId: piece.id,
          kind: expression.kind,
          mode: expression.mode ?? 'authored',
          label: expression.label ?? '',
          venue: expression.venue ?? '',
          body: expression.body ?? '',
          segments: expression.segments ?? null,
          meta: expression.meta ?? {},
          mirrors: expression.mirrors ?? [],
        });
        report.expressions++;
        report.segments += created.children?.length ?? 0;
        if (expression.approved) {
          try {
            await Expression.Class.approve(env, created.id);
          } catch (error) {
            report.skipped.push(
              `${entry.title} / ${expression.kind}: not approved — ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }
    return Http.Class.json(report);
  }

  static async pieceByTitle(env: Env, title: string): Promise<Piece.Record | null> {
    const row = await env.DB.prepare('SELECT * FROM piece WHERE title = ? AND slug IS NULL')
      .bind(title)
      .first<Piece.Row>();
    return row ? Piece.Class.toRecord(row) : null;
  }

  static found<Value>(value: Value | null, missing: string): Response {
    return value === null ? Http.Class.json({ error: missing }, 404) : Http.Class.json(value);
  }
}

export namespace PressApi {
  export const $Class = Static($PressApi);
  export let Class = $Class;

  export interface ImportExpression {
    kind: string;
    mode?: Expression.Mode;
    label?: string;
    venue?: string;
    body?: string;
    segments?: string[] | null;
    meta?: Record<string, unknown>;
    mirrors?: string[];
    approved?: boolean;
  }

  export interface ImportPiece {
    title: string;
    slug?: string | null;
    claim?: string;
    links?: Piece.Link[];
    banner?: string | null;
    base?: string;
    wave?: number;
    notes?: string;
    expressions?: ImportExpression[];
  }
}
