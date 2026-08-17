import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drip } from './Drip';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

const CADENCE_SECONDS = 40 * 3600;

describe('Drip.plan (the pure decision the cron and the preview share)', () => {
  const posts = [makePost('first-post', 1), makePost('second-post', 2)];

  it('a brand-new subscriber is due their oldest post immediately', () => {
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [],
      CADENCE_SECONDS,
      1_000_000,
    );
    expect(entries[0].nextSlug).toBe('first-post');
    expect(entries[0].sendNow).toBe(true);
  });

  it('the cadence gate holds a recently-mailed subscriber', () => {
    const now = 1_000_000;
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [{ email: 'a@ivue.dev', slug: 'first-post', sentAt: now - 3600 }],
      CADENCE_SECONDS,
      now,
    );
    expect(entries[0].nextSlug).toBe('second-post');
    expect(entries[0].sendNow).toBe(false);
    expect(entries[0].dueAt).toBe(now - 3600 + CADENCE_SECONDS);
  });

  it('a fully caught-up subscriber has nothing to receive', () => {
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [
        { email: 'a@ivue.dev', slug: 'first-post', sentAt: 1 },
        { email: 'a@ivue.dev', slug: 'second-post', sentAt: 2 },
      ],
      CADENCE_SECONDS,
      1_000_000,
    );
    expect(entries[0].nextSlug).toBeNull();
    expect(entries[0].sendNow).toBe(false);
  });

  it('a broadcast that jumped the queue is never re-sent — the drip skips it', () => {
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      // second-post arrived via broadcast long ago; first-post still owed
      [{ email: 'a@ivue.dev', slug: 'second-post', sentAt: 10 }],
      CADENCE_SECONDS,
      1_000_000,
    );
    expect(entries[0].nextSlug).toBe('first-post');
    expect(entries[0].sendNow).toBe(true);
  });
});

describe('Drip.run (full pass over real tables and stubbed transports)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delivers each due subscriber their oldest unsent post, grouped by slug', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'new@ivue.dev', 'New', 'newsletter');
    await Audience.Class.enroll(env, 'mid@ivue.dev', 'Mid', 'newsletter');
    await Ledger.Class.record(env, [
      { email: 'mid@ivue.dev', slug: 'first-post', sentAt: 1 }, // long ago
    ]);
    const postmarkCalls = installFetchStub({
      posts: [makePost('first-post', 1), makePost('second-post', 2)],
    });

    const delivered = await Drip.Class.run(env);
    expect(delivered).toBe(2);
    const recipientsBySubject = postmarkCalls.flatMap((call) =>
      call.messages.map((message) => `${message.Subject} -> ${message.To}`),
    );
    expect(recipientsBySubject.sort()).toEqual([
      'Title of first-post -> new@ivue.dev',
      'Title of second-post -> mid@ivue.dev',
    ]);
  });

  it('a second immediate pass sends nothing (cadence + ledger)', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    expect(await Drip.Class.run(env)).toBe(1);
    expect(await Drip.Class.run(env)).toBe(0);
  });
});
