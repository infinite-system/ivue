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
      'body',
      'id',
      'name',
      'submittedAt',
    ]);
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
});
