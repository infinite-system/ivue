import { afterEach, describe, expect, it, vi } from 'vitest';
import { Posts } from './Posts';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

describe('Posts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('load skips posts without emailHtml (deploy-skew guard)', async () => {
    const stale = { ...makePost('stale-post', 1), emailHtml: undefined };
    installFetchStub({ posts: [makePost('ready-post', 2), stale] });
    const posts = await Posts.Class.load(makeTestEnv());
    expect(posts.map((post) => post.slug)).toEqual(['ready-post']);
  });

  it('find locates by slug and summaries strips the email body', () => {
    const catalog = [makePost('first-post', 1), makePost('second-post', 2)];
    expect(Posts.Class.find(catalog, 'second-post')?.title).toBe(
      'Title of second-post',
    );
    expect(Posts.Class.find(catalog, 'missing')).toBeUndefined();
    const summaries = Posts.Class.summaries(catalog);
    expect(summaries[0]).not.toHaveProperty('emailHtml');
    expect(summaries[0].slug).toBe('first-post');
  });
});
