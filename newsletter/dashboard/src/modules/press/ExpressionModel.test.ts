/*
=== GENERATOR ===
Goal: Prove the card is the editor — typed text counts X-weighted, saves after a pause as one PATCH, skipped segments lose their number and leave the copy, the fold splits where X folds, and every footer verb replaces the record through the API.
// domain-invariant: $ExpressionModel — If a segment is skipped, then the live thread renumbers around it and Copy omits it
// domain-invariant: $ExpressionModel — If the text is derived, then the card cannot edit it
Impossible if true: a card shows text the platform would not accept without saying so
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpressionModel } from './ExpressionModel';
import { Api } from '../platform/Api';
import type { PressExpression, PressPieceRecord } from '../platform/Api';

const PIECE: PressPieceRecord = {
  id: 1,
  slug: 'introducing-ivue',
  title: 'Launch',
  claim: '',
  links: [{ label: 'post', url: 'https://ivue.dev/blog/introducing-ivue' }],
  banner: '/blog/introducing-ivue.png',
  base: '',
  wave: 1,
  notes: '',
  createdAt: 0,
  updatedAt: 0,
};

function row(id: number, overrides: Partial<PressExpression> = {}): PressExpression {
  return {
    id,
    pieceId: 1,
    kind: 'x-segment',
    mode: 'authored',
    parentId: 100,
    position: id,
    label: '',
    venue: '',
    body: `Tweet ${id}`,
    meta: {},
    mirrors: [],
    status: 'draft',
    skipped: false,
    calendarId: null,
    approvedAt: null,
    scheduledAt: null,
    sentAt: null,
    sentUrl: null,
    createdAt: 0,
    updatedAt: 0,
    children: null,
    ...overrides,
  };
}

function thread(overrides: Partial<PressExpression> = {}): PressExpression {
  return row(100, {
    kind: 'x-thread',
    parentId: null,
    venue: 'X',
    mirrors: [{ platform: 'bluesky', sentAt: null, url: null }],
    calendarId: '2026-09-08--x-launch-thread',
    children: [row(1), row(2, { skipped: true }), row(3)],
    ...overrides,
  });
}

let calls: { id: number; action?: string; changes?: unknown; body?: unknown }[] = [];
let changed: PressExpression[] = [];
let removed: number[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => undefined) } });
  calls = [];
  changed = [];
  removed = [];
  Api.Class = class extends Api.$Class {
    static override async pressPatchExpression(id: number, changes: unknown) {
      calls.push({ id, changes });
      return thread();
    }
    static override async pressAct(id: number, action: string, body?: unknown) {
      calls.push({ id, action, body });
      if (action === 'approve') return thread({ status: 'approved' });
      if (action === 'schedule') return thread({ status: 'scheduled', scheduledAt: (body as { dueAt: number }).dueAt });
      return thread();
    }
    static override async pressReorder(id: number, order: number[]) {
      calls.push({ id, action: 'reorder', body: order });
      return thread();
    }
    static override async pressLint() {
      return { problems: ['segment 1: 281 characters, the limit is 280'] };
    }
  };
});

afterEach(() => {
  vi.useRealTimers();
});

function make(expression = thread()) {
  const model = new ExpressionModel.Class({ expression, piece: PIECE }, ((event: string, payload: never) => {
    if (event === 'changed') changed.push(payload);
    else removed.push(payload);
  }) as ExpressionModel.Emits);
  Object.defineProperty(model, '$app', { value: { reportFailure() {} } as never });
  return model;
}

describe('ExpressionModel', () => {
  // domain-invariant: $ExpressionModel — If a segment is skipped, then the live thread renumbers around it and Copy omits it
  it('numbers the live segments around a skipped one, and copies only the live text', () => {
    const model = make();
    expect(model.numbered.map((entry) => entry.number)).toEqual([1, null, 2]);
    expect(model.liveCount).toBe(2);
    expect(model.copyText).toBe('Tweet 1\n\nTweet 3');
    expect(model.mirrors[0]).toMatchObject({ label: 'Bluesky', limit: 300, over: false, sentLabel: 'not sent' });
    expect(model.limit).toBe(280);
    expect(model.kindLabel).toBe('X thread');
    expect(model.frame).toBe('x-thread');
  });

  it('typed text counts X-weighted and saves once after the pause; a URL is 23', async () => {
    const model = make();
    const child = model.children[0];
    const type = (text: string) => model.onSegmentInput(child, { target: { innerText: text } } as unknown as Event);
    type('see https://ivue.dev/blog/a-long-slug-that-goes-on-and-on');
    expect(model.segmentCount(child)).toBe(4 + 23);
    type('x'.repeat(281));
    expect(model.segmentOver(child)).toBe(true);
    expect(model.segmentCountLabel(child)).toBe('281 / 280');
    expect(model.saveState.value).toBe('dirty');
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(ExpressionModel.Class.AUTOSAVE_MS + 10);
    expect(calls).toEqual([{ id: 1, changes: { body: 'x'.repeat(281) } }]);
    expect(model.saveState.value).toBe('saved');
    expect(changed).toHaveLength(1);
  });

  // domain-invariant: $ExpressionModel — If the text is derived, then the card cannot edit it
  it('a derived card cannot edit; approve saves first, then reports the lint on failure', async () => {
    const derived = make(thread({ mode: 'derived' }));
    expect(derived.canEdit).toBe(false);
    expect(derived.canDetach).toBe(true);
    expect(derived.modeLabel).toBe('derived from the base');
    const model = make();
    expect(model.canApprove).toBe(true);
    await model.approve();
    expect(calls.map((call) => call.action)).toEqual(['approve']);
    expect(changed[0].status).toBe('approved');
    Api.Class = class extends Api.Class {
      static override async pressAct(): Promise<never> {
        throw new Error('281 characters');
      }
    };
    await model.approve();
    expect(model.lintProblems.value).toEqual(['segment 1: 281 characters, the limit is 280']);
  });

  it('skip, reorder by drop, schedule at the calendar day, mark sent, clone, archive all go through the API', async () => {
    const model = make();
    await model.setSkipped(model.children[2], true);
    expect(calls[0]).toEqual({ id: 3, changes: { skipped: true } });
    model.onDragStart(model.children[2]);
    expect(model.isDragging(model.children[2])).toBe(true);
    await model.onDrop(model.children[0]);
    expect(calls[1]).toEqual({ id: 100, action: 'reorder', body: [3, 1, 2] });
    expect(model.defaultScheduleAt()).toBe('2026-09-08T09:00');
    model.openSchedule();
    expect(model.scheduleAt.value).toBe('2026-09-08T09:00');
    expect(model.scheduleEasternPreview).toMatch(/ET$/);
    await model.schedule();
    expect(calls[2].action).toBe('schedule');
    expect(typeof (calls[2].body as { dueAt: number }).dueAt).toBe('number');
    model.openSent('bluesky');
    expect(model.sentPlatform.value).toBe('bluesky');
    model.sentUrl.value = 'https://bsky.app/1';
    await model.markSent();
    expect(calls[3]).toMatchObject({ action: 'sent', body: { platform: 'bluesky', url: 'https://bsky.app/1', venue: 'X' } });
    await model.clone('linkedin');
    expect(calls[4]).toMatchObject({ action: 'clone', body: { kind: 'linkedin' } });
    await model.archive();
    expect(removed).toEqual([100]);
    await model.copyAll();
    expect(model.copyLabel('all')).toBe('Copied ✓');
    await vi.advanceTimersByTimeAsync(ExpressionModel.Class.COPIED_MS + 1);
    expect(model.copyLabel('all')).toBe('Copy');
  });

  it('a single post folds where X folds, with a URL weighted 23', () => {
    const post = make(row(5, { kind: 'x-long', parentId: null, body: 'a'.repeat(270) + ' https://ivue.dev/blog/introducing-ivue tail' }));
    expect(post.frame).toBe('x-post');
    expect(post.beforeFold).toBe('a'.repeat(270) + ' https://ivue.dev/blog/introducing-ivue');
    expect(post.afterFold).toBe(' tail');
    const short = make(row(6, { kind: 'x-post', parentId: null, body: 'short' }));
    expect(short.afterFold).toBe('');
    expect(short.countLabel).toBe('5 / 280');
    const email = make(row(7, { kind: 'email', parentId: null, body: 'Hi', meta: { subject: 'S', to: 'e@x' } }));
    expect(email.copyText).toBe('S\n\nHi');
    expect(email.emailTo).toBe('e@x');
    const reddit = make(row(8, { kind: 'reddit', parentId: null, venue: 'r/vuejs', body: '# H\n\ntext' }));
    expect(reddit.subreddit).toBe('r/vuejs');
    expect(reddit.renderedBody).toContain('<h1>H</h1>');
    expect(reddit.canonical).toBe('https://ivue.dev/blog/introducing-ivue');
  });
});
