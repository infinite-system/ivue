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
        timezone: 'Europe/Berlin',
        subscribedAt: 100,
        unsubscribedAt: null,
        sendCount: 1,
        lastSentAt: 100,
      },
    ],
    history: [{ email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 }],
    cadenceDays: 2,
    sendHourLocal: 9,
    defaultTimezone: 'America/Toronto',
    timezone: 'Europe/Berlin',
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

  it('tabs: Sent is the default, labels carry counts, openTab routes', () => {
    const model = new SubscriberModel.Class();
    expect(model.activeTab).toBe('sent'); // no query param → default
    expect(model.isTabOpen('sent')).toBe(true);
    expect(model.isTabOpen('upcoming')).toBe(false);
    // labels are bare until the detail loads, then carry counts
    expect(model.tabLabel('sent')).toBe('Sent');
    model.detail.value = makeDetail({});
    expect(model.tabLabel('sent')).toBe('Sent (1)');
    expect(model.tabLabel('upcoming')).toBe('Upcoming (2)');
  });

  it('cadenceLabel narrates days, local hour, and the drip timezone', () => {
    const model = new SubscriberModel.Class();
    model.detail.value = makeDetail({});
    expect(model.cadenceLabel).toBe('every 2 days at 9am — Europe/Berlin');
    model.detail.value = makeDetail({ cadenceDays: 1, sendHourLocal: 18 });
    expect(model.cadenceLabel).toBe('every 1 day at 6pm — Europe/Berlin');
    model.detail.value = makeDetail({ sendHourLocal: 0 });
    expect(model.cadenceLabel).toBe('every 2 days at 12am — Europe/Berlin');
  });
});
