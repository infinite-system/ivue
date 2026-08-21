import { describe, expect, it } from 'vitest';
import { Tweets } from './Tweets';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Tweets', () => {
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

  it('recording the same tweet id twice keeps the first row', async () => {
    const env = makeTestEnv();
    await Tweets.Class.record(env, { tweetId: '1', text: 'one', slug: null }, 100);
    await Tweets.Class.record(env, { tweetId: '1', text: 'other', slug: null }, 200);
    const log = await Tweets.Class.log(env);
    expect(log).toHaveLength(1);
    expect(log[0].text).toBe('one');
  });
});
