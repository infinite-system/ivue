/*
=== GENERATOR ===
Goal: Prove the posting ledger keeps one row per time a projection went out — API or by hand — readable per expression, per piece, and newest-first across the press.
// domain-invariant: $Posting — If an expression is posted twice, then the ledger holds two rows and the first stands
Impossible if true: a posting without a ledger row

=== GENERATOR-DESCRIBED ===
$Posting is append-only history: platform, venue, url, remote ids, who posted, and the calendar entry it fulfilled.
*/
import { describe, expect, it } from 'vitest';
import { Posting } from './Posting';
import { Piece } from './Piece';
import { Expression } from './Expression';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Posting', () => {
  // domain-invariant: $Posting — If an expression is posted twice, then the ledger holds two rows and the first stands
  // impossible-if-true: $Posting — a posting without a ledger row
  it('records, reads by id, per expression, per piece, and recent across the press', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'T', base: 'Words.' });
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'reddit', body: 'essay', venue: 'r/vuejs' });
    const first = await Posting.Class.record(env, {
      expressionId: post.id,
      platform: 'reddit',
      venue: 'r/vuejs',
      url: 'https://reddit.com/1',
      remoteIds: ['abc'],
      postedBy: 'manual',
      postedAt: 100,
    });
    await Posting.Class.record(env, { expressionId: post.id, platform: 'reddit', venue: 'r/webdev', postedBy: 'manual', postedAt: 200 });
    expect(await Posting.Class.byId(env, first.id)).toMatchObject({ url: 'https://reddit.com/1', remoteIds: ['abc'], calendarId: null });
    expect((await Posting.Class.forExpression(env, post.id)).map((row) => row.venue)).toEqual(['r/webdev', 'r/vuejs']);
    expect(await Posting.Class.forPiece(env, piece.id)).toHaveLength(2);
    const recent = await Posting.Class.recent(env, 1);
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ venue: 'r/webdev', pieceTitle: 'T', kind: 'reddit', pieceId: piece.id });
    expect(await Posting.Class.byId(env, 999)).toBeNull();
  });
});

describe('Posting — defaults', () => {
  it('stamps now and an empty venue when none are given', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'T' });
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'note', body: 'n' });
    const row = await Posting.Class.record(env, { expressionId: post.id, platform: 'other', postedBy: 'manual' });
    expect(row.venue).toBe('');
    expect(row.postedAt).toBeGreaterThan(0);
    expect(row.remoteIds).toEqual([]);
  });
});
