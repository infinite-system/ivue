/*
=== GENERATOR ===
Goal: Prove an expression is one platform projection with a mode — derived rows regenerate from the base and refuse direct body edits, authored rows never track it — that approval is of the exact text, that a thread is approved whole while its segments are skipped one by one, that every save keeps a revision, and that every posting lands as a ledger row.
// domain-invariant: $Expression — If a body is patched on a derived row, then the patch is refused
// domain-invariant: $Expression — If an approved row's text changes or regenerates, then it returns to draft and its job is cancelled
// domain-invariant: $Expression — If a segment is skipped, then the live thread renumbers around it and the post omits it
// domain-invariant: $Expression — If a body or meta changes, then a post_revision holds the text before the save with its author
// domain-invariant: $Expression — If anything is posted, by API or by hand, then a posting row records platform, venue, url and remote ids
Impossible if true: a scheduled expression ships text that was not the approved text

=== GENERATOR-DESCRIBED ===
$Expression is the press's row: kind, mode, body, meta, mirrors, status, skip, calendar id. Status moves forward by explicit verbs; edits and regeneration return it to draft on their own. Only X posts through an API; the rest goes due and is marked sent by hand.
*/
import { afterEach, describe, expect, it } from 'vitest';
import { Expression } from './Expression';
import { Piece } from './Piece';
import { Posting } from './Posting';
import { Scheduler } from '../schedule/Scheduler';
import { XPoster } from '../socials/XPoster';
import { Tweets } from '../socials/Tweets';
import { makeTestEnv } from '../../../test/TestDatabase';

const X_ENV = { X_API_KEY: 'k', X_API_SECRET: 's', X_ACCESS_TOKEN: 't', X_ACCESS_SECRET: 'ts' };

function future() {
  return Math.floor(Date.now() / 1000) + 3600;
}

async function pieceWithBase(env: Env, base = 'One.\n\n---\n\nTwo.\n\n---\n\nThree.') {
  return Piece.Class.create(env, { title: 'T', base, links: [{ label: 'post', url: 'https://ivue.dev/blog/t' }] });
}

let postedThreads: { text: string }[][] = [];
let postedTweets: string[] = [];
function stubPoster() {
  postedThreads = [];
  postedTweets = [];
  XPoster.Class = class extends XPoster.$Class {
    static override async postThread(_env: Env, segments: { text: string }[]) {
      postedThreads.push(segments);
      return { tweetIds: segments.map((_segment, index) => `t${index + 1}`) };
    }
    static override async postWithImages(_env: Env, text: string) {
      postedTweets.push(text);
      return { tweetId: 'single' };
    }
  };
}

