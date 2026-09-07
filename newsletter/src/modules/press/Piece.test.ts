/*
=== GENERATOR ===
Goal: Prove a piece is the argument alone — bootstrapped from a blog post by copying, edited in one place, its base saves kept as revisions and regenerating every derived expression — and that a piece never carries a date, status or venue.
// domain-invariant: $Piece — If the base is saved, then a base_revision holds the base BEFORE the save and every derived expression regenerates
// domain-invariant: $Piece — If a piece starts from a blog post, then its base is a copy and the site is never read again
Impossible if true: a piece refused, hidden, or flagged for having no expressions
Impossible if true: a piece with a date, a status, a venue, or a job

=== GENERATOR-DESCRIBED ===
$Piece owns title, claim, links, banner, base, wave, notes and nothing that belongs to a posting. Its list rolls up expression states; its detail nests them.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Piece } from './Piece';
import { Expression } from './Expression';
import { Posts } from '../content/Posts';
import { makeTestEnv } from '../../../test/TestDatabase';
import { makePost } from '../../../test/Fixtures';

describe('Piece', () => {
  afterEach(() => {
    Posts.Class = Posts.$Class;
  });

  // impossible-if-true: $Piece — a piece refused, hidden, or flagged for having no expressions
  it('a blank piece is a valid row with only a title and a base — zero expressions is the starting state', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'A voice post', base: 'Remember less. Generate more.' });
    expect(piece.slug).toBeNull();
    expect(piece.wave).toBe(1);
    const list = await Piece.Class.list(env);
    expect(list).toHaveLength(1);
    expect(list[0].expressions).toEqual([]);
    expect(list[0].nextDueAt).toBeNull();
    const detail = await Piece.Class.detail(env, piece.id);
    expect(detail?.expressions).toEqual([]);
    await expect(Piece.Class.create(env, { title: '   ' })).rejects.toThrow(/title/);
  });

  // domain-invariant: $Piece — If a piece starts from a blog post, then its base is a copy and the site is never read again
  it('starts from a blog post by copying title, description, banner, link and plain text', async () => {
    const env = makeTestEnv();
    let loads = 0;
    Posts.Class = class extends Posts.$Class {
      static override async load() {
        loads++;
        return [makePost('introducing-ivue', 1)];
      }
    };
    const piece = await Piece.Class.create(env, { fromSlug: 'introducing-ivue' });
    expect(piece).toMatchObject({
      slug: 'introducing-ivue',
      title: 'Title of introducing-ivue',
      claim: 'About introducing-ivue',
      banner: '/blog/introducing-ivue.png',
      base: 'Plain text of introducing-ivue.\n\nSecond paragraph of introducing-ivue.',
    });
    expect(piece.links).toEqual([{ label: 'Title of introducing-ivue', url: 'https://ivue.dev/blog/introducing-ivue' }]);
    expect(loads).toBe(1);
    // the copy diverges freely; the site is not consulted
    await Piece.Class.patch(env, piece.id, { base: 'Something else entirely.' });
    await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', mode: 'derived' });
    expect(loads).toBe(1);
    await expect(Piece.Class.create(env, { fromSlug: 'introducing-ivue' })).rejects.toThrow(/already exists/);
    await expect(Piece.Class.create(env, { fromSlug: 'nope' })).rejects.toThrow(/Unknown post slug/);
  });

  // domain-invariant: $Piece — If the base is saved, then a base_revision holds the base BEFORE the save and every derived expression regenerates
  it('a base save writes the previous base as a revision and regenerates derived expressions; restore is a new save', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'T', base: 'One.\n\n---\n\nTwo.' });
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', mode: 'derived' });
    const authored = await Expression.Class.create(env, { pieceId: piece.id, kind: 'bluesky', body: 'hand-written' });
    expect(thread.children?.map((child) => child.body)).toEqual(['One.', 'Two.']);

    await Piece.Class.patch(env, piece.id, { base: 'Uno.\n\n---\n\nDos.\n\n---\n\nTres.' }, 'agent');
    const revisions = await Piece.Class.baseRevisions(env, piece.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ base: 'One.\n\n---\n\nTwo.', author: 'agent' });

    expect((await Expression.Class.byId(env, thread.id))?.children?.map((child) => child.body)).toEqual(['Uno.', 'Dos.', 'Tres.']);
    expect((await Expression.Class.byId(env, post.id))?.body).toBe('Uno.');
    // authored never tracks the base
    expect((await Expression.Class.byId(env, authored.id))?.body).toBe('hand-written');

    const restored = await Piece.Class.restoreBase(env, piece.id, revisions[0].id);
    expect(restored?.base).toBe('One.\n\n---\n\nTwo.');
    expect(await Piece.Class.baseRevisions(env, piece.id)).toHaveLength(2);
    expect(await Piece.Class.restoreBase(env, piece.id, 999)).toBeNull();
  });

  it('the list filters by search, wave, status and kind, and rolls up next due and calendar ids', async () => {
    const env = makeTestEnv();
    const launch = await Piece.Class.create(env, { title: 'Launch', slug: 'introducing-ivue', wave: 1, base: 'Text.' });
    const agents = await Piece.Class.create(env, { title: 'Agents story', wave: 2, base: 'Text.' });
    const post = await Expression.Class.create(env, { pieceId: launch.id, kind: 'x-post', mode: 'derived' });
    await Expression.Class.patch(env, post.id, { calendarId: '2026-09-08--x' });
    await Expression.Class.approve(env, post.id);
    await Expression.Class.create(env, { pieceId: agents.id, kind: 'reddit', body: 'essay' });

    expect((await Piece.Class.list(env, { search: 'launch' })).map((piece) => piece.id)).toEqual([launch.id]);
    expect((await Piece.Class.list(env, { search: 'introducing' })).map((piece) => piece.id)).toEqual([launch.id]);
    expect((await Piece.Class.list(env, { wave: 2 })).map((piece) => piece.id)).toEqual([agents.id]);
    expect((await Piece.Class.list(env, { status: 'approved' })).map((piece) => piece.id)).toEqual([launch.id]);
    expect((await Piece.Class.list(env, { kind: 'reddit' })).map((piece) => piece.id)).toEqual([agents.id]);
    const summary = (await Piece.Class.list(env)).find((piece) => piece.id === launch.id)!;
    expect(summary.calendarIds).toEqual(['2026-09-08--x']);
    expect(summary.expressions[0]).toMatchObject({ kind: 'x-post', status: 'approved', mode: 'derived' });
  });

  // impossible-if-true: $Piece — a piece with a date, a status, a venue, or a job
  it('a piece record carries no date, status, venue or job — those live on expressions', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'T' });
    expect(Object.keys(piece).sort()).toEqual(
      ['banner', 'base', 'claim', 'createdAt', 'id', 'links', 'notes', 'slug', 'title', 'updatedAt', 'wave'].sort(),
    );
  });

  it('title, links and banner changes regenerate too (they feed the hn title, the canonical link, the cover)', async () => {
    const env = makeTestEnv();
    const piece = await Piece.Class.create(env, { title: 'Old title', base: 'Body.' });
    const hn = await Expression.Class.create(env, { pieceId: piece.id, kind: 'hn', mode: 'derived' });
    expect(hn.body).toBe('Old title');
    await Piece.Class.patch(env, piece.id, { title: 'New title' });
    expect((await Expression.Class.byId(env, hn.id))?.body).toBe('New title');
    expect(await Piece.Class.patch(env, 999, { title: 'x' })).toBeNull();
  });
});
