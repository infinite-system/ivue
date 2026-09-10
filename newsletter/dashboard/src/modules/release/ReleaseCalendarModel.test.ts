// Release-calendar derivations — month cells, done-set persistence,
// venue/article stats, the dialog and its copy — all prototype members,
// no mount needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleaseCalendarModel } from './ReleaseCalendarModel';
import { Api } from '../platform/Api';
import { PRESS_ENTRIES, type PressEntry } from './release-calendar.data';

function makeEntry(overrides: Partial<PressEntry>): PressEntry {
  return {
    id: '2026-09-07--hn',
    date: '2026-09-07',
    venue: 'Hacker News',
    url: 'https://news.ycombinator.com/submit',
    channel: 'hn',
    article: 'introducing-ivue',
    angle: 'Show HN launch',
    copy: [],
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
    const model = new ReleaseCalendarModel.Class();
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
    const model = new ReleaseCalendarModel.Class();
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
    const model = new ReleaseCalendarModel.Class();
    model.toggleDone('2026-09-07--hn');
    expect(model.isDone('2026-09-07--hn')).toBe(true);
    expect(model.totalDoneCount).toBe(1);
    const rehydrated = new ReleaseCalendarModel.Class();
    expect(rehydrated.isDone('2026-09-07--hn')).toBe(true);
    rehydrated.toggleDone('2026-09-07--hn');
    expect(rehydrated.totalDoneCount).toBe(0);
  });
});

describe('stats tables', () => {
  it('counts posted per venue with articles and last date', () => {
    const model = new ReleaseCalendarModel.Class();
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
    const model = new ReleaseCalendarModel.Class();
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
    const model = new ReleaseCalendarModel.Class();
    model.monthCursor.value = new Date(2026, 8, 1);
    model.channelFilter.value = 'reddit';
    expect(model.monthTotalCount).toBe(1);
    model.channelFilter.value = '';
    model.toggleDone('2026-09-07--hn');
    model.pendingOnly.value = true;
    expect(model.monthTotalCount).toBe(1);
  });
});

describe('the entry dialog', () => {
  it('opens one entry and closes on Escape', () => {
    const model = new ReleaseCalendarModel.Class();
    expect(model.isDialogOpen).toBe(false);
    model.open('2026-09-08--reddit');
    expect(model.openEntry?.venue).toBe('r/vuejs');
    expect(model.isOpen('2026-09-08--reddit')).toBe(true);
    model.onDialogKeydown({ key: 'Escape' } as KeyboardEvent);
    expect(model.isDialogOpen).toBe(false);
  });

  it('reads the copy behind an entry from the press by source key, deduped, thread segments live only', async () => {
    const thread: Api.PressExpression = {
      id: 40, pieceId: 7, kind: 'x-thread', mode: 'authored', parentId: null, position: 0, label: '', venue: 'X', body: '',
      meta: {}, mirrors: [], status: 'approved', skipped: false, calendarId: null, approvedAt: 1, scheduledAt: null, sentAt: null,
      sentUrl: null, createdAt: 0, updatedAt: 0,
      children: [
        { id: 41, pieceId: 7, kind: 'x-segment', mode: 'authored', parentId: 40, position: 0, label: '', venue: '', body: 'One', meta: {}, mirrors: [], status: 'draft', skipped: false, calendarId: null, approvedAt: null, scheduledAt: null, sentAt: null, sentUrl: null, createdAt: 0, updatedAt: 0, children: null },
        { id: 42, pieceId: 7, kind: 'x-segment', mode: 'authored', parentId: 40, position: 1, label: '', venue: '', body: 'Two', meta: {}, mirrors: [], status: 'draft', skipped: true, calendarId: null, approvedAt: null, scheduledAt: null, sentAt: null, sentUrl: null, createdAt: 0, updatedAt: 0, children: null },
      ],
    };
    const acts: [number, string, unknown][] = [];
    Api.Class = class extends Api.$Class {
      static override async pressExpressionsForSource(key: string) {
        return key === 'nope.md' ? [] : [thread];
      }
      static override async pressAct(id: number, action: string, body: unknown) {
        acts.push([id, action, body]);
        return { ...thread, status: action === 'sent' ? 'sent' : 'scheduled' } as Api.PressExpression;
      }
    };
    PRESS_ENTRIES.push(makeEntry({ id: '2026-09-08--x', date: '2026-09-08', venue: 'X — launch thread', channel: 'x', copy: ['x:thread', 'docs_v2/blog/x-launch-thread.md', 'nope.md'] }));
    const model = new ReleaseCalendarModel.Class();
    Object.defineProperty(model, '$app', { value: { reportFailure() {}, openPiece() {} } });
    model.open('2026-09-08--x');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(model.openExpressions.value.map((row) => row.id)).toEqual([40]);
    expect(model.hasCopyTabs).toBe(false);
    expect(model.expressionTitle(model.activeExpression!)).toBe('X thread');
    expect(model.activeSegments?.map((child) => child.body)).toEqual(['One']);
    expect(model.activeBody).toBe('One');
    // one placement, one expression: schedule for the day, and mark posted writes the ledger
    expect(model.canScheduleHere).toBe(true);
    await model.scheduleHere();
    expect(acts[0][1]).toBe('schedule');
    await model.toggleOpenDone();
    expect(acts[1]).toEqual([40, 'sent', { venue: 'X — launch thread', calendarId: '2026-09-08--x' }]);
    expect(model.isDone('2026-09-08--x')).toBe(true);
    Api.Class = Api.$Class;
  });

  it('labels the copy button Copied for a moment after a successful copy', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const model = new ReleaseCalendarModel.Class();
    expect(model.copyLabel('all')).toBe('Copy');
    await model.copyText('all', 'the text');
    expect(writeText).toHaveBeenCalledWith('the text');
    expect(model.copyLabel('all')).toBe('Copied ✓');
    vi.advanceTimersByTime(ReleaseCalendarModel.Class.COPIED_MS + 1);
    expect(model.copyLabel('all')).toBe('Copy');
    vi.useRealTimers();
  });
});
