import { Static } from 'ivue/extras';

// The tweets ledger — same philosophy as sends: every post to X is
// recorded so the panel can show what went out, when, and for which
// blog post.
class $Tweets {
  static async record(
    env: Env,
    tweet: { tweetId: string; text: string; slug: string | null },
    postedAt: number,
  ): Promise<void> {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO tweets (tweet_id, text, slug, posted_at) VALUES (?, ?, ?, ?)',
    )
      .bind(tweet.tweetId, tweet.text, tweet.slug, postedAt)
      .run();
  }

  static async log(env: Env, limit = 50): Promise<TweetRow[]> {
    const { results } = await env.DB.prepare(
      'SELECT tweet_id AS tweetId, text, slug, posted_at AS postedAt ' +
        'FROM tweets ORDER BY posted_at DESC LIMIT ?',
    )
      .bind(Math.min(Math.max(1, limit), 200))
      .all<TweetRow>();
    return results;
  }
}

export namespace Tweets {
  export const $Class = Static($Tweets);
  export let Class = $Class;
}

export interface TweetRow {
  tweetId: string;
  text: string;
  slug: string | null;
  postedAt: number;
}
