// The subscriber modal's derivations — pipeline state, suppression,
// cadence narration — all prototype members, testable without a mount.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriberModel } from './SubscriberModel';
import type { SubscriberDetail } from '../platform/Api';

// The model reacts to the route's ?subscriber= query through the app
// store; with no query set it stays closed and loads nothing, so the
// derivations under test are driven by writing `detail` directly.
beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]')),
  );
});

function makeDetail(overrides: Partial<SubscriberDetail>): SubscriberDetail {
  return {
    email: 'ada@ivue.dev',
    memberships: [
      {
        email: 'ada@ivue.dev',
        list: 'newsletter',
        name: 'Ada',
        subscribedAt: 100,
        unsubscribedAt: null,
        sendCount: 1,
        lastSentAt: 100,
      },
    ],
    history: [{ email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 }],
    cadenceHours: 48,
    upcoming: [
      { slug: 'second-post', title: 'Second', projectedAt: 200 },
      { slug: 'third-post', title: 'Third', projectedAt: 300 },
    ],
    ...overrides,
  };
}

describe('SubscriberModel derivations', () => {
  it('stays closed with no route email; open follows the query', () => {
    const model = new SubscriberModel.Class();
    expect(model.isOpen).toBe(false);
    expect(model.upcoming).toEqual([]);
    expect(model.nextUp).toBe(null);
  });

  it('displayName finds the first named membership', () => {
    const model = new SubscriberModel.Class();
    model.detail.value = makeDetail({});
    expect(model.displayName).toBe('Ada');
    model.detail.value = makeDetail({
      memberships: [
        { ...makeDetail({}).memberships[0], name: '' },
      ],
    });
    expect(model.displayName).toBe('');
  });

  it('suppression is address-wide: any unsubscribed membership pauses the pipeline', () => {
    const model = new SubscriberModel.Class();
    model.detail.value = makeDetail({});
    expect(model.isSuppressed).toBe(false);
    model.detail.value = makeDetail({
      memberships: [
        { ...makeDetail({}).memberships[0], unsubscribedAt: 500 },
      ],
    });
    expect(model.isSuppressed).toBe(true);
  });

  it('nextUp is the head of the pipeline; caught-up needs a loaded empty pipeline', () => {
    const model = new SubscriberModel.Class();
    expect(model.isFullyCaughtUp).toBe(false); // nothing loaded yet
    model.detail.value = makeDetail({});
    expect(model.nextUp?.slug).toBe('second-post');
    expect(model.isFullyCaughtUp).toBe(false);
    model.detail.value = makeDetail({ upcoming: [] });
    expect(model.nextUp).toBe(null);
    expect(model.isFullyCaughtUp).toBe(true);
  });

  it('cadenceLabel narrates days when whole, hours otherwise', () => {
    const model = new SubscriberModel.Class();
    model.detail.value = makeDetail({ cadenceHours: 24 });
    expect(model.cadenceLabel).toBe('every 1 day');
    model.detail.value = makeDetail({ cadenceHours: 48 });
    expect(model.cadenceLabel).toBe('every 2 days');
    model.detail.value = makeDetail({ cadenceHours: 36 });
    expect(model.cadenceLabel).toBe('every 36 hours');
  });
});
