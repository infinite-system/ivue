// Press-calendar derivations — month cells, done-set persistence,
// venue/article stats — all prototype members, no mount needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PressCalendarModel } from './PressCalendarModel';
import { PRESS_ENTRIES, type PressEntry } from './press-calendar.data';

function makeEntry(overrides: Partial<PressEntry>): PressEntry {
  return {
    id: '2026-09-07--hn',
    date: '2026-09-07',
    venue: 'Hacker News',
    url: 'https://news.ycombinator.com/submit',
    channel: 'hn',
    article: 'introducing-ivue',
    angle: 'Show HN launch',
    effortMin: 30,
    wave: 1,
    lang: 'en',
    ...overrides,
  };
}

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  });
  PRESS_ENTRIES.length = 0;
  PRESS_ENTRIES.push(
    makeEntry({}),
    makeEntry({
      id: '2026-09-08--reddit',
      date: '2026-09-08',
      venue: 'r/vuejs',
      url: 'https://reddit.com/r/vuejs',
      channel: 'reddit',
    }),
    makeEntry({
      id: '2026-10-05--habr',
      date: '2026-10-05',
      venue: 'Habr',
      url: 'https://habr.com',
      channel: 'intl',
      article: 'the-options-api-everyone-wanted',
      lang: 'ru',
    }),
  );
});

describe('month grid', () => {
  it('buckets only the open month, Monday-first with leading blanks', () => {
    const model = new PressCalendarModel.Class();
    model.monthCursor.value = new Date(2026, 8, 1); // September 2026
    // 2026-09-01 is a Tuesday → one leading blank
    expect(model.monthCells[0].day).toBe(0);
    expect(model.monthCells[1].day).toBe(1);
    const withEntries = model.monthCells.filter(
      (cell) => cell.entries.length > 0,
    );
    expect(withEntries.map((cell) => cell.day)).toEqual([7, 8]);
    expect(model.monthTotalCount).toBe(2);
  });

  it('pages only across plan months', () => {
    const model = new PressCalendarModel.Class();
    model.monthCursor.value = new Date(2026, 8, 1);
    expect(model.hasPriorMonth).toBe(false);
    expect(model.hasNextMonth).toBe(true);
    model.nextMonth();
    expect(model.monthLabel).toContain('October');
    expect(model.hasNextMonth).toBe(false);
  });
});

describe('done-set', () => {
  it('toggles, persists, and restores through localStorage', () => {
    const model = new PressCalendarModel.Class();
    model.toggleDone('2026-09-07--hn');
    expect(model.isDone('2026-09-07--hn')).toBe(true);
    expect(model.totalDoneCount).toBe(1);
    const rehydrated = new PressCalendarModel.Class();
    expect(rehydrated.isDone('2026-09-07--hn')).toBe(true);
    rehydrated.toggleDone('2026-09-07--hn');
    expect(rehydrated.totalDoneCount).toBe(0);
  });
});

describe('stats tables', () => {
  it('counts posted per venue with articles and last date', () => {
    const model = new PressCalendarModel.Class();
    model.toggleDone('2026-09-07--hn');
    model.toggleDone('2026-10-05--habr');
    const habr = model.venueStats.find((stat) => stat.venue === 'Habr');
    expect(habr?.posted).toBe(1);
    expect(habr?.articles).toEqual(['the-options-api-everyone-wanted']);
    expect(habr?.lastPosted).toBe('2026-10-05');
    const reddit = model.venueStats.find((stat) => stat.venue === 'r/vuejs');
    expect(reddit?.posted).toBe(0);
    expect(reddit?.planned).toBe(1);
  });

  it('counts posted per article with venues', () => {
    const model = new PressCalendarModel.Class();
    model.toggleDone('2026-09-07--hn');
    const intro = model.articleStats.find(
      (stat) => stat.article === 'introducing-ivue',
    );
    expect(intro?.posted).toBe(1);
    expect(intro?.planned).toBe(2);
    expect(intro?.venues).toEqual(['Hacker News']);
  });
});

describe('filters', () => {
  it('channel, wave, and pending-only narrow the grid', () => {
    const model = new PressCalendarModel.Class();
    model.monthCursor.value = new Date(2026, 8, 1);
    model.channelFilter.value = 'reddit';
    expect(model.monthTotalCount).toBe(1);
    model.channelFilter.value = '';
    model.toggleDone('2026-09-07--hn');
    model.pendingOnly.value = true;
    expect(model.monthTotalCount).toBe(1);
  });
});
