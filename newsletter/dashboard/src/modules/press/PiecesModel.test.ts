/*
=== GENERATOR ===
Goal: Prove the pieces list rolls up expression states into labelled, toned badges, filters through the API, moves by keyboard, and starts a piece blank or from a blog post.
// domain-invariant: $PiecesModel — If a piece has no expressions, then it lists with an empty strip and opens normally
Impossible if true: a piece refused, hidden, or flagged for having no expressions
*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PiecesModel } from './PiecesModel';
import { Api } from '../platform/Api';
import type { PressPieceSummary } from '../platform/Api';

const PIECES: PressPieceSummary[] = [
  {
    id: 1,
    slug: 'introducing-ivue',
    title: 'Launch',
    claim: '',
    links: [],
    banner: null,
    base: '',
    wave: 1,
    notes: '',
    createdAt: 0,
    updatedAt: 0,
    expressions: [
      { id: 10, kind: 'x-thread', mode: 'derived', venue: 'X', status: 'approved', scheduledAt: 1_800_000_000, calendarId: '2026-09-08--x' },
      { id: 11, kind: 'linkedin', mode: 'authored', venue: 'LinkedIn', status: 'draft', scheduledAt: null, calendarId: null },
    ],
    nextDueAt: 1_800_000_000,
    calendarIds: ['2026-09-08--x'],
  },
  { id: 2, slug: null, title: 'Voice', claim: '', links: [], banner: null, base: 'Words.', wave: 2, notes: '', createdAt: 0, updatedAt: 0, expressions: [], nextDueAt: null, calendarIds: [] },
];

let queries: unknown[] = [];
let approved: number[] = [];
let opened: number[] = [];

beforeEach(() => {
  queries = [];
  approved = [];
  opened = [];
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  Api.Class = class extends Api.$Class {
    static override async pressPieces(query: unknown) {
      queries.push(query);
      return PIECES;
    }
    static override async pressAct(id: number) {
      approved.push(id);
      return {} as never;
    }
    static override async pressBlogPosts() {
      return [{ slug: 'a', title: 'A', description: '', date: null, url: '' }];
    }
    static override async pressCreatePiece(input: { fromSlug?: string; title?: string }) {
      return { id: input.fromSlug ? 7 : 8 } as never;
    }
  };
});

function make() {
  const model = new PiecesModel.Class();
  // the router is a memory history in node; opening records the id
  Object.defineProperty(model, '$app', { value: { openPiece: (id: number) => opened.push(id), reportFailure() {} } });
  return model;
}

describe('PiecesModel', () => {
  // domain-invariant: $PiecesModel — If a piece has no expressions, then it lists with an empty strip and opens normally
  it('loads with the filters as the query and labels every state; a piece without expressions is a normal row', async () => {
    const model = make();
    model.search.value = 'launch';
    model.statusFilter.value = 'approved';
    model.waveFilter.value = 1;
    await model.load();
    expect(queries[0]).toEqual({ q: 'launch', status: 'approved', kind: '', wave: 1 });
    expect(model.count).toBe(2);
    const launch = model.rows.value[0];
    expect(model.kindLabel(launch.expressions[0])).toBe('X thread');
    expect(model.stateTone(launch.expressions[0])).toBe('state-approved');
    expect(model.stateTitle(launch.expressions[1])).toBe('LinkedIn post @ LinkedIn — draft');
    expect(model.nextDueLabel(launch)).toMatch(/ET$/);
    expect(model.calendarLabel(launch)).toBe('1 placed');
    const voice = model.rows.value[1];
    expect(model.hasExpressions(voice)).toBe(false);
    expect(model.waveLabel(voice)).toBe('wave 2');
    model.open(voice);
    expect(opened).toEqual([2]);
  });

  it('keyboard: arrows move within bounds, Enter opens, a approves the first draft', async () => {
    const model = make();
    await model.load();
    const key = (key: string) => model.onKeydown({ key, target: { tagName: 'TR' }, preventDefault() {} } as unknown as KeyboardEvent);
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');
    expect(model.focusedIndex.value).toBe(1);
    key('ArrowUp');
    expect(model.isFocused(0)).toBe(true);
    key('a');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(approved).toEqual([11]);
    key('Enter');
    expect(opened).toEqual([1]);
    // typing in an input never moves the focus
    model.onKeydown({ key: 'ArrowDown', target: { tagName: 'INPUT' }, preventDefault() {} } as unknown as KeyboardEvent);
    expect(model.focusedIndex.value).toBe(0);
  });

  it('new piece: blank needs a title, a blog post needs nothing else, and either opens the created piece', async () => {
    const model = make();
    await model.openNewPiece();
    expect(model.blogPostOptions.map((option) => option.value)).toEqual(['', 'a']);
    expect(model.canCreate).toBe(false);
    model.newTitle.value = 'Pitch';
    expect(model.createLabel).toBe('Create piece');
    await model.createPiece();
    expect(opened).toEqual([8]);
    expect(model.newPieceOpen.value).toBe(false);
    model.newFromSlug.value = 'a';
    expect(model.createLabel).toBe('Start from this post');
    await model.createPiece();
    expect(opened).toEqual([8, 7]);
  });
});
