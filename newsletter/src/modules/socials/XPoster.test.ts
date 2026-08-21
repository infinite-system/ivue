import { afterEach, describe, expect, it, vi } from 'vitest';
import { XPoster } from './XPoster';
import { makeTestEnv } from '../../../test/TestDatabase';

const X_ENV = {
  X_API_KEY: 'consumer-key',
  X_API_SECRET: 'consumer-secret',
  X_ACCESS_TOKEN: 'access-token',
  X_ACCESS_SECRET: 'access-secret',
};

describe('XPoster', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('credentialsPresent requires all four secrets', () => {
    expect(XPoster.Class.credentialsPresent(makeTestEnv())).toBe(false);
    expect(XPoster.Class.credentialsPresent(makeTestEnv(X_ENV))).toBe(true);
    expect(
      XPoster.Class.credentialsPresent(
        makeTestEnv({ ...X_ENV, X_ACCESS_SECRET: '' }),
      ),
    ).toBe(false);
  });

  it('builds a deterministic OAuth 1.0a header (fixed nonce + timestamp)', async () => {
    const header = await XPoster.Class.authorizationHeader(
      makeTestEnv(X_ENV),
      'POST',
      'https://api.x.com/2/tweets',
      'fixednonce',
      1700000000,
    );
    expect(header).toContain('OAuth ');
    expect(header).toContain('oauth_consumer_key="consumer-key"');
    expect(header).toContain('oauth_token="access-token"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_timestamp="1700000000"');
    // stable signature for stable inputs — the regression pin
    const again = await XPoster.Class.authorizationHeader(
      makeTestEnv(X_ENV),
      'POST',
      'https://api.x.com/2/tweets',
      'fixednonce',
      1700000000,
    );
    expect(again).toBe(header);
    expect(header).toMatch(/oauth_signature="[A-Za-z0-9%]+"/);
  });

  it('percentEncode is RFC 3986 (encodes the five stragglers)', () => {
    expect(XPoster.Class.percentEncode("a!*'()b")).toBe('a%21%2A%27%28%29b');
    expect(XPoster.Class.percentEncode('a b+c')).toBe('a%20b%2Bc');
  });

  it('postTweet sends the signed request and returns the tweet id', async () => {
    let captured: { url: string; headers: Record<string, string>; body: string } | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, requestInit?: RequestInit) => {
        captured = {
          url: String(input),
          headers: (requestInit?.headers ?? {}) as Record<string, string>,
          body: String(requestInit?.body ?? ''),
        };
        return new Response(JSON.stringify({ data: { id: '1234567890' } }));
      }),
    );
    const result = await XPoster.Class.postTweet(
      makeTestEnv(X_ENV),
      'Hello from ivue',
    );
    expect(result.tweetId).toBe('1234567890');
    expect(captured!.url).toBe('https://api.x.com/2/tweets');
    expect(captured!.headers.authorization).toContain('oauth_signature=');
    expect(JSON.parse(captured!.body)).toEqual({ text: 'Hello from ivue' });
  });

  it('postThread chains replies and puts images on the first tweet only', async () => {
    const { installFetchStub } = await import('../../../test/Fixtures');
    const calls = installFetchStub({});
    const result = await XPoster.Class.postThread(
      makeTestEnv({ ...X_ENV, SITE_ORIGIN: 'https://ivue.dev' }),
      ['First tweet', 'Second tweet', 'Third tweet'],
      ['https://ivue.dev/blog/first-post.png'],
    );
    expect(result.tweetIds).toEqual(['tweet-1', 'tweet-2', 'tweet-3']);
    expect(calls.mediaUploads).toHaveLength(1);
    expect(calls.tweetCalls[0].media).toEqual({ media_ids: ['media-1'] });
    expect(calls.tweetCalls[0].reply).toBeUndefined();
    expect(calls.tweetCalls[1].reply).toEqual({
      in_reply_to_tweet_id: 'tweet-1',
    });
    expect(calls.tweetCalls[1].media).toBeUndefined();
    expect(calls.tweetCalls[2].reply).toEqual({
      in_reply_to_tweet_id: 'tweet-2',
    });
  });

  it('uploadImages caps at 4 and refuses off-site URLs', async () => {
    const { installFetchStub } = await import('../../../test/Fixtures');
    const calls = installFetchStub({});
    const env = makeTestEnv({ ...X_ENV, SITE_ORIGIN: 'https://ivue.dev' });
    const urls = Array.from(
      { length: 6 },
      (_, index) => `https://ivue.dev/blog/embeds/post-embed-${index + 1}.png`,
    );
    const mediaIds = await XPoster.Class.uploadImages(env, urls);
    expect(mediaIds).toHaveLength(4);
    expect(calls.mediaUploads).toHaveLength(4);
    await expect(
      XPoster.Class.uploadImages(env, ['https://evil.example/x.png']),
    ).rejects.toThrow(/site-hosted/);
  });

  it('surfaces X rejections as errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: 'duplicate content' }), {
            status: 403,
          }),
      ),
    );
    await expect(
      XPoster.Class.postTweet(makeTestEnv(X_ENV), 'Hello again'),
    ).rejects.toThrow(/403.*duplicate content/);
  });
});
