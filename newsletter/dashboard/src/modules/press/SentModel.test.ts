/*
=== GENERATOR ===
Goal: Prove the Sent tab is the posting ledger, newest first, filterable by piece, platform, venue and URL, each row saying who posted it.
// domain-invariant: $SentModel — If a filter matches any of piece, platform, venue, url or kind, then the row stays
Impossible if true: a ledger row hidden by a filter it matches
*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SentModel } from './SentModel';
import { Api } from '../platform/Api';
import type { PressPosting } from '../platform/Api';

const ROWS: PressPosting[] = [
  { id: 2, expressionId: 5, platform: 'x', venue: 'X', url: 'https://x.com/i/status/2', remoteIds: ['t1', 't2'], postedAt: 200, postedBy: 'api', calendarId: '2026-09-08--x', kind: 'x-thread', pieceId: 1, pieceTitle: 'Launch' },
  { id: 1, expressionId: 6, platform: 'reddit', venue: 'r/vuejs', url: null, remoteIds: [], postedAt: 100, postedBy: 'manual', calendarId: null, kind: 'reddit', pieceId: 1, pieceTitle: 'Launch' },
];

beforeEach(() => {
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  Api.Class = class extends Api.$Class {
    static override async pressPostings() {
      return ROWS;
    }
  };
});

describe('SentModel', () => {
  // domain-invariant: $SentModel — If a filter matches any of piece, platform, venue, url or kind, then the row stays
  it('loads the ledger and filters across every column', async () => {
    const model = new SentModel.Class();
    Object.defineProperty(model, '$app', { value: { reportFailure() {}, openPiece() {} } as never });
    await model.load();
    expect(model.filtered).toHaveLength(2);
    model.filter.value = 'r/vue';
    expect(model.filtered.map((row) => row.id)).toEqual([1]);
    model.filter.value = 'status/2';
    expect(model.filtered.map((row) => row.id)).toEqual([2]);
    model.filter.value = 'launch';
    expect(model.filtered).toHaveLength(2);
    expect(model.byLabel(ROWS[0])).toBe('the Worker');
    expect(model.byLabel(ROWS[1])).toBe('by hand');
    expect(model.remoteLabel(ROWS[0])).toBe('t1, t2');
    expect(model.remoteLabel(ROWS[1])).toBe('—');
    expect(model.kindLabel(ROWS[0])).toBe('X thread');
    expect(model.platformLabel(ROWS[1])).toBe('Reddit');
    expect(model.whenLabel(ROWS[0])).toMatch(/ET$/);
    model.filter.value = 'nothing';
    expect(model.isEmpty).toBe(true);
  });
});