describe('Expression', () => {
  afterEach(() => {
    XPoster.Class = XPoster.$Class;
  });

  it('a derived thread splits the base into segments; a segment inherits the piece; an unknown kind is refused', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    expect(thread.children?.map((child) => child.body)).toEqual(['One.', 'Two.', 'Three.\nhttps://ivue.dev/blog/t']);
    expect(thread.children?.every((child) => child.pieceId === piece.id && child.kind === 'x-segment')).toBe(true);
    expect(thread.status).toBe('draft');
    await expect(Expression.Class.create(env, { pieceId: piece.id, kind: 'carrier-pigeon' })).rejects.toThrow(/Unknown kind/);
    await expect(Expression.Class.create(env, { pieceId: 999, kind: 'x-post' })).rejects.toThrow(/No such piece/);
    await expect(Expression.Class.create(env, { pieceId: piece.id, kind: 'bluesky', mode: 'derived' })).rejects.toThrow(/written by hand/);
  });

  // domain-invariant: $Expression — If a body is patched on a derived row, then the patch is refused
  it('a derived body cannot be patched; detach makes it hand-owned and it stops regenerating', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', mode: 'derived' });
    await expect(Expression.Class.patch(env, post.id, { body: 'my own words' })).rejects.toThrow(/derived from the base/);
    const detached = await Expression.Class.detach(env, post.id);
    expect(detached?.mode).toBe('authored');
    await Expression.Class.patch(env, post.id, { body: 'my own words' });
    await Piece.Class.patch(env, piece.id, { base: 'Changed.' });
    expect((await Expression.Class.byId(env, post.id))?.body).toBe('my own words');
    // a thread's segments detach with it
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    await Expression.Class.detach(env, thread.id);
    const segment = (await Expression.Class.byId(env, thread.id))!.children![0];
    expect(segment.mode).toBe('authored');
    await Expression.Class.patch(env, segment.id, { body: 'rewritten' });
    expect((await Expression.Class.byId(env, thread.id))!.children![0].body).toBe('rewritten');
    expect(await Expression.Class.detach(env, 999)).toBeNull();
  });

  // domain-invariant: $Expression — If a body or meta changes, then a post_revision holds the text before the save with its author
  it('every body or meta save keeps the previous text with its author; restore is a new save', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'bluesky', body: 'first' });
    await Expression.Class.patch(env, post.id, { body: 'second' }, 'agent');
    await Expression.Class.patch(env, post.id, { meta: { note: 'x' } });
    await Expression.Class.patch(env, post.id, { label: 'only a label' });
    const revisions = await Expression.Class.revisions(env, post.id);
    expect(revisions.map((revision) => [revision.body, revision.author])).toEqual([
      ['second', 'user'],
      ['first', 'agent'],
    ]);
    const restored = await Expression.Class.restore(env, post.id, revisions[1].id);
    expect(restored?.body).toBe('first');
    expect(await Expression.Class.revisions(env, post.id)).toHaveLength(3);
    expect(await Expression.Class.restore(env, post.id, 999)).toBeNull();
  });

  it('approval is of the exact text: the lint must pass, and every segment skipped is refused', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const long = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', body: 'x'.repeat(281) });
    await expect(Expression.Class.approve(env, long.id)).rejects.toThrow(/281 characters/);
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', segments: ['a', 'b'] });
    for (const child of thread.children!) await Expression.Class.patch(env, child.id, { skipped: true });
    await expect(Expression.Class.approve(env, thread.id)).rejects.toThrow(/every segment is skipped/);
    expect(await Expression.Class.approve(env, 999)).toBeNull();
    // status never moves backward by verb except to draft (unapprove) or archived
    const fine = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', body: 'fine' });
    await Expression.Class.approve(env, fine.id);
    expect((await Expression.Class.byId(env, fine.id))?.approvedAt).toBeGreaterThan(0);
    await Expression.Class.unapprove(env, fine.id);
    expect((await Expression.Class.byId(env, fine.id))?.status).toBe('draft');
    await Expression.Class.archive(env, fine.id);
    await expect(Expression.Class.approve(env, fine.id)).rejects.toThrow(/not a move/);
  });

  // domain-invariant: $Expression — If an approved row's text changes or regenerates, then it returns to draft and its job is cancelled
  it('an edit or a regeneration of an approved row returns it to draft; a scheduled one also loses its job', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', mode: 'derived' });
    await Expression.Class.approve(env, post.id);
    await Expression.Class.schedule(env, post.id, future());
    expect((await Scheduler.Class.list(env)).upcoming).toHaveLength(1);
    expect((await Expression.Class.byId(env, post.id))?.status).toBe('scheduled');
    // the base moves → derived text moves → draft, job gone
    await Piece.Class.patch(env, piece.id, { base: 'Different.' });
    const after = await Expression.Class.byId(env, post.id);
    expect(after?.status).toBe('draft');
    expect(after?.meta.unapprovedBecause).toBe('the base changed');
    expect((await Scheduler.Class.list(env)).upcoming).toHaveLength(0);
    // an authored approved row edited → draft
    const hand = await Expression.Class.create(env, { pieceId: piece.id, kind: 'bluesky', body: 'ok' });
    await Expression.Class.approve(env, hand.id);
    await Expression.Class.patch(env, hand.id, { body: 'changed' });
    expect((await Expression.Class.byId(env, hand.id))?.status).toBe('draft');
    // a same-text regeneration keeps approval
    const stable = await Expression.Class.create(env, { pieceId: piece.id, kind: 'hn', mode: 'derived' });
    await Expression.Class.approve(env, stable.id);
    await Piece.Class.patch(env, piece.id, { notes: 'notes do not regenerate' });
    expect((await Expression.Class.byId(env, stable.id))?.status).toBe('approved');
  });

  // domain-invariant: $Expression — If a segment is skipped, then the live thread renumbers around it and the post omits it
  it('skips survive a same-count regeneration, clear otherwise, and the poster omits skipped segments', async () => {
    const env = makeTestEnv(X_ENV);
    const piece = await pieceWithBase(env);
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    const middle = thread.children![1];
    await Expression.Class.patch(env, middle.id, { skipped: true });
    await Piece.Class.patch(env, piece.id, { base: 'Uno.\n\n---\n\nDos.\n\n---\n\nTres.' });
    let current = (await Expression.Class.byId(env, thread.id))!;
    expect(current.children!.map((child) => child.skipped)).toEqual([false, true, false]);
    await Piece.Class.patch(env, piece.id, { base: 'A.\n\n---\n\nB.' });
    current = (await Expression.Class.byId(env, thread.id))!;
    expect(current.children!.map((child) => child.skipped)).toEqual([false, false]);
    // the live thread omits the skipped one when posting
    await Expression.Class.patch(env, current.children![0].id, { skipped: true });
    await Expression.Class.approve(env, thread.id);
    stubPoster();
    const posted = await Expression.Class.post(env, thread.id);
    expect(posted?.status).toBe('sent');
    expect(postedTweets).toEqual(['B.\nhttps://ivue.dev/blog/t']); // one live segment posts as a single tweet
  });

  it('reorder persists positions and returns an approved thread to draft; add segment only on authored threads', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', segments: ['a', 'b', 'c'] });
    await Expression.Class.approve(env, thread.id);
    const ids = thread.children!.map((child) => child.id);
    const reordered = await Expression.Class.reorder(env, thread.id, [ids[2], ids[0], ids[1]]);
    expect(reordered?.children?.map((child) => child.body)).toEqual(['c', 'a', 'b']);
    expect(reordered?.status).toBe('draft');
    await expect(Expression.Class.reorder(env, thread.id, [ids[0]])).rejects.toThrow(/every segment/);
    const grown = await Expression.Class.addSegment(env, thread.id, 'd');
    expect(grown?.children).toHaveLength(4);
    const derived = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    await expect(Expression.Class.addSegment(env, derived.id, 'x')).rejects.toThrow(/edit the base/);
  });

  it('scheduling needs approval; cancel returns to approved; reschedule moves the job', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'bluesky', body: 'ok' });
    await expect(Expression.Class.schedule(env, post.id, future())).rejects.toThrow(/approved/);
    await Expression.Class.approve(env, post.id);
    const scheduled = await Expression.Class.schedule(env, post.id, future());
    expect(scheduled?.status).toBe('scheduled');
    expect(scheduled?.scheduledAt).toBeGreaterThan(0);
    const later = future() + 600;
    const moved = await Expression.Class.reschedule(env, post.id, later);
    expect(moved?.scheduledAt).toBe(later);
    expect((await Scheduler.Class.list(env)).upcoming[0].dueAt).toBe(later);
    const cancelled = await Expression.Class.cancelSchedule(env, post.id);
    expect(cancelled?.status).toBe('approved');
    expect(cancelled?.scheduledAt).toBeNull();
    expect((await Scheduler.Class.list(env)).upcoming).toHaveLength(0);
  });

  // impossible-if-true: $Expression — a scheduled expression ships text that was not the approved text
  it('the expression job: X posts through the poster into the ledger; another platform goes due; a row no longer scheduled ships nothing', async () => {
    const env = makeTestEnv(X_ENV);
    stubPoster();
    const piece = await pieceWithBase(env);
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', mode: 'derived' });
    await Expression.Class.approve(env, thread.id);
    await Expression.Class.schedule(env, thread.id, future());
    const linkedin = await Expression.Class.create(env, { pieceId: piece.id, kind: 'linkedin', mode: 'derived' });
    await Expression.Class.approve(env, linkedin.id);
    await Expression.Class.schedule(env, linkedin.id, future());
    const edited = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', body: 'ok' });
    await Expression.Class.approve(env, edited.id);
    await Expression.Class.schedule(env, edited.id, future());
    await Expression.Class.patch(env, edited.id, { body: 'edited after scheduling' }); // → draft, job cancelled

    await env.DB.prepare('UPDATE scheduled_job SET due_at = 1').run();
    const executed = await Scheduler.Class.runDue(env);
    expect(executed).toBe(2);
    expect(postedThreads).toHaveLength(1);
    expect(postedThreads[0].map((segment) => segment.text)).toEqual(['One.', 'Two.', 'Three.\nhttps://ivue.dev/blog/t']);
    expect(postedTweets).toEqual([]);
    const sent = (await Expression.Class.byId(env, thread.id))!;
    expect(sent.status).toBe('sent');
    expect(sent.sentUrl).toBe('https://x.com/i/status/t1');
    const ledger = await Posting.Class.forExpression(env, thread.id);
    expect(ledger[0]).toMatchObject({ platform: 'x', remoteIds: ['t1', 't2', 't3'], postedBy: 'api' });
    expect((await Tweets.Class.log(env)).map((row) => row.tweetId).sort()).toEqual(['t1', 't2', 't3']);
    expect((await Expression.Class.byId(env, linkedin.id))?.status).toBe('due');
    expect((await Expression.Class.byId(env, edited.id))?.status).toBe('draft');
    // the job of the edited row was cancelled: nothing ran for it
    const recent = (await Scheduler.Class.list(env)).recent;
    expect(recent.map((job) => job.result?.detail)).toEqual(
      expect.arrayContaining([expect.stringMatching(/posted to X/), expect.stringMatching(/manual posting/)]),
    );
    expect(recent).toHaveLength(2);
  });

  // domain-invariant: $Expression — If anything is posted, by API or by hand, then a posting row records platform, venue, url and remote ids
  it('mark sent by hand writes the ledger and the row; a mirror marks itself; a second posting keeps the first', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, {
      pieceId: piece.id,
      kind: 'x-post',
      body: 'ok',
      mirrors: ['bluesky', 'mastodon'],
      venue: 'X',
    });
    await Expression.Class.patch(env, post.id, { calendarId: '2026-09-08--x' });
    await Expression.Class.approve(env, post.id);
    const sent = await Expression.Class.markSent(env, post.id, { url: 'https://x.com/i/status/1' });
    expect(sent?.status).toBe('sent');
    expect(sent?.sentUrl).toBe('https://x.com/i/status/1');
    const mirrored = await Expression.Class.markSent(env, post.id, { platform: 'bluesky', url: 'https://bsky.app/1' });
    expect(mirrored?.mirrors.find((mirror) => mirror.platform === 'bluesky')).toMatchObject({ url: 'https://bsky.app/1' });
    expect(mirrored?.mirrors.find((mirror) => mirror.platform === 'mastodon')?.sentAt).toBeNull();
    await Expression.Class.markSent(env, post.id, { url: 'https://x.com/i/status/2', venue: 'X re-promotion' });
    const ledger = await Posting.Class.forExpression(env, post.id);
    expect(ledger.map((row) => [row.platform, row.url, row.postedBy, row.calendarId])).toEqual([
      ['x', 'https://x.com/i/status/2', 'manual', '2026-09-08--x'],
      ['bluesky', 'https://bsky.app/1', 'manual', '2026-09-08--x'],
      ['x', 'https://x.com/i/status/1', 'manual', '2026-09-08--x'],
    ]);
    expect((await Posting.Class.forPiece(env, piece.id))).toHaveLength(3);
    expect((await Posting.Class.recent(env))[0]).toMatchObject({ pieceTitle: 'T', kind: 'x-post' });
    expect(await Expression.Class.markSent(env, 999, {})).toBeNull();
  });

  it('post now refuses non-X kinds and unapproved text; clone copies the body onto another kind', async () => {
    const env = makeTestEnv(X_ENV);
    stubPoster();
    const piece = await pieceWithBase(env);
    const linkedin = await Expression.Class.create(env, { pieceId: piece.id, kind: 'linkedin', body: 'text' });
    await expect(Expression.Class.post(env, linkedin.id)).rejects.toThrow(/Only X/);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', body: 'text' });
    await expect(Expression.Class.post(env, post.id)).rejects.toThrow(/Approve/);
    await Expression.Class.approve(env, post.id);
    await expect(Expression.Class.post({ ...env, X_API_KEY: '' } as Env, post.id)).rejects.toThrow(/credentials/);
    const clone = await Expression.Class.clone(env, post.id, 'linkedin-article');
    expect(clone).toMatchObject({ kind: 'linkedin-article', mode: 'authored', body: 'text' });
    const thread = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-thread', segments: ['a', 'b'] });
    const cloned = await Expression.Class.clone(env, thread.id, 'x-cards');
    expect(cloned?.children?.map((child) => child.body)).toEqual(['a', 'b']);
    expect(await Expression.Class.clone(env, 999, 'x-post')).toBeNull();
  });

  it('calendar ids resolve to their expressions', async () => {
    const env = makeTestEnv();
    const piece = await pieceWithBase(env);
    const post = await Expression.Class.create(env, { pieceId: piece.id, kind: 'x-post', body: 'ok' });
    await Expression.Class.patch(env, post.id, { calendarId: '2026-09-08--x' });
    expect((await Expression.Class.byCalendarId(env, '2026-09-08--x')).map((row) => row.id)).toEqual([post.id]);
  });
});
