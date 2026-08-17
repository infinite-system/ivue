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
    emailHtml: `<html><body>${slug} — <a href="{{UNSUBSCRIBE_URL}}">unsubscribe</a></body></html>`,
  };
}

export interface FetchStubOptions {
  posts?: unknown[];
  // one outcome per message, applied in order; default accepts everything
  postmarkOutcome?: (recipient: string) => PostmarkOutcome;
  postmarkStatus?: number;
}

export interface RecordedPostmarkCall {
  messages: {
    To: string;
    Subject: string;
    HtmlBody: string;
    MessageStream: string;
  }[];
}

// Installs a global fetch stub; returns the record of Postmark calls so
// tests can assert exactly what would have been sent.
export function installFetchStub(
  options: FetchStubOptions,
): RecordedPostmarkCall[] {
  const postmarkCalls: RecordedPostmarkCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/blog-index.json'))
        return new Response(JSON.stringify(options.posts ?? []));
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
