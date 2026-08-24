import { describe, expect, it } from 'vitest';
import { Comments } from './Comments';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Comments', () => {
  it('submit stores pending; approvedFor serves approved only, WITHOUT emails', async () => {
    const env = makeTestEnv();
    const id = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'Ada@IVUE.dev',
      body: 'Great post.',
    });
    expect(id).toBeGreaterThan(0);
    // pending — invisible publicly
    expect(await Comments.Class.approvedFor(env, 'first-post')).toEqual([]);

    expect(await Comments.Class.approve(env, id)).toBe(true);
    const approved = await Comments.Class.approvedFor(env, 'first-post');
    expect(approved).toHaveLength(1);
    expect(approved[0].name).toBe('Ada');
    expect(approved[0].body).toBe('Great post.');
    // the privacy guarantee: no email key on the public projection
    expect(Object.keys(approved[0]).sort()).toEqual([
      'avatarSeed',
      'body',
      'id',
      'locked',
      'name',
      'parentId',
      'rootId',
      'submittedAt',
    ]);
    // …and the avatar seed is a handle, never the address
    expect(approved[0].avatarSeed).toMatch(/^[0-9a-f]{16}$/);
    expect(approved[0].avatarSeed).not.toContain('ada');
  });

  it('validation: slug shape, name, email pattern, body presence and cap', async () => {
    const env = makeTestEnv();
    const valid = {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'ok',
    };
    await expect(
      Comments.Class.submit(env, { ...valid, slug: '../etc' }),
    ).rejects.toThrow('Bad post slug');
    await expect(
      Comments.Class.submit(env, { ...valid, name: '  ' }),
    ).rejects.toThrow('name');
    await expect(
      Comments.Class.submit(env, { ...valid, email: 'not-an-email' }),
    ).rejects.toThrow('email');
    await expect(
      Comments.Class.submit(env, { ...valid, body: '' }),
    ).rejects.toThrow('empty');
    await expect(
      Comments.Class.submit(env, { ...valid, body: 'x'.repeat(2001) }),
    ).rejects.toThrow('capped');
  });

  it('page puts pending before approved; approve and remove report reality', async () => {
    const env = makeTestEnv();
    const firstId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'first',
    });
    await Comments.Class.approve(env, firstId);
    await Comments.Class.submit(env, {
      slug: 'second-post',
      name: 'Bo',
      email: 'bo@ivue.dev',
      body: 'second',
    });

    const page = await Comments.Class.page(env, {});
    expect(page.total).toBe(2);
    expect(page.rows[0].status).toBe('pending'); // queue first
    expect(page.rows[1].status).toBe('approved');
    expect(await Comments.Class.pendingCount(env)).toBe(1);

    const filtered = await Comments.Class.page(env, { status: 'approved' });
    expect(filtered.rows).toHaveLength(1);
    const searched = await Comments.Class.page(env, { search: 'bo@' });
    expect(searched.rows[0].name).toBe('Bo');

    expect(await Comments.Class.remove(env, firstId)).toBe(true);
    expect(await Comments.Class.remove(env, firstId)).toBe(false);
    expect(await Comments.Class.approve(env, 999)).toBe(false);
  });

  // ---- threads -------------------------------------------------------

  async function thread(env: Env) {
    const rootId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'The opening comment.',
    });
    await Comments.Class.approve(env, rootId);
    const replyId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Bo',
      email: 'bo@ivue.dev',
      body: 'A reply to Ada.',
      parentId: rootId,
    });
    await Comments.Class.approve(env, replyId);
    return { rootId, replyId };
  }

  it('a top-level comment roots itself; a reply carries the root', async () => {
    const env = makeTestEnv();
    const { rootId, replyId } = await thread(env);
    const rows = await Comments.Class.approvedFor(env, 'first-post');
    const root = rows.find((row) => row.id === rootId)!;
    const reply = rows.find((row) => row.id === replyId)!;
    expect(root.parentId).toBe(null);
    expect(root.rootId).toBe(rootId);
    expect(reply.parentId).toBe(rootId);
    expect(reply.rootId).toBe(rootId);
  });

  it('depth stays two: answering a reply keeps the same root', async () => {
    const env = makeTestEnv();
    const { rootId, replyId } = await thread(env);
    const deepId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Cy',
      email: 'cy@ivue.dev',
      body: '@Bo good point.',
      parentId: replyId,
    });
    await Comments.Class.approve(env, deepId);
    const deep = (await Comments.Class.rowFor(env, deepId))!;
    expect(deep.parentId).toBe(replyId); // addresses the reply…
    expect(deep.rootId).toBe(rootId); // …but never nests deeper
  });

  it('replies validate their parent: unknown, pending, or other post', async () => {
    const env = makeTestEnv();
    const pendingId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'not approved yet',
    });
    const base = {
      slug: 'first-post',
      name: 'Bo',
      email: 'bo@ivue.dev',
      body: 'hi',
    };
    await expect(
      Comments.Class.submit(env, { ...base, parentId: 4242 }),
    ).rejects.toThrow('no longer available');
    await expect(
      Comments.Class.submit(env, { ...base, parentId: pendingId }),
    ).rejects.toThrow('no longer available');
    await Comments.Class.approve(env, pendingId);
    await expect(
      Comments.Class.submit(env, {
        ...base,
        slug: 'second-post',
        parentId: pendingId,
      }),
    ).rejects.toThrow('another post');
  });

  it('a locked thread refuses replies; unlocking restores them', async () => {
    const env = makeTestEnv();
    const { rootId, replyId } = await thread(env);
    expect(await Comments.Class.setLocked(env, rootId, true)).toBe(true);
    expect(await Comments.Class.threadLocked(env, rootId)).toBe(true);
    const attempt = {
      slug: 'first-post',
      name: 'Cy',
      email: 'cy@ivue.dev',
      body: 'let me in',
      parentId: replyId, // locking the ROOT closes the whole thread
    };
    await expect(Comments.Class.submit(env, attempt)).rejects.toThrow(
      'locked',
    );
    // locking via a reply id locks the thread it belongs to
    expect(await Comments.Class.setLocked(env, replyId, false)).toBe(true);
    expect(await Comments.Class.threadLocked(env, rootId)).toBe(false);
    await expect(Comments.Class.submit(env, attempt)).resolves.toBeGreaterThan(
      0,
    );
    expect(await Comments.Class.setLocked(env, 999, true)).toBe(false);
  });

  it('subscriptions: opt-in by default, opt-out honored, per thread', async () => {
    const env = makeTestEnv();
    const { rootId } = await thread(env);
    // both participants followed the thread by default
    expect(await Comments.Class.subscribed(env, rootId, 'ada@ivue.dev')).toBe(
      true,
    );
    expect(await Comments.Class.subscribed(env, rootId, 'bo@ivue.dev')).toBe(
      true,
    );
    // opting out at submit time stores no subscription
    const otherRoot = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Cy',
      email: 'cy@ivue.dev',
      body: 'quiet one',
      subscribeReplies: false,
    });
    expect(await Comments.Class.subscribed(env, otherRoot, 'cy@ivue.dev')).toBe(
      false,
    );
    // unsubscribe reports reality and is scoped to the one thread
    expect(await Comments.Class.unsubscribe(env, rootId, 'ADA@ivue.dev')).toBe(
      true,
    );
    expect(await Comments.Class.unsubscribe(env, rootId, 'ada@ivue.dev')).toBe(
      false,
    );
    expect(await Comments.Class.subscribed(env, rootId, 'bo@ivue.dev')).toBe(
      true,
    );
  });

  it('recipients: the answered author and mentions only — never the starter by default', async () => {
    const env = makeTestEnv();
    const { rootId, replyId } = await thread(env);

    // a reply TO Ada's root notifies Ada (she is the parent author)
    const toRoot = (await Comments.Class.rowFor(env, replyId))!;
    expect(await Comments.Class.replyRecipients(env, toRoot)).toEqual([
      { email: 'ada@ivue.dev', name: 'Ada' },
    ]);

    // a reply to BO's reply notifies Bo, and NOT Ada (the thread starter)
    const deepId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Cy',
      email: 'cy@ivue.dev',
      body: 'Answering the reply.',
      parentId: replyId,
    });
    await Comments.Class.approve(env, deepId);
    const deep = (await Comments.Class.rowFor(env, deepId))!;
    expect(await Comments.Class.replyRecipients(env, deep)).toEqual([
      { email: 'bo@ivue.dev', name: 'Bo' },
    ]);

    // …unless she is @mentioned, which is exactly "addressed to them"
    const mentionId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Cy',
      email: 'cy@ivue.dev',
      body: '@Ada what do you think? Also @Bo.',
      parentId: replyId,
    });
    await Comments.Class.approve(env, mentionId);
    const mention = (await Comments.Class.rowFor(env, mentionId))!;
    const emails = (await Comments.Class.replyRecipients(env, mention))
      .map((recipient) => recipient.email)
      .sort();
    expect(emails).toEqual(['ada@ivue.dev', 'bo@ivue.dev']);
  });

  it('recipients respect consent and never include the replier', async () => {
    const env = makeTestEnv();
    const { rootId, replyId } = await thread(env);
    await Comments.Class.unsubscribe(env, rootId, 'ada@ivue.dev');
    const toRoot = (await Comments.Class.rowFor(env, replyId))!;
    expect(await Comments.Class.replyRecipients(env, toRoot)).toEqual([]);

    // Bo replying to his own comment notifies nobody
    const selfId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Bo',
      email: 'bo@ivue.dev',
      body: 'Adding to my own point.',
      parentId: replyId,
    });
    await Comments.Class.approve(env, selfId);
    const self = (await Comments.Class.rowFor(env, selfId))!;
    expect(await Comments.Class.replyRecipients(env, self)).toEqual([]);
  });

  it('mentionsIn reads names, including multi-word, and ignores punctuation', () => {
    expect(Comments.Class.mentionsIn('hi @Ada, thanks')).toContain('ada');
    expect(Comments.Class.mentionsIn('cc @Ada Lovelace here')).toContain(
      'ada lovelace',
    );
    // a trailing sentence word cannot swallow the name
    expect(Comments.Class.mentionsIn('cc @Ada Lovelace here')).toContain('ada');
    expect(Comments.Class.mentionsIn('no mentions at all')).toEqual([]);
  });
});
