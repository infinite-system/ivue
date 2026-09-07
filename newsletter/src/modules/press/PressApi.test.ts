/*
=== GENERATOR ===
Goal: Prove every press route answers on its singular path with the documented shape, records who wrote through the author header, refuses plural paths and unknown ids, and imports a prepared batch without parsing anything itself.
// domain-invariant: $PressApi — If a route is called on a plural resource name, then it is 404
// domain-invariant: $PressApi — If the X-Press-Author header is `agent`, then the revision records `agent`
Impossible if true: a press route exists that the CLI cannot drive with curl

=== GENERATOR-DESCRIBED ===
$PressApi is a thin router: ids in the path, one method per verb, every failure a JSON error. The stores own the rules; the API owns none.
*/
import { afterEach, describe, expect, it } from 'vitest';
import { AdminApi } from '../api/AdminApi';
import { Expression } from './Expression';
import { Posts } from '../content/Posts';
import { makeTestEnv } from '../../../test/TestDatabase';
import { makePost } from '../../../test/Fixtures';

const SECRET = 'press-secret';

async function call(
  path: string,
  env: Env,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const request = new Request(`https://newsletter.test${path}`, {
    method,
    headers: {
      authorization: `Bearer ${SECRET}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await AdminApi.Class.handle(request, new URL(request.url), env);
  return { status: response.status, json: await response.json().catch(() => null) };
}

function future() {
  return Math.floor(Date.now() / 1000) + 3600;
}

describe('PressApi', () => {
  afterEach(() => {
    Posts.Class = Posts.$Class;
  });

  it('pieces: list, create (blank and from a blog post), read, patch, base revisions', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    Posts.Class = class extends Posts.$Class {
      static override async load() {
        return [makePost('introducing-ivue', 1)];
      }
    };
    expect((await call('/admin/press/blog-post', env)).json[0]).toMatchObject({ slug: 'introducing-ivue', title: 'Title of introducing-ivue' });
    const created = await call('/admin/press/piece', env, 'POST', { fromSlug: 'introducing-ivue' });
    expect(created.status).toBe(200);
    expect(created.json.base).toContain('Plain text of introducing-ivue');
    const blank = await call('/admin/press/piece', env, 'POST', { title: 'Voice', base: 'Words.' });
    expect(blank.json.expressions).toBeUndefined();
    const list = await call('/admin/press/piece?q=voice', env);
    expect(list.json.map((piece: { title: string }) => piece.title)).toEqual(['Voice']);
    const detail = await call(`/admin/press/piece/${blank.json.id}`, env);
    expect(detail.json.expressions).toEqual([]);
    const patched = await call(`/admin/press/piece/${blank.json.id}`, env, 'PATCH', { base: 'New words.' }, { 'x-press-author': 'agent' });
    expect(patched.json.base).toBe('New words.');
    const revisions = await call(`/admin/press/piece/${blank.json.id}/base-revision`, env);
    expect(revisions.json[0]).toMatchObject({ base: 'Words.', author: 'agent' });
    const restored = await call(`/admin/press/piece/${blank.json.id}/base-revision/${revisions.json[0].id}/restore`, env, 'POST', {});
    expect(restored.json.base).toBe('Words.');
    expect((await call('/admin/press/piece/999', env)).status).toBe(404);
    expect((await call('/admin/press/piece', env, 'POST', { title: '' })).status).toBe(400);
  });

  // domain-invariant: $PressApi — If the X-Press-Author header is `agent`, then the revision records `agent`
  it('expressions: add, read, patch with author, approve, lint, segment, reorder, detach, clone, revisions', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    const piece = (await call('/admin/press/piece', env, 'POST', { title: 'T', base: 'One.\n\n---\n\nTwo.' })).json;
    const thread = (await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', { kind: 'x-thread', mode: 'derived' })).json;
    expect(thread.children.map((child: { body: string }) => child.body)).toEqual(['One.', 'Two.']);
    expect((await call(`/admin/press/expression/${thread.id}`, env)).json.kind).toBe('x-thread');
    // derived body refused with a JSON error, not a crash
    const refused = await call(`/admin/press/expression/${thread.children[0].id}`, env, 'PATCH', { body: 'x' });
    expect(refused.status).toBe(400);
    expect(refused.json.error).toMatch(/derived/);
    const detached = await call(`/admin/press/expression/${thread.id}/detach`, env, 'POST', {});
    expect(detached.json.mode).toBe('authored');
    const edited = await call(
      `/admin/press/expression/${thread.children[0].id}`,
      env,
      'PATCH',
      { body: 'Uno.' },
      { 'x-press-author': 'agent' },
    );
    expect(edited.json.children[0].body).toBe('Uno.');
    const revisions = await call(`/admin/press/expression/${thread.children[0].id}/revision`, env);
    expect(revisions.json[0]).toMatchObject({ body: 'One.', author: 'agent' });
    const grown = await call(`/admin/press/expression/${thread.id}/segment`, env, 'POST', { body: 'Three.' });
    expect(grown.json.children).toHaveLength(3);
    const ids = grown.json.children.map((child: { id: number }) => child.id);
    const reordered = await call(`/admin/press/expression/${thread.id}/reorder`, env, 'PATCH', { order: [ids[2], ids[1], ids[0]] });
    expect(reordered.json.children.map((child: { body: string }) => child.body)).toEqual(['Three.', 'Two.', 'Uno.']);
    expect((await call(`/admin/press/expression/${thread.id}/lint`, env)).json.problems).toEqual([]);
    const approved = await call(`/admin/press/expression/${thread.id}/approve`, env, 'POST', {});
    expect(approved.json.status).toBe('approved');
    const clone = await call(`/admin/press/expression/${thread.id}/clone`, env, 'POST', { kind: 'linkedin' });
    expect(clone.json).toMatchObject({ kind: 'linkedin', mode: 'authored' });
    expect((await call('/admin/press/expression/999', env)).status).toBe(404);
    expect((await call('/admin/press/expression/abc', env)).status).toBe(404);
  });

  // impossible-if-true: $PressApi — a press route exists that the CLI cannot drive with curl
  it('schedule, reschedule, cancel, sent, postings, queue', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    const piece = (await call('/admin/press/piece', env, 'POST', { title: 'T', base: 'Words.' })).json;
    const post = (await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', { kind: 'linkedin', body: 'ok', venue: 'LinkedIn' })).json;
    expect((await call(`/admin/press/expression/${post.id}/schedule`, env, 'POST', { dueAt: future() })).status).toBe(400);
    await call(`/admin/press/expression/${post.id}/approve`, env, 'POST', {});
    const scheduled = await call(`/admin/press/expression/${post.id}/schedule`, env, 'POST', { dueAt: future() });
    expect(scheduled.json.status).toBe('scheduled');
    const queue = await call('/admin/press/queue', env);
    expect(queue.json.upcoming[0].expression.id).toBe(post.id);
    const later = future() + 60;
    expect((await call(`/admin/press/expression/${post.id}/reschedule`, env, 'POST', { dueAt: later })).json.scheduledAt).toBe(later);
    expect((await call(`/admin/press/expression/${post.id}/cancel`, env, 'POST', {})).json.status).toBe('approved');
    const sent = await call(`/admin/press/expression/${post.id}/sent`, env, 'POST', { url: 'https://linkedin.com/x', calendarId: '2026-09-08--linkedin' });
    expect(sent.json.status).toBe('sent');
    // the calendar reads its copy by entry id
    await call(`/admin/press/expression/${post.id}`, env, 'PATCH', { calendarId: '2026-09-08--linkedin' });
    expect((await call('/admin/press/expression?calendar=2026-09-08--linkedin', env)).json.map((row: { id: number }) => row.id)).toEqual([post.id]);
    // …or by the source key its copy was imported under
    await call(`/admin/press/expression/${post.id}`, env, 'PATCH', { meta: { source: 'tasks/press-drafts/sol/01.md' } });
    const hook = (await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', { kind: 'x-post', body: 'hook', meta: { artifactKey: 'x:hooks:2' } })).json;
    expect((await call('/admin/press/expression?source=tasks%2Fpress-drafts%2Fsol%2F01.md', env)).json.map((row: { id: number }) => row.id)).toEqual([post.id]);
    expect((await call('/admin/press/expression?source=x:hooks', env)).json.map((row: { id: number }) => row.id)).toEqual([hook.id]);
    expect((await call('/admin/press/expression?source=x:hooks:2', env)).json.map((row: { id: number }) => row.id)).toEqual([hook.id]);
    const ledger = await call(`/admin/press/expression/${post.id}/posting`, env);
    expect(ledger.json[0]).toMatchObject({ platform: 'linkedin', venue: 'LinkedIn', url: 'https://linkedin.com/x', calendarId: '2026-09-08--linkedin', postedBy: 'manual' });
    expect((await call(`/admin/press/piece/${piece.id}/posting`, env)).json).toHaveLength(1);
    expect((await call('/admin/press/posting', env)).json[0]).toMatchObject({ pieceTitle: 'T', kind: 'linkedin' });
  });

  // domain-invariant: $PressApi — If a route is called on a plural resource name, then it is 404
  it('plural paths and unknown actions are 404; the router never leaks a stack', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    expect((await call('/admin/press/pieces', env)).status).toBe(404);
    expect((await call('/admin/press/expressions/1', env)).status).toBe(404);
    expect((await call('/admin/press/postings', env)).status).toBe(404);
    expect((await call('/admin/press/piece/1/nothing', env, 'POST', {})).status).toBe(404);
    expect((await call('/admin/press/expression/1/nothing', env, 'POST', {})).status).toBe(404);
    expect((await call('/admin/press/piece', env, 'DELETE')).status).toBe(404);
  });

  it('import inserts a prepared batch: pieces on first sight, expressions with segments, approvals applied when the lint passes', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    const report = await call('/admin/press/import', env, 'POST', {
      pieces: [
        {
          title: 'Launch',
          slug: 'introducing-ivue',
          base: 'a\n\n---\n\nb',
          expressions: [
            { kind: 'x-thread', segments: ['a', 'b'], approved: true, label: 'launch thread' },
            { kind: 'x-post', body: 'x'.repeat(300), approved: true },
            { kind: 'unknown-kind', body: 'x' },
          ],
        },
        { title: 'Launch', slug: 'introducing-ivue', expressions: [{ kind: 'email', body: 'Hi', venue: 'JS Weekly' }] },
      ],
    });
    expect(report.json).toMatchObject({ pieces: 1, expressions: 3, segments: 2 });
    expect(report.json.skipped).toHaveLength(2);
    const detail = (await call('/admin/press/piece?q=launch', env)).json[0];
    expect(detail.expressions.map((state: { kind: string; status: string }) => [state.kind, state.status])).toEqual([
      ['x-thread', 'approved'],
      ['x-post', 'draft'],
      ['email', 'draft'],
    ]);
    void Expression;
  });
});

describe('PressApi — every route and fallback', () => {
  it('the calendar and source lookups take an empty key; a non-Error failure still answers JSON', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    expect((await call('/admin/press/expression?calendar=', env)).json).toEqual([]);
    expect((await call('/admin/press/expression?source=', env)).json).toEqual([]);
    Posts.Class = class extends Posts.$Class {
      static override async load(): Promise<never> {
        throw 'the site is down';
      }
    };
    const failed = await call('/admin/press/blog-post', env);
    expect(failed.status).toBe(400);
    expect(failed.json.error).toBe('the site is down');
  });

  it('every remaining verb: unapprove, archive, segment and reorder defaults, post without X, clone without a kind, restore, lint of a ghost, a piece with a bad id', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    const piece = (await call('/admin/press/piece', env, 'POST', { title: 'T', base: 'Words.' })).json;
    expect((await call('/admin/press/piece/abc', env)).status).toBe(404);
    expect((await call(`/admin/press/piece/${piece.id}`, env, 'DELETE')).status).toBe(404);
    expect((await call('/admin/press/piece', env, 'DELETE')).status).toBe(404);
    expect((await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', {})).status).toBe(400);
    const thread = (await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', { kind: 'x-thread', segments: ['a'] })).json;
    expect((await call(`/admin/press/expression/${thread.id}`, env, 'DELETE')).status).toBe(404);
    expect((await call(`/admin/press/expression/${thread.id}/segment`, env, 'POST', {})).json.children).toHaveLength(2);
    expect((await call(`/admin/press/expression/${thread.id}/reorder`, env, 'PATCH', {})).status).toBe(400);
    await call(`/admin/press/expression/${thread.id}/approve`, env, 'POST', {});
    expect((await call(`/admin/press/expression/${thread.id}/unapprove`, env, 'POST', {})).json.status).toBe('draft');
    expect((await call(`/admin/press/expression/${thread.id}/clone`, env, 'POST', {})).status).toBe(400);
    const posted = await call(`/admin/press/expression/${thread.id}/post`, env, 'POST', {});
    expect(posted.status).toBe(400);
    const leaf = (await call(`/admin/press/piece/${piece.id}/expression`, env, 'POST', { kind: 'bluesky', body: 'one' })).json;
    await call(`/admin/press/expression/${leaf.id}`, env, 'PATCH', { body: 'two' });
    const revisions = (await call(`/admin/press/expression/${leaf.id}/revision`, env)).json;
    expect((await call(`/admin/press/expression/${leaf.id}/revision/${revisions[0].id}/restore`, env, 'POST', {})).json.body).toBe('one');
    expect((await call(`/admin/press/expression/${leaf.id}/revision/999/restore`, env, 'POST', {})).status).toBe(404);
    expect((await call('/admin/press/expression/999/lint', env)).status).toBe(404);
    expect((await call('/admin/press/expression/999/post', env, 'POST', {})).status).toBe(404);
    expect((await call(`/admin/press/expression/${thread.id}/archive`, env, 'POST', {})).json.status).toBe('archived');
    // the queue resolves only expression jobs; a plain tweet job rides along with no expression
    await call('/admin/schedule', env, 'POST', { kind: 'tweet', payload: { text: 'plain', slug: '' }, dueAt: future() });
    const queue = await call('/admin/press/queue', env);
    expect(queue.json.upcoming[0].expression).toBeNull();
  });

  it('import: no pieces, a piece found by slug then by title, an expression list absent, every default', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    expect((await call('/admin/press/import', env, 'POST', {})).json).toMatchObject({ pieces: 0, expressions: 0 });
    const first = await call('/admin/press/import', env, 'POST', { pieces: [{ title: 'Voice' }, { title: 'Voice', expressions: [{ kind: 'note', body: 'n' }] }, { title: 'Art', slug: 'art' }] });
    expect(first.json).toMatchObject({ pieces: 2, expressions: 1 });
    const second = await call('/admin/press/import', env, 'POST', { pieces: [{ title: 'Art', slug: 'art', expressions: [{ kind: 'note', body: 'n' }] }] });
    expect(second.json).toMatchObject({ pieces: 0, expressions: 1 });
    expect((await call('/admin/press/piece', env)).json).toHaveLength(2);
  });
});
