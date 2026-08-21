import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XComposeModel } from './XComposeModel';

// constructor loads posts/settings/tweets — all endpoints answer minimal
beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/schedule'))
        return new Response(JSON.stringify({ upcoming: [], recent: [] }));
      if (url.includes('/admin/settings'))
        return new Response(
          JSON.stringify({
            cadenceHours: 40,
            tweetTemplate: 'New — {title}\n\n{url}',
            tweetContentTemplate: '{title}\n\n{description}\n\n{url}',
            xConfigured: false,
            sender: {},
          }),
        );
      return new Response('[]');
    }),
  );
});

const POST = {
  slug: 'first-post',
  title: 'One kilobyte is a feature',
  description: 'What a kilobyte buys you is auditability.',
  url: 'https://ivue.dev/blog/first-post',
  date: null,
  timestamp: 1,
  embedImages: ['https://ivue.dev/blog/embeds/first-post-embed-1.png'],
  codeImages: ['https://ivue.dev/blog/code/first-post-code-1.png'],
};

describe('XComposeModel derivations', () => {
  it('weightedLength counts every URL as 23 characters', () => {
    const model = new XComposeModel.Class();
    model.draft.value = 'Read this: https://ivue.dev/blog/a-very-long-slug-here';
    expect(model.weightedLength).toBe('Read this: '.length + 23);
    model.draft.value = 'no links here';
    expect(model.weightedLength).toBe(13);
  });

  it('overLimit flips past 280 weighted characters', () => {
    const model = new XComposeModel.Class();
    model.draft.value = 'x'.repeat(280);
    expect(model.overLimit).toBe(false);
    model.draft.value = 'x'.repeat(281);
    expect(model.overLimit).toBe(true);
    expect(model.remaining).toBe(-1);
  });

  it('content mode fills from the content template and selects the banner', () => {
    const model = new XComposeModel.Class();
    model.template.value = 'Link: {title} {url}';
    model.contentTemplate.value = '{title}\n\n{description}\n\n{url}';
    model.posts.value = [POST];
    model.pickPost('first-post');
    expect(model.selectedImages.value).toEqual([]); // link mode: card, no upload
    expect(model.draft.value).toBe(
      'Link: One kilobyte is a feature https://ivue.dev/blog/first-post',
    );
    model.setMode('content'); // re-prefills the picked post
    expect(model.draft.value).toContain('One kilobyte is a feature');
    expect(model.selectedImages.value).toEqual([
      'https://ivue.dev/blog/first-post.png',
    ]);
    expect(model.availableImages).toEqual([
      'https://ivue.dev/blog/first-post.png',
      'https://ivue.dev/blog/embeds/first-post-embed-1.png',
      'https://ivue.dev/blog/code/first-post-code-1.png',
    ]);
    model.toggleImage('https://ivue.dev/blog/embeds/first-post-embed-1.png');
    expect(model.selectedImages.value).toHaveLength(2);
  });

  it('splitIntoTweets packs paragraphs, numbers segments, closes with the link', () => {
    const model = new XComposeModel.Class();
    const paragraphs = [
      'First paragraph of the article, short and sweet.',
      'Second paragraph carries a bit more weight and detail. '.repeat(6).trim(),
      'Third paragraph closes the argument.',
    ].join('\n\n');
    const segments = model.splitIntoTweets(
      'The title',
      paragraphs,
      'https://ivue.dev/blog/first-post',
    );
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0].text.startsWith('1/' + segments.length)).toBe(true);
    expect(segments[0].text).toContain('The title');
    expect(segments[segments.length - 1].text).toContain(
      'Full article:\nhttps://ivue.dev/blog/first-post',
    );
    for (const segment of segments) {
      expect(model.weightedLengthOf(segment.text)).toBeLessThanOrEqual(280);
    }
  });

  it('markers attach their shots to the segment they land in, marker text vanishes', () => {
    const model = new XComposeModel.Class();
    const body = [
      'Intro paragraph setting the scene with enough words to hold ground.',
      '[code — in the article]',
      'Prose after the first code block. '.repeat(9).trim(),
      '[code — in the article]',
      'A live demo follows the second block.',
      '[live demo — in the article]',
    ].join('\n\n');
    const segments = model.splitIntoTweets('Title', body, 'https://ivue.dev/blog/p', {
      base: ['https://ivue.dev/blog/p.png'],
      code: [
        'https://ivue.dev/blog/code/p-code-1.png',
        'https://ivue.dev/blog/code/p-code-2.png',
      ],
      demo: ['https://ivue.dev/blog/embeds/p-embed-1.png'],
    });
    const allText = segments.map((segment) => segment.text).join(' ');
    expect(allText).not.toContain('[code — in the article]');
    expect(allText).not.toContain('[live demo — in the article]');
    // the banner rides the first segment; the first code shot lands with it
    expect(segments[0].imageUrls).toContain('https://ivue.dev/blog/p.png');
    expect(segments[0].imageUrls).toContain(
      'https://ivue.dev/blog/code/p-code-1.png',
    );
    // the remaining shots land in LATER segments, in order
    const later = segments.slice(1).flatMap((segment) => segment.imageUrls);
    expect(later).toContain('https://ivue.dev/blog/code/p-code-2.png');
    expect(later).toContain('https://ivue.dev/blog/embeds/p-embed-1.png');
  });

  it('a long article caps the thread at 10, ellipsis marks the cut, link closes', () => {
    const model = new XComposeModel.Class();
    const longBody = Array.from(
      { length: 60 },
      (_, index) => `Paragraph ${index + 1}: ` + 'substantial sentence here. '.repeat(6).trim(),
    ).join('\n\n');
    const segments = model.splitIntoTweets(
      'The title',
      longBody,
      'https://ivue.dev/blog/first-post',
    );
    expect(segments).toHaveLength(10);
    expect(segments[8].text.endsWith('…')).toBe(true); // the truncation mark
    expect(segments[9].text).toContain('Full article:');
    expect(segments[0].text.startsWith('1/10 ')).toBe(true);
  });

  it('threadValid requires 2+ segments, all present and within limit', () => {
    const model = new XComposeModel.Class();
    const segment = (text: string) => ({ text, imageUrls: [] });
    model.mode.value = 'thread';
    model.threadSegments.value = [segment('1/2 hello')];
    expect(model.threadValid).toBe(false); // one segment
    model.threadSegments.value = [segment('1/2 hello'), segment('2/2 world')];
    expect(model.threadValid).toBe(true);
    model.threadSegments.value = [segment('1/2 hello'), segment('x'.repeat(300))];
    expect(model.threadValid).toBe(false); // over limit
    model.threadSegments.value = [segment('1/2 hello'), segment('   ')];
    expect(model.threadValid).toBe(false); // empty segment
    model.threadSegments.value = Array.from({ length: 11 }, () => segment('tweet'));
    expect(model.threadValid).toBe(false); // over the 10 cap
  });

  it('fillTemplate substitutes title and url', () => {
    const model = new XComposeModel.Class();
    model.template.value = 'New — {title}\n\n{url}';
    expect(model.fillTemplate(POST)).toBe(
      'New — One kilobyte is a feature\n\nhttps://ivue.dev/blog/first-post',
    );
  });

  it('canSchedule needs text, limit, and a FUTURE time — but no credentials', () => {
    const model = new XComposeModel.Class();
    model.draft.value = 'Hello';
    expect(model.canSchedule).toBe(false); // no time picked
    model.scheduleAt.value = '2099-01-01T09:00';
    expect(model.canSchedule).toBe(true); // credentials NOT required
    model.scheduleAt.value = '2001-01-01T09:00';
    expect(model.canSchedule).toBe(false); // past
    model.scheduleAt.value = '2099-01-01T09:00';
    model.draft.value = 'x'.repeat(300);
    expect(model.canSchedule).toBe(false); // over limit
  });

  it('canPost needs text, limit, and credentials; label narrates', () => {
    const model = new XComposeModel.Class();
    model.draft.value = 'Hello';
    expect(model.canPost).toBe(false); // credentials pending
    expect(model.postButtonLabel).toBe('Credentials pending');
    model.xConfigured.value = true;
    expect(model.canPost).toBe(true);
    expect(model.postButtonLabel).toBe('Post to X');
    model.postArmed.value = true;
    expect(model.postButtonLabel).toBe('Really post to X — click again');
    model.draft.value = '';
    expect(model.canPost).toBe(false);
  });
});
