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
  description: '',
  url: 'https://ivue.dev/blog/first-post',
  date: null,
  timestamp: 1,
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
