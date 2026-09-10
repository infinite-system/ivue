/*
=== GENERATOR ===
Goal: Prove the scrollbar peek maps a pointer's position on the track to a row of the thread and shows it from the index the chat already holds once the pointer rests there, that a pass across the track opens nothing, that it follows a dragged thumb at once, lingers only long enough to be crossed into, that its search narrows the card to matching previews and holds it open while the reader types, and that picking a row jumps the thread there — never asking for a page.
[Loading lives above the scroller](./ai-chat.invariants.md#loading-lives-above-the-scroller)
// domain-invariant: $Peek — If the pointer is over the track at a fraction of its height, then the card shows the row at that fraction of the thread, from the index, and a picked row jumps the thread there
Impossible if true: a peek that fetches a page

=== GENERATOR-DESCRIBED ===
$Peek reads the chat's rows — every one a stub with its preview and time from the index — and a mini scroller of them opens beside the track at the pointer's row.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { Peek } from './Peek';
import { hosted } from '../virtual-scroller/hosted';

function rows(count: number): Chat.Row[] {
  return Array.from({ length: count }, (_, at) => ({
    id: `m${at}`,
    body: '',
    position: String(at + 1),
    index: at,
    page: Math.floor(at / 200),
    role: at % 2 ? 'assistant' : 'user',
    preview: `message ${at}`,
    calls: at % 3,
    at: Date.UTC(2026, 8, 9, 13, at % 60),
    message: null,
  }));
}

function thread(trackTop: number, trackHeight: number, target: Element | null) {
  const track = { getBoundingClientRect: () => ({ top: trackTop, height: trackHeight }) } as unknown as HTMLElement;
  const element = {
    querySelector: () => track,
    getBoundingClientRect: () => ({ top: 100 }),
  } as unknown as HTMLElement;
  return { element, track, target };
}

function move(peek: Peek.Model, y: number, _target: Element | null, over: 'track' | 'card' | 'none') {
  const thread$ = thread(200, 400, _target);
  const closest = (selector: string) => (over === 'card' && selector.includes('peek') ? thread$.element : null);
  const target = { closest };
  (thread$.track as unknown as { contains: (node: unknown) => boolean }).contains = (node) => over === 'track' && node === target;
  peek.onThreadPointerMove({ currentTarget: thread$.element, target, clientY: y } as unknown as PointerEvent);
}

describe('Peek', () => {
  // domain-invariant: $Peek — If the pointer is over the track at a fraction of its height, then the card shows the row at that fraction of the thread, from the index, and a picked row jumps the thread there
  // impossible-if-true: $Peek — a peek that fetches a page
  // invariant: Loading lives above the scroller (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('maps the track position to a row, follows the thumb, lingers, and a pick jumps the thread', () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const host = hosted(() => new Chat.Class());
    const chat = host.instance;
    chat.rows.value = rows(1001);
    const ensurePage = vi.spyOn(chat, 'ensurePage');
    const jumpTo = vi.spyOn(chat, 'jumpTo').mockImplementation(() => undefined);
    const peek = new Peek.Class({ chat });
    expect(peek.open.value).toBe(false);

    // half way down a 400px track that starts at 200 → the middle row; the card opens once the pointer rests
    move(peek, 400, null, 'track');
    expect(peek.index.value).toBe(500);
    expect(peek.open.value).toBe(false);
    vi.advanceTimersByTime(Peek.$Class.OPEN_DELAY_MS - 1);
    expect(peek.open.value).toBe(false);
    vi.advanceTimersByTime(1);
    expect(peek.open.value).toBe(true);
    expect(peek.positionLabel).toBe('#501 of 1,001');
    expect(peek.percentLabel).toBe('50%');
    expect(peek.row?.preview).toBe('message 500');
    expect(peek.previewText(peek.row as Chat.Row)).toBe('message 500');
    expect(peek.roleMark(peek.row as Chat.Row)).toBe('you');
    expect(peek.rowClass(peek.row as Chat.Row)['ac-role-user']).toBe(true);
    expect(peek.style.top).toBe(`${300 - peek.cardHeight / 2}px`);
    expect(peek.timeLabel(peek.row as Chat.Row)).toMatch(/^\d\d:\d\d$/);
    // past the ends the index clamps
    move(peek, 0, null, 'track');
    expect(peek.index.value).toBe(0);
    move(peek, 5000, null, 'track');
    expect(peek.index.value).toBe(1000);
    // the card is served from the index: no page was asked for
    expect(ensurePage).not.toHaveBeenCalled();

    // off the track the card lingers, then goes; back over it within the linger it stays
    move(peek, 350, null, 'none');
    expect(peek.open.value).toBe(true);
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS - 1);
    move(peek, 350, null, 'card');
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS);
    expect(peek.open.value).toBe(true);
    peek.onThreadPointerLeave();
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS);
    expect(peek.open.value).toBe(false);

    // a pass across the track opens nothing: the pointer left before the delay ran
    move(peek, 350, null, 'track');
    move(peek, 350, null, 'none');
    vi.advanceTimersByTime(Peek.$Class.OPEN_DELAY_MS * 2);
    expect(peek.open.value).toBe(false);

    // a dragged thumb reopens the card wherever the pointer is, at once
    const scroller = { scrollbarDragging: true } as unknown as NonNullable<typeof chat.scroller.value>;
    chat.scroller.value = scroller;
    move(peek, 300, null, 'none');
    expect(peek.open.value).toBe(true);
    expect(peek.index.value).toBe(250);
    chat.scroller.value = null;

    // a search narrows the card to the rows whose preview holds every word, and holds the card open
    move(peek, 400, null, 'track');
    peek.query.value = 'message 99';
    // every preview that holds "99": 99, 199 … 999, and 990 … 998
    expect(peek.rows.value.map((row) => row.index)).toEqual([99, 199, 299, 399, 499, 599, 699, 799, 899, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999]);
    expect(peek.matchLabel).toBe('19 matches');
    expect(peek.isPinned).toBe(true);
    peek.onThreadPointerLeave();
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS * 2);
    expect(peek.open.value).toBe(true);
    peek.onSearchKeydown({ key: 'Escape', preventDefault: () => undefined } as KeyboardEvent);
    expect(peek.query.value).toBe('');
    expect(peek.rows.value).toHaveLength(1001);
    // the pickers narrow by role and by tool calls, and Escape resets them once the box is clear
    peek.setRole('user');
    expect(peek.rows.value.every((row) => row.role === 'user')).toBe(true);
    expect(peek.rows.value).toHaveLength(501);
    peek.setTools('only');
    expect(peek.rows.value.every((row) => row.role === 'user' && row.calls > 0)).toBe(true);
    peek.setTools('exclude');
    expect(peek.rows.value.every((row) => row.calls === 0)).toBe(true);
    expect(peek.isPinned).toBe(true);
    peek.onSearchKeydown({ key: 'Escape', preventDefault: () => undefined } as KeyboardEvent);
    expect(peek.isRole('all')).toBe(true);
    expect(peek.isTools('include')).toBe(true);
    expect(peek.rows.value).toHaveLength(1001);
    peek.onSearchFocus();
    peek.onThreadPointerLeave();
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS * 2);
    expect(peek.open.value).toBe(true);
    peek.onSearchBlur();
    vi.advanceTimersByTime(Peek.$Class.LINGER_MS * 2);
    expect(peek.open.value).toBe(false);
    move(peek, 400, null, 'track');
    vi.advanceTimersByTime(Peek.$Class.OPEN_DELAY_MS);

    // a pick jumps the thread and closes the card
    peek.select(chat.rows.value[42]);
    expect(jumpTo).toHaveBeenCalledWith(42);
    expect(peek.open.value).toBe(false);
    expect(ensurePage).not.toHaveBeenCalled();
    host.unmount();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
