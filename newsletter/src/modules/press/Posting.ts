import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';

// The posting ledger — when and where each projection went out. One
// row per posting, so an expression that goes out twice (launch, then
// re-promotion) keeps both; the expression's sent_at is only the latest
// row, denormalized for the list. Whether the Worker posted it or the
// operator copied and marked it, the row is the same shape.
class $Posting {
  static async record(
    env: Env,
    posting: {
      expressionId: number;
      platform: string;
      venue?: string;
      url?: string | null;
      remoteIds?: string[];
      postedBy: 'api' | 'manual';
      calendarId?: string | null;
      postedAt?: number;
    },
  ): Promise<Posting.Record> {
    const postedAt = posting.postedAt ?? Http.Class.nowSeconds();
    const outcome = await env.DB.prepare(
      'INSERT INTO posting (expression_id, platform, venue, url, remote_ids, posted_at, posted_by, calendar_id) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        posting.expressionId,
        posting.platform,
        posting.venue ?? '',
        posting.url ?? null,
        JSON.stringify(posting.remoteIds ?? []),
        postedAt,
        posting.postedBy,
        posting.calendarId ?? null,
      )
      .run();
    return (await this.byId(env, outcome.meta.last_row_id))!;
  }

  static async byId(env: Env, id: number): Promise<Posting.Record | null> {
    const row = await env.DB.prepare('SELECT * FROM posting WHERE id = ?')
      .bind(id)
      .first<Posting.Row>();
    return row ? this.toRecord(row) : null;
  }

  static async forExpression(env: Env, expressionId: number): Promise<Posting.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM posting WHERE expression_id = ? ORDER BY posted_at DESC, id DESC',
    )
      .bind(expressionId)
      .all<Posting.Row>();
    return results.map((row) => this.toRecord(row));
  }

  static async forPiece(env: Env, pieceId: number): Promise<Posting.Record[]> {
    const { results } = await env.DB.prepare(
      'SELECT posting.* FROM posting JOIN expression ON expression.id = posting.expression_id ' +
        'WHERE expression.piece_id = ? ORDER BY posting.posted_at DESC, posting.id DESC',
    )
      .bind(pieceId)
      .all<Posting.Row>();
    return results.map((row) => this.toRecord(row));
  }

  /** the ledger, newest first, joined to what it was — the Sent tab */
  static async recent(env: Env, limit = 200): Promise<Posting.Entry[]> {
    const { results } = await env.DB.prepare(
      'SELECT posting.*, expression.kind AS kind, expression.piece_id AS pieceId, piece.title AS pieceTitle ' +
        'FROM posting JOIN expression ON expression.id = posting.expression_id ' +
        'JOIN piece ON piece.id = expression.piece_id ' +
        'ORDER BY posting.posted_at DESC, posting.id DESC LIMIT ?',
    )
      .bind(Math.min(Math.max(1, limit), 1000))
      .all<Posting.Row & { kind: string; pieceId: number; pieceTitle: string }>();
    return results.map((row) => ({
      ...this.toRecord(row),
      kind: row.kind,
      pieceId: row.pieceId,
      pieceTitle: row.pieceTitle,
    }));
  }

  static toRecord(row: Posting.Row): Posting.Record {
    return {
      id: row.id,
      expressionId: row.expression_id,
      platform: row.platform,
      venue: row.venue,
      url: row.url,
      remoteIds: JSON.parse(row.remote_ids || '[]') as string[],
      postedAt: row.posted_at,
      postedBy: row.posted_by,
      calendarId: row.calendar_id,
    };
  }
}

export namespace Posting {
  export const $Class = Static($Posting);
  export let Class = $Class;

  export interface Row {
    id: number;
    expression_id: number;
    platform: string;
    venue: string;
    url: string | null;
    remote_ids: string;
    posted_at: number;
    posted_by: 'api' | 'manual';
    calendar_id: string | null;
  }

  export interface Record {
    id: number;
    expressionId: number;
    platform: string;
    venue: string;
    url: string | null;
    remoteIds: string[];
    postedAt: number;
    postedBy: 'api' | 'manual';
    calendarId: string | null;
  }

  export interface Entry extends Record {
    kind: string;
    pieceId: number;
    pieceTitle: string;
  }
}
