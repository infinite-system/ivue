import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scheduler } from './Scheduler';
import { Audience } from '../audience/Audience';
import { Tweets } from '../socials/Tweets';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

const X_ENV = {
  X_API_KEY: 'k',
  X_API_SECRET: 's',
  X_ACCESS_TOKEN: 't',
  X_ACCESS_SECRET: 'ts',
};

function farFuture() {
  return Math.floor(Date.now() / 1000) + 3600;
}

describe('Scheduler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('schedules, lists upcoming, and cancels pending jobs', async () => {
    const env = makeTestEnv();
    const job = await Scheduler.Class.schedule(
      env,
      'tweet',
      { text: 'Hello', slug: '' },
      farFuture(),
    );
    expect(job.id).toBeGreaterThan(0);
    const listed = await Scheduler.Class.list(env);
    expect(listed.upcoming).toHaveLength(1);
    expect(listed.upcoming[0].payload.text).toBe('Hello');

    expect(await Scheduler.Class.cancel(env, job.id)).toBe(true);
    expect(await Scheduler.Class.cancel(env, job.id)).toBe(false);
    expect((await Scheduler.Class.list(env)).upcoming).toHaveLength(0);
  });

  it('rejects past times, unknown kinds, and empty payloads', async () => {
    const env = makeTestEnv();
    await expect(
      Scheduler.Class.schedule(env, 'tweet', { text: 'x', slug: '' }, 1000),
    ).rejects.toThrow(/future/);
    await expect(
      Scheduler.Class.schedule(
        env,
        'carrier-pigeon' as never,
        { text: 'x', slug: '' },
        farFuture(),
      ),
    ).rejects.toThrow(/kind/);
    await expect(
      Scheduler.Class.schedule(env, 'tweet', { text: '  ', slug: '' }, farFuture()),
    ).rejects.toThrow(/text/);
    await expect(
      Scheduler.Class.schedule(
        env,
        'broadcast',
        { slug: '', list: 'newsletter' },
        farFuture(),
      ),
    ).rejects.toThrow(/slug/);
  });

  it('runDue executes a due broadcast through the ledger-filtered core', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    await Scheduler.Class.schedule(
      env,
      'broadcast',
      { slug: 'first-post', list: 'newsletter' },
      farFuture(),
    );
    // not due yet — nothing runs
    expect(await Scheduler.Class.runDue(env)).toBe(0);
    // force it due
    await env.DB.prepare('UPDATE scheduled_jobs SET due_at = 1').run();
    expect(await Scheduler.Class.runDue(env)).toBe(1);
    const { recent } = await Scheduler.Class.list(env);
    expect(recent[0].result).toMatchObject({ ok: true });
    expect(recent[0].result?.detail).toContain('delivered 1');
    // the claim: a second pass finds nothing
    expect(await Scheduler.Class.runDue(env)).toBe(0);
  });

  it('runDue posts a due tweet and records it in the tweets ledger', async () => {
    const env = makeTestEnv(X_ENV);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: { id: '77' } }))),
    );
    await Scheduler.Class.schedule(
      env,
      'tweet',
      { text: 'Scheduled hello', slug: 'first-post' },
      farFuture(),
    );
    await env.DB.prepare('UPDATE scheduled_jobs SET due_at = 1').run();
    expect(await Scheduler.Class.runDue(env)).toBe(1);
    const log = await Tweets.Class.log(env);
    expect(log[0]).toMatchObject({ tweetId: '77', slug: 'first-post' });
  });

  it('runDue posts a due THREAD, chaining and ledgering every tweet', async () => {
    const env = makeTestEnv({ ...X_ENV, SITE_ORIGIN: 'https://ivue.dev' });
    const calls = installFetchStub({});
    await Scheduler.Class.schedule(
      env,
      'thread',
      {
        tweets: JSON.stringify(['One', 'Two', 'Three']),
        slug: 'first-post',
        images: JSON.stringify(['https://ivue.dev/blog/first-post.png']),
      },
      farFuture(),
    );
    await env.DB.prepare('UPDATE scheduled_jobs SET due_at = 1').run();
    expect(await Scheduler.Class.runDue(env)).toBe(1);
    expect(calls.tweetCalls).toHaveLength(3);
    expect(calls.tweetCalls[2].reply).toEqual({
      in_reply_to_tweet_id: 'tweet-2',
    });
    const log = await Tweets.Class.log(env);
    expect(log).toHaveLength(3);
    const { recent } = await Scheduler.Class.list(env);
    expect(recent[0].result?.detail).toBe('thread of 3');
  });

  it('a thread with fewer than 2 tweets is refused at schedule time', async () => {
    const env = makeTestEnv();
    await expect(
      Scheduler.Class.schedule(
        env,
        'thread',
        { tweets: JSON.stringify(['only one']), slug: '' },
        farFuture(),
      ),
    ).rejects.toThrow(/at least 2/);
  });

  it('a failing job records its error instead of throwing the tick', async () => {
    const env = makeTestEnv(); // no X credentials
    await Scheduler.Class.schedule(
      env,
      'tweet',
      { text: 'Doomed', slug: '' },
      farFuture(),
    );
    await env.DB.prepare('UPDATE scheduled_jobs SET due_at = 1').run();
    expect(await Scheduler.Class.runDue(env)).toBe(1);
    const { recent } = await Scheduler.Class.list(env);
    expect(recent[0].result?.error).toContain('credentials');
  });
});
