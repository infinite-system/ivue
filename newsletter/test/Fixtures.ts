// Shared test fixtures: post builders and a dispatching fetch stub for
// the two external surfaces (the site's blog-index.json and Postmark's
// batch API).
import { vi } from 'vitest';
import type { Post } from '../src/modules/content/Posts';
import type { PostmarkOutcome } from '../src/modules/delivery/Delivery';

export function makePost(slug: string, timestamp: number): Post {
  return {
    slug,
    title: `Title of ${slug}`,
    description: `About ${slug}`,
    url: `https://ivue.dev/blog/${slug}`,
    date: '2026-08-01',
    timestamp,
    embedImages: [`https://ivue.dev/blog/embeds/${slug}-embed-1.png`],
    plainText: `Plain text of ${slug}.\n\nSecond paragraph of ${slug}.`,
    emailHtml: `<html><body>${slug} — <a href="{{UNSUBSCRIBE_URL}}">unsubscribe</a></body></html>`,
  };
}

export interface FetchStubOptions {
  posts?: unknown[];
  // one outcome per message, applied in order; default accepts everything
  postmarkOutcome?: (recipient: string) => PostmarkOutcome;
  postmarkStatus?: number;
}

export interface PostmarkMessage {
  To: string;
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  MessageStream: string;
}

export interface RecordedPostmarkCall {
  messages: PostmarkMessage[];
}

// Installs a global fetch stub; the returned batch record doubles as the
// notification record via its `notifications` property (single-email
// endpoint), so existing batch assertions keep their shape.
export function installFetchStub(
  options: FetchStubOptions,
): RecordedPostmarkCall[] & {
  notifications: PostmarkMessage[];
  mediaUploads: string[];
  tweetCalls: Record<string, unknown>[];
} {
  const postmarkCalls = Object.assign([] as RecordedPostmarkCall[], {
    notifications: [] as PostmarkMessage[],
    mediaUploads: [] as string[],
    tweetCalls: [] as Record<string, unknown>[],
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/blog-index.json'))
        return new Response(JSON.stringify(options.posts ?? []));
      if (url.includes('api.x.com/2/media/upload')) {
        postmarkCalls.mediaUploads.push(url);
        return new Response(
          JSON.stringify({ data: { id: `media-${postmarkCalls.mediaUploads.length}` } }),
        );
      }
      if (url.includes('api.x.com/2/tweets')) {
        const body = JSON.parse(String(requestInit?.body ?? '{}')) as Record<string, unknown>;
        postmarkCalls.tweetCalls.push(body);
        return new Response(
          JSON.stringify({ data: { id: `tweet-${postmarkCalls.tweetCalls.length}` } }),
        );
      }
      if (url.includes('ivue.dev/blog/')) {
        // banner/embed image fetches — any bytes will do
        return new Response(new Uint8Array([137, 80, 78, 71]));
      }
      if (url.endsWith('api.postmarkapp.com/email')) {
        postmarkCalls.notifications.push(
          JSON.parse(String(requestInit?.body ?? '{}')) as PostmarkMessage,
        );
        return new Response(JSON.stringify({ ErrorCode: 0, Message: 'OK' }));
      }
      if (url.includes('api.postmarkapp.com')) {
        const messages = JSON.parse(
          String(requestInit?.body ?? '[]'),
        ) as RecordedPostmarkCall['messages'];
        postmarkCalls.push({ messages });
        if (options.postmarkStatus && options.postmarkStatus !== 200)
          return new Response('postmark down', {
            status: options.postmarkStatus,
          });
        const outcomes = messages.map(
          (message) =>
            options.postmarkOutcome?.(message.To) ?? {
              ErrorCode: 0,
              Message: 'OK',
            },
        );
        return new Response(JSON.stringify(outcomes));
      }
      throw new Error(`unstubbed fetch: ${url}`);
    }),
  );
  return postmarkCalls;
}
