import { Static } from 'ivue/extras';

// Posting to X — API v2 POST /2/tweets signed with OAuth 1.0a user
// context (the single-account path: four never-expiring credentials in
// Worker secrets, no refresh-token dance). The HMAC-SHA1 signature is
// plain WebCrypto; nonce and timestamp are injectable so the signature
// is deterministic under test.
class $XPoster {
  static get TWEET_URL() {
    return 'https://api.x.com/2/tweets';
  }

  static get MEDIA_UPLOAD_URL() {
    return 'https://api.x.com/2/media/upload';
  }

  static credentialsPresent(env: Env): boolean {
    return Boolean(
      env.X_API_KEY &&
        env.X_API_SECRET &&
        env.X_ACCESS_TOKEN &&
        env.X_ACCESS_SECRET,
    );
  }

  // The one entry point callers use: text, optionally with the post's
  // banner attached natively (fetched from the site, uploaded to X).
  static async postWithOptionalBanner(
    env: Env,
    text: string,
    options: { slug?: string; attachBanner?: boolean } = {},
  ): Promise<TweetResult> {
    let mediaId: string | undefined;
    if (options.attachBanner && options.slug) {
      const banner = await fetch(
        `${env.SITE_ORIGIN}/blog/${options.slug}.png`,
      );
      if (!banner.ok)
        throw new Error(`Banner not found for slug: ${options.slug}`);
      mediaId = await this.uploadMedia(
        env,
        await banner.arrayBuffer(),
        'image/png',
      );
    }
    return this.postTweet(env, text, { mediaId });
  }

  // X media upload — multipart form (form fields stay OUT of the OAuth
  // base string, so the same signer applies)
  static async uploadMedia(
    env: Env,
    bytes: ArrayBuffer,
    mimeType: string,
    options: { nonce?: string; timestampSeconds?: number } = {},
  ): Promise<string> {
    const authorization = await this.authorizationHeader(
      env,
      'POST',
      this.MEDIA_UPLOAD_URL,
      options.nonce ?? crypto.randomUUID().replaceAll('-', ''),
      options.timestampSeconds ?? Math.floor(Date.now() / 1000),
    );
    const form = new FormData();
    form.append('media', new Blob([bytes], { type: mimeType }), 'banner.png');
    form.append('media_category', 'tweet_image');
    const response = await fetch(this.MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: { authorization },
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { id: string };
      detail?: string;
    };
    if (!response.ok || !payload.data?.id)
      throw new Error(
        `X rejected the media upload (HTTP ${response.status}): ${
          payload.detail ?? 'unknown error'
        }`,
      );
    return payload.data.id;
  }

  static async postTweet(
    env: Env,
    text: string,
    options: {
      nonce?: string;
      timestampSeconds?: number;
      mediaId?: string;
    } = {},
  ): Promise<TweetResult> {
    const authorization = await this.authorizationHeader(
      env,
      'POST',
      this.TWEET_URL,
      options.nonce ?? crypto.randomUUID().replaceAll('-', ''),
      options.timestampSeconds ?? Math.floor(Date.now() / 1000),
    );
    const response = await fetch(this.TWEET_URL, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        ...(options.mediaId
          ? { media: { media_ids: [options.mediaId] } }
          : {}),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { id: string };
      detail?: string;
      title?: string;
    };
    if (!response.ok || !payload.data?.id)
      throw new Error(
        `X rejected the tweet (HTTP ${response.status}): ${
          payload.detail ?? payload.title ?? 'unknown error'
        }`,
      );
    return { tweetId: payload.data.id };
  }

  // OAuth 1.0a: the signature covers method, url, and the oauth_*
  // parameters (a JSON body is NOT part of the base string).
  static async authorizationHeader(
    env: Env,
    method: string,
    url: string,
    nonce: string,
    timestampSeconds: number,
  ): Promise<string> {
    const oauthParameters: Record<string, string> = {
      oauth_consumer_key: env.X_API_KEY ?? '',
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: String(timestampSeconds),
      oauth_token: env.X_ACCESS_TOKEN ?? '',
      oauth_version: '1.0',
    };
    const parameterString = Object.keys(oauthParameters)
      .sort()
      .map(
        (key) =>
          `${this.percentEncode(key)}=${this.percentEncode(oauthParameters[key])}`,
      )
      .join('&');
    const signatureBase = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(parameterString),
    ].join('&');
    const signingKey = `${this.percentEncode(env.X_API_SECRET ?? '')}&${this.percentEncode(env.X_ACCESS_SECRET ?? '')}`;
    const signature = await this.hmacSha1Base64(signingKey, signatureBase);
    const headerParameters = {
      ...oauthParameters,
      oauth_signature: signature,
    };
    return (
      'OAuth ' +
      Object.keys(headerParameters)
        .sort()
        .map(
          (key) =>
            `${this.percentEncode(key)}="${this.percentEncode(
              headerParameters[key as keyof typeof headerParameters],
            )}"`,
        )
        .join(', ')
    );
  }

  // RFC 3986 encoding — encodeURIComponent plus the five characters it
  // leaves bare
  static percentEncode(value: string): string {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  static async hmacSha1Base64(key: string, message: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(message),
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}

export namespace XPoster {
  export const $Class = Static($XPoster);
  export let Class = $Class;
}

export interface TweetResult {
  tweetId: string;
}
