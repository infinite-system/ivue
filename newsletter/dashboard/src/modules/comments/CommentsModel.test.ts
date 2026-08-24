// Moderation-queue derivations — pending/decided split, busy guards,
// labels — all prototype members, no mount needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsModel } from './CommentsModel';
import type { CommentRow } from '../platform/Api';

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ total: 0, rows: [], limit: 50, offset: 0 }),
        ),
    ),
  );
});

function makeRow(overrides: Partial<CommentRow>): CommentRow {
  return {
    id: 1,
    slug: 'first-post',
    name: 'Ada',
    email: 'ada@ivue.dev',
    body: 'Great post.',
    submittedAt: 100,
    status: 'pending',
    parentId: null,
    rootId: 1,
    locked: 0,
    avatarSeed: 'aaaaaaaaaaaaaaaa',
    ...overrides,
  };
}

describe('CommentsModel derivations', () => {
  it('splits rows into the pending queue and the decided history', () => {
    const model = new CommentsModel.Class();
    model.rows.value = [
      makeRow({ id: 1, status: 'pending' }),
      makeRow({ id: 2, status: 'approved' }),
      makeRow({ id: 3, status: 'pending' }),
    ];
    expect(model.pendingRows.map((row) => row.id)).toEqual([1, 3]);
    expect(model.decidedRows.map((row) => row.id)).toEqual([2]);
    expect(model.pendingCount).toBe(2);
  });

  it('busy guard tracks the row being moderated', () => {
    const model = new CommentsModel.Class();
    expect(model.isBusy(7)).toBe(false);
    model.busyId.value = 7;
    expect(model.isBusy(7)).toBe(true);
    expect(model.isBusy(8)).toBe(false);
  });

  it('postUrl and statusLabel narrate rows without template logic', () => {
    const model = new CommentsModel.Class();
    expect(model.postUrl('bulletproof-class-modules')).toBe(
      'https://ivue.dev/blog/bulletproof-class-modules',
    );
    expect(model.statusLabel(makeRow({ status: 'pending' }))).toBe('pending');
    expect(model.statusLabel(makeRow({ status: 'approved' }))).toBe(
      'approved',
    );
  });

  it('pagination math holds at the boundaries', () => {
    const model = new CommentsModel.Class();
    model.total.value = 101;
    expect(model.pageCount).toBe(3);
    expect(model.hasPreviousPage).toBe(false);
    expect(model.hasNextPage).toBe(true);
    model.offset.value = 100;
    expect(model.pageIndex).toBe(3);
    expect(model.hasNextPage).toBe(false);
  });
});
