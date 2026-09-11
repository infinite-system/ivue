/*
=== GENERATOR ===
Goal: Prove the mock server is honest: every request is timed and sized, the latency model is deterministic, a reply replays a real turn as ordered events at the picked model's pace, and an upload never leaves the browser.
// domain-invariant: $ChatApi — If a request completes, then its log carries the bytes and the time it took
// domain-invariant: $ChatApi — If a turn is replayed, then its events arrive in the turn's own order: tokens for text, a call before its result
// domain-invariant: $ChatApi — If a replayed turn thinks, then its thinking spans at least THINK_MIN_MS, so the clock over it counts
Impossible if true: an upload issues a network request

=== GENERATOR-DESCRIBED ===
$ChatApi is the mocked server: timed and sized requests, deterministic latency, replays of real turns as events, uploads that never leave the browser.
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatApi } from './ChatApi';
import type { SessionLog } from './SessionLog';

const call = (id: string, name: string): SessionLog.ToolCall => ({
  id,
  name,
  input: { command: 'ls' },
  state: 'done',
  result: { text: 'ok', images: [], isError: false, structured: null },
  durationMs: 1200,
  startedAt: 0,
  children: null
});

describe('ChatApi', () => {
  beforeEach(() => {
    ChatApi.Class.configure({
      baseUrl: '/sample/',
      requestCount: 0,
      seed: 7,
      simulateLatency: false
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // domain-invariant: $ChatApi — If a request completes, then its log carries the bytes and the time it took
  it('fetches the sample by name and logs bytes and time; a bad status throws', async () => {
    const body = JSON.stringify({ count: 3 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url) =>
        new Response(String(url).endsWith('meta.json') ? body : 'nope', {
          status: String(url).endsWith('meta.json') ? 200 : 404
        })
    );
    const meta = await ChatApi.Class.meta();
    expect(fetchMock).toHaveBeenCalledWith('/sample/meta.json', expect.anything());
    expect(meta.data).toEqual({ count: 3 });
    expect(meta.log).toMatchObject({ name: 'meta.json', bytes: body.length });
    expect(meta.log.ms).toBeGreaterThanOrEqual(0);
    await expect(ChatApi.Class.page(4)).rejects.toThrow('page-004.json: HTTP 404');
    expect(ChatApi.Class.baseUrl).toBe('/sample/');
  });

  it('the latency model is deterministic and off when asked', () => {
    ChatApi.Class.configure({ simulateLatency: true, requestCount: 0, seed: 7 });
    const first = Array.from({ length: 11 }, () => ChatApi.Class.latency());
    ChatApi.Class.configure({ requestCount: 0, seed: 7 });
    const second = Array.from({ length: 11 }, () => ChatApi.Class.latency());
    expect(first).toEqual(second);
    expect(first[10]).toBe(ChatApi.Class.SLOW_MS);
    for (const wait of first.slice(0, 10))
      expect(wait).toBeGreaterThanOrEqual(ChatApi.Class.LATENCY_MS[0]);
    ChatApi.Class.configure({ simulateLatency: false });
    expect(ChatApi.Class.latency()).toBe(0);
    expect(ChatApi.Class.model('deep').id).toBe('deep');
    expect(ChatApi.Class.model('nope').id).toBe('default');
  });

  // domain-invariant: $ChatApi — If a turn is replayed, then its events arrive in the turn's own order: tokens for text, a call before its result
  it('replays a turn as ordered events at the model pace, and aborts cleanly', async () => {
    vi.useFakeTimers();
    const source: SessionLog.Message = {
      id: 'm',
      index: 0,
      role: 'assistant',
      timestamp: 0,
      sidechain: false,
      parts: [
        { kind: 'thinking', text: 'plan it', durationMs: 900 },
        { kind: 'text', text: 'Two words' },
        { kind: 'tool_batch', calls: [call('c1', 'Bash'), call('c2', 'Read')], messageIds: ['m'] },
        { kind: 'tool_call', call: call('c3', 'Edit') }
      ]
    };
    const model = ChatApi.Class.model('quick');
    const events: string[] = [];
    const run = (async () => {
      for await (const event of ChatApi.Class.stream(source, model))
        events.push(
          'call' in event ? `${event.type}:${event.call.id}` : `${event.type}:${event.text}`
        );
    })();
    await vi.advanceTimersByTimeAsync(60_000);
    await run;
    expect(events).toEqual([
      'thinking_start:',
      'thinking_token:plan ',
      'thinking_token:it',
      'thinking_end:',
      'token:Two ',
      'token:words',
      'tool_call:c1',
      'tool_result:c1',
      'tool_call:c2',
      'tool_result:c2',
      'tool_call:c3',
      'tool_result:c3',
      'done:'
    ]);
    const controller = new AbortController();
    const aborted: string[] = [];
    const abortedRun = (async () => {
      try {
        for await (const event of ChatApi.Class.stream(source, model, controller.signal))
          aborted.push(event.type);
      } catch (error) {
        aborted.push(`error:${(error as Error).name}`);
      }
    })();
    controller.abort();
    await vi.advanceTimersByTimeAsync(10);
    await abortedRun;
    expect(aborted).toEqual(['error:AbortError']);
    expect(ChatApi.Class.tokens('a  b\nc')).toEqual(['a  ', 'b\n', 'c']);
  });

  // impossible-if-true: $ChatApi — an upload issues a network request
  it('an upload makes an object URL and reads image size locally, with no fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const create = vi.fn(() => 'blob:local');
    Object.defineProperty(URL, 'createObjectURL', {
      value: create,
      configurable: true,
      writable: true
    });
    vi.spyOn(ChatApi.Class, 'imageSize').mockResolvedValue({ width: 640, height: 480 });
    const image = await ChatApi.Class.upload(new File(['x'], 'shot.png', { type: 'image/png' }));
    expect(image).toEqual({
      kind: 'attachment',
      name: 'shot.png',
      size: 1,
      mimeType: 'image/png',
      url: 'blob:local',
      width: 640,
      height: 480
    });
    const file = await ChatApi.Class.upload(new File(['abc'], 'notes.txt', { type: 'text/plain' }));
    expect(file).toEqual({
      kind: 'attachment',
      name: 'notes.txt',
      size: 3,
      mimeType: 'text/plain',
      url: 'blob:local'
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('imageSize resolves null without an Image constructor, and reads the natural size when the image loads', async () => {
    const image = globalThis.Image;
    // @ts-expect-error — the environment without images
    globalThis.Image = undefined;
    expect(await ChatApi.Class.imageSize('blob:x')).toBeNull();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 12;
      naturalHeight = 7;
      set src(value: string) {
        queueMicrotask(() => (value.endsWith('bad') ? this.onerror?.() : this.onload?.()));
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;
    expect(await ChatApi.Class.imageSize('blob:good')).toEqual({ width: 12, height: 7 });
    expect(await ChatApi.Class.imageSize('blob:bad')).toBeNull();
    globalThis.Image = image;
  });
});

// domain-invariant: $ChatApi — If a replayed turn thinks, then its thinking spans at least THINK_MIN_MS, so the clock over it counts
it('a thought spans at least the minimum, however short its text', async () => {
  vi.useFakeTimers();
  const source: SessionLog.Message = {
    id: 't',
    index: 0,
    role: 'assistant',
    timestamp: 0,
    sidechain: false,
    parts: [{ kind: 'thinking', text: 'plan it', durationMs: 5, startedAt: 0 }]
  };
  const model = ChatApi.Class.model('quick');
  const events: string[] = [];
  const run = (async () => {
    for await (const event of ChatApi.Class.stream(source, model)) events.push(event.type);
  })();
  await vi.advanceTimersByTimeAsync(model.firstTokenMs + ChatApi.$Class.THINK_MIN_MS / 2);
  expect(events).toContain('thinking_start');
  expect(events).not.toContain('thinking_end');
  await vi.advanceTimersByTimeAsync(ChatApi.$Class.THINK_MIN_MS);
  await run;
  expect(events.at(-2)).toBe('thinking_end');
  vi.useRealTimers();
});
