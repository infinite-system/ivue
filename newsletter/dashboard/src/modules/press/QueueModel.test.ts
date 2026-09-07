/*
=== GENERATOR ===
Goal: Prove the queue shows pending jobs with their expression, surfaces due expressions for manual posting with their live text, and cancels through the expression when there is one.
// domain-invariant: $QueueModel — If a job has an expression, then cancel goes through the expression so its status returns to approved
Impossible if true: a due expression shown without the text to copy
*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueModel } from './QueueModel';
import { Api } from '../platform/Api';

function expression(overrides: Partial<Api.PressExpression> = {}): Api.PressExpression {
  return {
    id: 5,
    pieceId: 1,
    kind: 'linkedin',
    mode: 'authored',
    parentId: null,
    position: 0,
    label: '',
    venue: 'LinkedIn',
    body: 'text',
    meta: {},
    mirrors: [],
    status: 'due',
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

let acts: [number, string][] = [];
let cancelled: number[] = [];

beforeEach(() => {
  acts = [];
  cancelled = [];
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  const queue: Api.PressQueue = {
    upcoming: [
      { id: 1, kind: 'expression', payload: { expressionId: '5', platform: 'linkedin' }, dueAt: 1_800_000_000, createdAt: 0, executedAt: null, result: null, expression: expression({ status: 'scheduled' }) },
      { id: 2, kind: 'tweet', payload: { text: 'plain tweet' }, dueAt: 1_800_000_100, createdAt: 0, executedAt: null, result: null, expression: null },
    ],
    recent: [{ id: 3, kind: 'expression', payload: {}, dueAt: 1, createdAt: 0, executedAt: 2, result: { ok: true, detail: 'posted to X: t1' } }],
    due: [{ ...expression({ kind: 'x-thread', children: [expression({ id: 6, body: 'a' }), expression({ id: 7, body: 'b', skipped: true })] }), pieceTitle: 'Launch' }],
  };
  Api.Class = class extends Api.$Class {
    static override async pressQueue() {
      return queue;
    }
    static override async pressAct(id: number, action: string) {
      acts.push([id, action]);
      return expression();
    }
    static override async scheduleCancel(id: number) {
      cancelled.push(id);
      return { ok: true };
    }
  };
});

describe('QueueModel', () => {
  // domain-invariant: $QueueModel — If a job has an expression, then cancel goes through the expression so its status returns to approved
  it('labels jobs by their expression, shows due text without skipped segments, cancels through the right door', async () => {
    const model = new QueueModel.Class();
    Object.defineProperty(model, '$app', { value: { reportFailure() {}, openPiece() {} } as never });
    await model.load();
    expect(model.jobLabel(model.upcoming[0])).toBe('LinkedIn post @ LinkedIn');
    expect(model.jobLabel(model.upcoming[1])).toContain('tweet plain tweet');
    expect(model.jobText(model.upcoming[0])).toBe('text');
    expect(model.dueLabel(1_800_000_000)).toMatch(/ET/);
    expect(model.textOf(model.due[0])).toBe('a');
    expect(model.resultLabel(model.recent[0])).toBe('posted to X: t1');
    await model.cancel(model.upcoming[0]);
    expect(acts).toEqual([[5, 'cancel']]);
    await model.cancel(model.upcoming[1]);
    expect(cancelled).toEqual([2]);
    expect(model.isEmpty).toBe(false);
  });
});
