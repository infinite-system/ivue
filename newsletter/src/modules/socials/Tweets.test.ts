/*
=== GENERATOR ===
Goal: Prove every post to X lands in its own ledger exactly once, newest first, for the panel to show what went out and when.
// domain-invariant: $Tweets — If a tweet id is recorded twice, then the first row stands
Impossible if true: a posted tweet is missing from the log

=== GENERATOR-DESCRIBED ===
$Tweets mirrors the sends philosophy for X: the ledger is written at post time so the dashboard reads history from D1, not from the X API.
*/
import { describe, expect, it } from 'vitest';
import { Tweets } from './Tweets';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Tweets', () => {
  // impossible-if-true: $Tweets — a posted tweet is missing from the log
  it('records posts and logs them newest first', async () => {
    const env = makeTestEnv();
    await Tweets.Class.record(
      env,
      { tweetId: '1', text: 'first tweet', slug: 'first-post' },
      100,
    );
    await Tweets.Class.record(
      env,
      { tweetId: '2', text: 'second tweet', slug: null },
      200,
    );
    const log = await Tweets.Class.log(env);
    expect(log.map((row) => row.tweetId)).toEqual(['2', '1']);
    expect(log[1]).toMatchObject({ text: 'first tweet', slug: 'first-post' });
  });

  // domain-invariant: $Tweets — If a tweet id is recorded twice, then the first row stands
  it('recording the same tweet id twice keeps the first row', async () => {
    const env = makeTestEnv();
    await Tweets.Class.record(env, { tweetId: '1', text: 'one', slug: null }, 100);
    await Tweets.Class.record(env, { tweetId: '1', text: 'other', slug: null }, 200);
    const log = await Tweets.Class.log(env);
    expect(log).toHaveLength(1);
    expect(log[0].text).toBe('one');
  });
});
