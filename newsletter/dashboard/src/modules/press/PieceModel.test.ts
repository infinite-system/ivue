/*
=== GENERATOR ===
Goal: Prove the piece page edits the argument in one place — drafts autosave as one PATCH after a pause, a base save brings back regenerated expressions, the gutter shows the thread's shape while the base is written — and that expressions are added, replaced and removed as tabs.
// domain-invariant: $PieceModel — If the base changes, then one PATCH goes out after the pause and the fresh piece replaces the tabs
Impossible if true: a keystroke that sends a request
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PieceModel } from './PieceModel';
import { Api } from '../platform/Api';
import type { PressExpression, PressPiece } from '../platform/Api';

function expression(id: number, overrides: Partial<PressExpression> = {}): PressExpression {
  return {
    id,
    pieceId: 1,
    kind: 'x-post',
    mode: 'derived',
    parentId: null,
    position: 0,
    label: '',
    venue: 'X',
    body: 'One.',
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

let piece: PressPiece;
let patches: unknown[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  patches = [];
  piece = {
    id: 1,
    slug: 'introducing-ivue',
    title: 'Launch',
    claim: 'The claim',
    links: [],
    banner: '/blog/introducing-ivue.png',
    base: 'One.\n\n---\n\nTwo.',
    wave: 1,
    notes: '',
    createdAt: 0,
    updatedAt: 0,
    expressions: [expression(10)],
  };
  Api.Class = class extends Api.$Class {
    static override async pressPiece() {
      return piece;
    }
    static override async pressPostings() {
      return [];
    }
    static override async pressPatchPiece(_id: number, changes: unknown) {
      patches.push(changes);
      const base = (changes as { base?: string }).base;
      if (base !== undefined) piece = { ...piece, base, expressions: [expression(10, { body: base.split('\n')[0] })] };
      return piece;
    }
    static override async pressAddExpression(_id: number, input: { kind: string }) {
      return expression(11, { kind: input.kind, mode: 'authored', body: '' });
    }
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PieceModel', () => {
  // domain-invariant: $PieceModel — If the base changes, then one PATCH goes out after the pause and the fresh piece replaces the tabs
  it('autosaves one PATCH after the pause, never per keystroke, and adopts the regenerated piece', async () => {
    const model = new PieceModel.Class();
    Object.defineProperty(model, '$app', { value: { pieceId: 1, reportFailure() {} } as never });
    await model.load();
    expect(model.baseDraft.value).toBe('One.\n\n---\n\nTwo.');
    expect(model.baseGutter.map((entry) => entry.count)).toEqual([4, 4]);
    for (const character of ' more') {
      model.baseDraft.value += character;
      model.onDraftInput();
    }
    expect(model.saveState.value).toBe('dirty');
    expect(patches).toEqual([]);
    await vi.advanceTimersByTimeAsync(PieceModel.Class.AUTOSAVE_MS + 10);
    expect(patches).toEqual([{ base: 'One.\n\n---\n\nTwo. more' }]);
    expect(model.saveState.value).toBe('saved');
    expect(model.saveLabel).toBe('Saved · 1 derived regenerated');
    expect(model.expressions[0].body).toBe('One.');
    // ⌘S saves at once
    model.titleDraft.value = 'Launch!';
    model.onDraftInput();
    model.onKeydown({ metaKey: true, key: 's', preventDefault() {} } as unknown as KeyboardEvent);
    await vi.advanceTimersByTimeAsync(0);
    expect(patches[1]).toEqual({ title: 'Launch!' });
  });

  it('tabs: add selects the new expression, changed replaces in place, archived drops it', async () => {
    const model = new PieceModel.Class();
    Object.defineProperty(model, '$app', { value: { pieceId: 1, reportFailure() {} } as never });
    await model.load();
    expect(model.activeExpression?.id).toBe(10);
    expect(model.tabLabel(model.expressions[0])).toBe('X post');
    expect(model.modeMark(model.expressions[0])).toBe('derived');
    await model.addExpression({ kind: 'linkedin', mode: 'authored' });
    expect(model.expressions.map((entry) => entry.id)).toEqual([10, 11]);
    expect(model.activeExpressionId.value).toBe(11);
    expect(model.tabLabel(model.expressions[1])).toBe('LinkedIn post');
    model.onExpressionChanged(expression(11, { kind: 'linkedin', status: 'approved' }));
    expect(model.expressions[1].status).toBe('approved');
    expect(model.tabTone(model.expressions[1])).toBe('state-approved');
    model.onExpressionArchived(11);
    expect(model.expressions.map((entry) => entry.id)).toEqual([10]);
    expect(model.activeExpressionId.value).toBe(10);
    expect(model.hasExpressions).toBe(true);
    expect(model.slugLabel).toBe('from introducing-ivue');
    expect(model.bannerUrl).toBe('/blog/introducing-ivue.png');
    expect(model.menu[0]).toMatchObject({ kind: 'x-thread', mode: 'derived', modeLabel: 'from the base' });
  });
});
