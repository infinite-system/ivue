/*
=== GENERATOR ===
Goal: Prove the thread loads as stubs from one small index and fills a page only when a window reaches it, never twice; that a page landing replaces stubs in place so identity holds; that a sent message appends and its reply streams into one row that the chat announces by revision, with tool calls resolving in place and contracting to a batch when done; that the bottom is pinned only while the reader is there; that expansion state lives on the chat by id; and that export gathers the selected messages in thread order after loading their pages.
[Loading lives above the scroller](./ai-chat.invariants.md#loading-lives-above-the-scroller)
[The reader owns the scroll](./ai-chat.invariants.md#the-reader-owns-the-scroll)
// domain-invariant: $Chat — If a window reaches a page, then that page is fetched once and its messages replace their stubs by index
// domain-invariant: $Chat — If the reader is not at the bottom, then a streaming reply never moves the viewport
// domain-invariant: $Chat — If a reply finishes, then its runs of calls contract to batches like any loaded turn
Impossible if true: a page is requested that no window needs
Impossible if true: the scroller learns that a row is unloaded

=== GENERATOR-DESCRIBED ===
$Chat is the thread: stubs from the index, pages on demand, replies replayed into one row, the pin held only at the bottom, expansion by id, export in thread order.
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { ChatApi } from './ChatApi';
import type { SessionLog } from './SessionLog';
import { hosted } from '../virtual-scroller/hosted';

const PAGE_SIZE = 3;
const message = (id: string, role: SessionLog.Role, text: string, extra: Partial<SessionLog.Message> = {}): SessionLog.Message => ({ id, index: 0, role, timestamp: 1_000 + Number(id.replace(/\D/g, '')), parts: [{ kind: 'text', text }], sidechain: false, ...extra });
const call = (id: string, name: string): SessionLog.ToolCall => ({ id, name, input: { command: 'ls' }, state: 'done', result: { text: 'ok', images: [], isError: false, structured: null }, durationMs: 100, startedAt: 0, children: null });

const THREAD: SessionLog.Message[] = [
  message('m0', 'user', 'first question'),
  message('m1', 'assistant', 'first answer about scrollers'),
  message('m2', 'user', 'second'),
  message('m3', 'assistant', 'answer with calls', { parts: [{ kind: 'text', text: 'answer with calls' }, { kind: 'tool_batch', calls: [call('c1', 'Bash'), call('c2', 'Read')], messageIds: ['m3'] }] }),
  message('m4', 'user', 'third'),
  message('m5', 'assistant', 'last answer'),
];
const META: ChatApi.Meta = { count: THREAD.length, pageSize: PAGE_SIZE, pages: [{ index: 0, bytes: 1, messages: 3, firstId: 'm0' }, { index: 1, bytes: 1, messages: 3, firstId: 'm3' }], totalBytes: 2, indexBytes: 1, firstAt: 0, lastAt: 0, roles: {}, models: {}, tools: {}, calls: 2, subagents: 0, source: { file: 'x.jsonl', lines: 9 } };
const INDEX: ChatApi.IndexRow[] = THREAD.map((entry) => ({ id: entry.id, r: entry.role[0], t: (entry.parts[0] as SessionLog.TextPart).text, c: entry.parts.some((part) => part.kind === 'tool_batch') ? 2 : 0, at: entry.timestamp }));

let served: string[] = [];

function serve() {
  served = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const name = String(url).split('/').pop() ?? '';
    served.push(name);
    if (name === 'meta.json') return new Response(JSON.stringify(META));
    if (name === 'index.json') return new Response(JSON.stringify(INDEX));
    const page = /page-(\d+)\.json/.exec(name);
    if (page) return new Response(JSON.stringify(THREAD.slice(Number(page[1]) * PAGE_SIZE, Number(page[1]) * PAGE_SIZE + PAGE_SIZE)));
    return new Response('nope', { status: 404 });
  });
}

/** a scroller double: the window the chat watches, and the seeks it asks for */
function fakeScroller() {
  return {
    visibleIndex: { start: 0, end: 0 },
    visibleItems: [] as unknown[],
    scrollPosition: 0,
    scrollExtent: 1000,
    containerOuterSize: 400,
    estimatedItemSize: 80,
    seeks: [] as { index: number; animate: boolean }[],
    cancelled: 0,
    cancelSeek() {
      this.cancelled++;
    },
    scrollToIndex(index: number, _after?: () => void, animate = true) {
      this.seeks.push({ index, animate });
    },
  };
}

