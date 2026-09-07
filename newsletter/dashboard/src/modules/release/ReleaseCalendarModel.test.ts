// Release-calendar derivations — month cells, done-set persistence,
// venue/article stats, the dialog and its copy — all prototype members,
// no mount needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleaseCalendarModel } from './ReleaseCalendarModel';
import { ReleaseDrafts } from './ReleaseDrafts';
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
    drafts: [],
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

  it('resolves the entry drafts — X keys and bundled markdown — dropping unknown ones', () => {
    PRESS_ENTRIES.push(
      makeEntry({
        id: '2026-09-08--x',
        date: '2026-09-08',
        venue: 'X — launch thread',
        channel: 'x',
        drafts: ['x:thread', 'x:hooks:2', 'docs_v2/blog/x-launch-thread.md', 'nope.md'],
      }),
    );
    const model = new ReleaseCalendarModel.Class();
    model.open('2026-09-08--x');
    expect(model.openDrafts.map((draft) => draft.key)).toEqual([
      'x:thread',
      'x:hooks:2',
      'docs_v2/blog/x-launch-thread.md',
    ]);
    expect(model.hasDraftTabs).toBe(true);
    // the first draft shows until one is picked
    expect(model.activeDraft?.key).toBe('x:thread');
    expect(model.activeDraft?.segments?.length).toBe(9);
    model.showDraft('docs_v2/blog/x-launch-thread.md');
    expect(model.isDraftActive('docs_v2/blog/x-launch-thread.md')).toBe(true);
    // the blog thread splits on its rules and loses its frontmatter + heading
    expect(model.activeDraft?.segments?.[0]).toMatch(/^Every framework bet on classes/);
    expect(model.activeDraft?.body).not.toContain('private: true');
  });

  it('labels the copy button Copied for a moment after a successful copy', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const model = new ReleaseCalendarModel.Class();
    const draft = ReleaseDrafts.Class.resolve('x:single')!;
    expect(model.copyLabel(draft.key)).toBe('Copy');
    await model.copyDraft(draft);
    expect(writeText).toHaveBeenCalledWith(draft.body);
    expect(model.copyLabel(draft.key)).toBe('Copied ✓');
    vi.advanceTimersByTime(ReleaseCalendarModel.Class.COPIED_MS + 1);
    expect(model.copyLabel(draft.key)).toBe('Copy');
    vi.useRealTimers();
  });
});

describe('ReleaseDrafts', () => {
  it('reads a pitch email: frontmatter becomes the title line, the body stays whole', () => {
    const draft = ReleaseDrafts.Class.resolve('tasks/press-drafts/sol/01-javascript-weekly.md')!;
    expect(draft.title).toBe('JavaScript Weekly');
    expect(draft.subtitle).toContain('pitch-email');
    expect(draft.segments).toBeNull();
    expect(draft.body).toMatch(/^To: editor@cooperpress\.com/);
  });

  it('groups X copy: the whole group as segments, one post by index', () => {
    const thread = ReleaseDrafts.Class.resolve('x:thread')!;
    expect(thread.segments).toHaveLength(9);
    expect(thread.body).toContain(thread.segments![8]);
    const hook = ReleaseDrafts.Class.resolve('x:hooks:2')!;
    expect(hook.subtitle).toContain('the agents');
    expect(ReleaseDrafts.Class.resolve('x:nothing')).toBeNull();
    expect(ReleaseDrafts.Class.resolve('x:hooks:9')).toBeNull();
  });
});
