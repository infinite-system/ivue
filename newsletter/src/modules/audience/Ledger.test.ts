import { describe, expect, it } from 'vitest';
import { Ledger } from './Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Ledger', () => {
  it('record is idempotent per (email, slug) — the one-send invariant', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 999 },
    ]);
    const history = await Ledger.Class.historyFor(env, 'a@ivue.dev');
    expect(history).toHaveLength(1);
    expect(history[0].sentAt).toBe(100); // the first write wins, forever
  });

  it('sentSetForSlug names exactly who already received a post', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'b@ivue.dev', slug: 'second-post', sentAt: 100 },
    ]);
    const sent = await Ledger.Class.sentSetForSlug(env, 'first-post');
    expect(sent.has('a@ivue.dev')).toBe(true);
    expect(sent.has('b@ivue.dev')).toBe(false);
  });

  it('historyFor is newest first', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'a@ivue.dev', slug: 'second-post', sentAt: 200 },
    ]);
    const history = await Ledger.Class.historyFor(env, 'a@ivue.dev');
    expect(history.map((row) => row.slug)).toEqual([
      'second-post',
      'first-post',
    ]);
  });

  it('erase re-opens a (email, slug) pair — the explicit force-resend path', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
    ]);
    await Ledger.Class.erase(env, ['a@ivue.dev'], 'first-post');
    expect(
      (await Ledger.Class.sentSetForSlug(env, 'first-post')).size,
    ).toBe(0);
  });

  it('statsPerPost and totalSends aggregate the ledger', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'b@ivue.dev', slug: 'first-post', sentAt: 300 },
      { email: 'a@ivue.dev', slug: 'second-post', sentAt: 200 },
    ]);
    const stats = await Ledger.Class.statsPerPost(env);
    expect(stats[0]).toEqual({
      slug: 'first-post',
      sendCount: 2,
      lastSentAt: 300,
    });
    expect(await Ledger.Class.totalSends(env)).toBe(3);
  });
});