/** let the mocked requests (each a macrotask) and the ticks between them run */
async function settle(times = 6) {
  for (let count = 0; count < times; count++) await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Chat', () => {
  beforeEach(() => {
    ChatApi.Class.configure({ baseUrl: '/sample/', simulateLatency: false, requestCount: 0, seed: 7 });
    serve();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // domain-invariant: $Chat — If a window reaches a page, then that page is fetched once and its messages replace their stubs by index
  // impossible-if-true: $Chat — a page is requested that no window needs
  // impossible-if-true: $Chat — the scroller learns that a row is unloaded
  // invariant: Loading lives above the scroller (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('loads the index as stubs, then only the pages the window reaches, once each, in place', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const scroller = fakeScroller();
    chat.scroller.value = scroller as never;
    await settle(10);
    expect(served).toEqual(['meta.json', 'index.json']);
    expect(chat.count).toBe(6);
    expect(chat.rows.value.every((row) => row.message === null)).toBe(true);
    expect(chat.rows.value[3]).toMatchObject({ id: 'm3', role: 'assistant', page: 1, preview: 'answer with calls' });
    expect(chat.isLoadingThread).toBe(false);
    expect(scroller.seeks.at(-1)).toEqual({ index: 5, animate: false });

    // the window reaches rows 4..6 → page 1, plus one page of margin (page 0)
    scroller.visibleIndex = { start: 4, end: 6 };
    chat.onWindow({ start: 4, end: 6 });
    await settle(10);
    expect(served.slice(2).sort()).toEqual(['page-000.json', 'page-001.json']);
    expect(chat.rows.value[5].message?.parts).toEqual([{ kind: 'text', text: 'last answer' }]);
    expect(chat.rows.value[5].id).toBe('m5');
    expect(chat.loadedCount).toBe(6);
    expect(chat.loadedPages.value.size).toBe(2);
    expect(chat.bytesFetched.value).toBeGreaterThan(0);
    expect(chat.requests.value).toHaveLength(4);

    // the same window again asks for nothing
    chat.onWindow({ start: 4, end: 6 });
    await settle(4);
    expect(served).toHaveLength(4);
    expect(chat.rowText(chat.rows.value[3])).toBe('answer with calls\n2 tool calls: Bash, Read');
    expect(chat.rowText({ ...chat.rows.value[0], message: null })).toBe('');
    expect(chat.pagesLabel).toBe('2 / 2');
    expect(chat.loadedLabel).toBe('6 / 6');
    unmount();
  });

  it('a load error is reported, not thrown', async () => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 500 }));
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    await settle(10);
    expect(chat.error.value).toBe('meta.json: HTTP 500');
    expect(chat.hasError).toBe(true);
    expect(chat.count).toBe(0);
    expect(chat.clock.isTicking).toBe(false);
    unmount();
  });

  // domain-invariant: $Chat — If the reader is not at the bottom, then a streaming reply never moves the viewport
  // domain-invariant: $Chat — If a reply finishes, then its runs of calls contract to batches like any loaded turn
  // invariant: The reader owns the scroll (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('sending appends the message, replays a reply into one row, pins only at the bottom, and contracts calls when done', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const scroller = fakeScroller();
    chat.scroller.value = scroller as never;
    await settle(10);
    chat.onWindow({ start: 3, end: 6 });
    await settle(10);
    expect(chat.loadedCount).toBe(6);

    // a scripted stream: the events a reply is made of
    const source = THREAD[3];
    vi.spyOn(ChatApi.Class, 'stream').mockImplementation(async function* () {
      yield { type: 'thinking_start', text: '' } as ChatApi.StreamEvent;
      yield { type: 'thinking_token', text: 'hmm' } as ChatApi.StreamEvent;
      yield { type: 'thinking_end', text: '' } as ChatApi.StreamEvent;
      yield { type: 'token', text: 'Sure, ' } as ChatApi.StreamEvent;
      yield { type: 'token', text: 'here.' } as ChatApi.StreamEvent;
      yield { type: 'tool_call', call: call('r1', 'Bash') } as ChatApi.StreamEvent;
      yield { type: 'tool_result', call: call('r1', 'Bash') } as ChatApi.StreamEvent;
      yield { type: 'tool_call', call: call('r2', 'Read') } as ChatApi.StreamEvent;
      yield { type: 'tool_result', call: { ...call('r2', 'Read'), state: 'failed' } } as ChatApi.StreamEvent;
      yield { type: 'done', text: '' } as ChatApi.StreamEvent;
    });
    vi.spyOn(chat, 'pickSource').mockResolvedValue(source);

    // the reader has scrolled up: the reply must not move the viewport
    chat.atBottom.value = false;
    scroller.seeks = [];
    const revisionBefore = chat.revision.value;
    await chat.send({ text: 'show me scrollers', model: 'quick', attachments: [] });
    expect(chat.count).toBe(8);
    const user = chat.rows.value[6];
    const reply = chat.rows.value[7];
    expect(user.role).toBe('user');
    expect(user.message?.parts).toEqual([{ kind: 'text', text: 'show me scrollers' }]);
    expect(reply.message?.replay).toBe(true);
    expect(reply.message?.model).toBe('Quick');
    expect(reply.message?.parts.map((part) => part.kind)).toEqual(['thinking', 'text', 'tool_batch']);
    const batch = reply.message?.parts[2];
    if (batch?.kind !== 'tool_batch') throw new Error('expected a batch');
    expect(batch.calls.map((entry) => entry.state)).toEqual(['done', 'failed']);
    expect(batch.calls[0].durationMs).not.toBeNull();
    expect(reply.message?.usage?.output_tokens).toBe(3);
    expect(reply.message?.durationMs).toBeGreaterThanOrEqual(0);
    expect(chat.tokensStreamed.value).toBe(2);
    expect(chat.revision.value).toBeGreaterThan(revisionBefore);
    expect(chat.isStreaming).toBe(false);
    expect(chat.clock.isTicking).toBe(false);
    expect(chat.indexRows.value.at(-1)).toMatchObject({ id: reply.id, r: 'a', c: 2 });

    // the pin: nothing while the reader is away from the bottom, the last row when there
    chat.atBottom.value = false;
    scroller.seeks = [];
    chat.pinToBottom();
    expect(scroller.seeks).toEqual([]);
    chat.atBottom.value = true;
    chat.pinToBottom();
    expect(scroller.seeks).toEqual([{ index: chat.latestIndex, animate: false }]);
    unmount();
  });

  it('an empty send does nothing; a send while streaming is ignored; stop aborts', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    await settle(10);
    const before = chat.count;
    await chat.send({ text: '   ', model: 'quick', attachments: [] });
    expect(chat.count).toBe(before);
    chat.streaming.value = { controller: new AbortController() } as never;
    await chat.send({ text: 'x', model: 'quick', attachments: [] });
    expect(chat.count).toBe(before);
    chat.stopStreaming();
    expect((chat.streaming.value as unknown as { controller: AbortController }).controller.signal.aborted).toBe(true);
    chat.streaming.value = null;
    unmount();
  });

  it('picks the loaded turn whose words meet the draft, or the fallback when nothing is loaded', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    await settle(10);
    expect((await chat.pickSource('anything')).id).toBe('fallback');
    chat.onWindow({ start: 0, end: 6 });
    await settle(10);
    expect((await chat.pickSource('tell me about scrollers')).id).toBe('m1');
    expect(['m1', 'm3', 'm5']).toContain((await chat.pickSource('zzz')).id);
    unmount();
  });

  it('expansion, focus, the bottom test, and the jump chip', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const scroller = fakeScroller();
    chat.scroller.value = scroller as never;
    await settle(10);
    expect(chat.isExpanded('a')).toBe(false);
    chat.toggle('a');
    expect(scroller.cancelled).toBe(1);
    chat.expand('a');
    expect(chat.isExpanded('a')).toBe(true);
    chat.toggle('a');
    expect(chat.isExpanded('a')).toBe(false);
    chat.jumpTo(99);
    expect(chat.focusedId.value).toBe('m5');
    expect(chat.isFocused(chat.rows.value[5])).toBe(true);
    scroller.scrollPosition = 0;
    chat.onScroll();
    expect(chat.atBottom.value).toBe(false);
    expect(chat.showsJumpToLatest).toBe(true);
    scroller.scrollPosition = 600;
    chat.onScroll();
    expect(chat.atBottom.value).toBe(true);
    chat.toggleIndex();
    expect(chat.indexOpen.value).toBe(true);
    chat.closeIndex();
    expect(chat.indexOpen.value).toBe(false);
    expect(chat.sourceLabel).toContain('a real Claude Code session');
    expect(Chat.Class.bytes(512)).toBe('512 B');
    expect(Chat.Class.bytes(2048)).toBe('2 KB');
    expect(Chat.Class.bytes(3 * 1024 * 1024)).toBe('3.0 MB');
    unmount();
  });

  it('opens a session file from disk as a stream, scrubbed, and swaps the thread', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    await settle(10);
    const records = [
      { type: 'user', uuid: 'f1', timestamp: '2026-09-09T10:00:00.000Z', message: { role: 'user', content: 'from disk ekalashnikov@gmail.com' } },
      { type: 'assistant', uuid: 'f2', timestamp: '2026-09-09T10:00:01.000Z', message: { id: 'api', model: 'm', content: [{ type: 'text', text: 'reply' }] } },
    ];
    const file = new File([records.map((record) => JSON.stringify(record)).join('\n')], 'session.jsonl');
    await chat.open(file);
    expect(chat.error.value).toBe('');
    expect(chat.source.value).toBe('file');
    expect(chat.count).toBe(2);
    expect(chat.rows.value[0].message?.parts).toEqual([{ kind: 'text', text: 'from disk user@example.com' }]);
    expect(chat.sourceLabel).toContain('session.jsonl');
    expect(chat.fileLines.value).toBe(2);
    await chat.open(new File(['{"type":"mode"}'], 'empty.jsonl'));
    expect(chat.error.value).toBe('No conversation records in that file.');
    unmount();
  });

  it('messagesFor loads the pages the selection needs and returns thread order', async () => {
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    await settle(10);
    const messages = await chat.messagesFor(new Set(['m5', 'm0']));
    expect(messages.map((entry) => entry.id)).toEqual(['m0', 'm5']);
    expect(served.filter((name) => name.startsWith('page-')).sort()).toEqual(['page-000.json', 'page-001.json']);
    unmount();
  });
});
