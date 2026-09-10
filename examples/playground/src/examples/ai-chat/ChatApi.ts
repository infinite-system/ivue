import { Static } from '../../Static';
import type { SessionLog } from './SessionLog';

// The chat's server, mocked in the browser. The thread is the shipped
// sample: a small index of every message plus content pages of 200,
// fetched only when a window needs them, each request logged with its
// bytes and its time. Replies are replays of real assistant turns at the
// picked model's pace, as events: tokens, tool calls that start and later
// resolve, and done. Uploads never leave the browser. Nothing here is a
// model; the page says so.
class $ChatApi {
  /** simulated latency on top of the real fetch, so a loader is visible on a fast link */
  static readonly LATENCY_MS: [number, number] = [120, 360];
  static readonly SLOW_EVERY = 11;
  static readonly SLOW_MS = 700;

  static readonly MODELS: ChatApi.Model[] = [
    { id: 'quick', label: 'Quick', detail: 'small · 200k context', tokensPerSecond: 160, firstTokenMs: 320, toolScale: 0.15 },
    { id: 'default', label: 'Balanced', detail: 'mid · 200k context', tokensPerSecond: 85, firstTokenMs: 900, toolScale: 0.3 },
    { id: 'deep', label: 'Deep', detail: 'large · 1M context', tokensPerSecond: 45, firstTokenMs: 2400, toolScale: 0.5 },
  ];

  /** the mock's one shared state: the sample's base URL, the request count the latency model keys on, the seed */
  static readonly STATE: ChatApi.State = { baseUrl: '/examples/chat/sample/', requestCount: 0, seed: 7, simulateLatency: true };

  static configure(options: Partial<ChatApi.State>) {
    Object.assign(this.STATE, options);
  }

  static get baseUrl(): string {
    return this.STATE.baseUrl;
  }

  static model(id: string): ChatApi.Model {
    return this.MODELS.find((model) => model.id === id) ?? this.MODELS[1];
  }

  /** a deterministic 0..1 — the demo reads the same on every visit */
  static random(): number {
    const state = this.STATE;
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    return state.seed / 0x100000000;
  }

  static sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('aborted', 'AbortError'));
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  }

  /** the latency the mock adds to one request */
  static latency(): number {
    const state = this.STATE;
    if (!state.simulateLatency) return 0;
    state.requestCount++;
    if (state.requestCount % this.SLOW_EVERY === 0) return this.SLOW_MS;
    const [low, high] = this.LATENCY_MS;
    return Math.round(low + this.random() * (high - low));
  }

  /** one GET of the sample, timed and sized */
  static async fetchJson<Result>(name: string, signal?: AbortSignal): Promise<{ data: Result; log: ChatApi.RequestLog }> {
    const started = Date.now();
    const url = `${this.STATE.baseUrl}${name}`;
    const wait = this.latency();
    const [response] = await Promise.all([fetch(url, { signal }), this.sleep(wait, signal)]);
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const text = await response.text();
    const log: ChatApi.RequestLog = { name, bytes: text.length, ms: Date.now() - started, at: started };
    return { data: JSON.parse(text) as Result, log };
  }

  static meta(signal?: AbortSignal) {
    return this.fetchJson<ChatApi.Meta>('meta.json', signal);
  }

  static index(signal?: AbortSignal) {
    return this.fetchJson<ChatApi.IndexRow[]>('index.json', signal);
  }

  static page(index: number, signal?: AbortSignal) {
    return this.fetchJson<SessionLog.Message[]>(`page-${String(index).padStart(3, '0')}.json`, signal);
  }

  /**
   * A reply, replayed from a real assistant turn as a stream of events at
   * the model's pace: the first token after the model's latency, text in
   * word-sized tokens, tool calls that start and resolve after a delay
   * proportional to the real one (scaled by the model, capped), thinking
   * as its own timed span. Every wait is abortable.
   */
  static async *stream(source: SessionLog.Message, model: ChatApi.Model, signal?: AbortSignal): AsyncGenerator<ChatApi.StreamEvent> {
    const tokenMs = 1000 / model.tokensPerSecond;
    await this.sleep(model.firstTokenMs, signal);
    for (const part of source.parts) {
      if (part.kind === 'thinking') {
        yield { type: 'thinking_start', text: '' };
        const chunks = this.tokens(part.text);
        for (const chunk of chunks) {
          await this.sleep(tokenMs * 0.6, signal);
          yield { type: 'thinking_token', text: chunk };
        }
        yield { type: 'thinking_end', text: '' };
      } else if (part.kind === 'text') {
        for (const chunk of this.tokens(part.text)) {
          // a model does not tick like a metronome: words arrive in a jittered cadence, and a
          // sentence's end or a line break holds a beat longer
          await this.sleep(tokenMs * this.cadence(chunk), signal);
          yield { type: 'token', text: chunk };
        }
      } else if (part.kind === 'tool_call' || part.kind === 'tool_batch') {
        const calls = part.kind === 'tool_call' ? [part.call] : part.calls;
        for (const call of calls) {
          yield { type: 'tool_call', call };
          const real = call.durationMs ?? 1200;
          await this.sleep(Math.min(4000, Math.max(350, real * model.toolScale)), signal);
          yield { type: 'tool_result', call };
        }
      }
    }
    yield { type: 'done', text: '' };
  }

  /** word-sized tokens, whitespace kept, so the text reads as it streams */
  /** the pace of one word: 0.5–1.5× the model's rate, ×3 after a sentence or a line break */
  static cadence(chunk: string): number {
    const pause = /[.!?:]\s*$|\n\s*$/.test(chunk) ? 3 : 1;
    return (0.5 + this.random()) * pause;
  }

  static tokens(text: string): string[] {
    return text.match(/\S+\s*|\s+/g) ?? [];
  }

  /**
   * The attachment mock: a name, a size, an object URL, and for images
   * their natural size read locally — nothing is sent anywhere.
   */
  static async upload(file: File): Promise<SessionLog.AttachmentPart> {
    const url = URL.createObjectURL(file);
    const part: SessionLog.AttachmentPart = { kind: 'attachment', name: file.name, size: file.size, mimeType: file.type, url };
    if (file.type.startsWith('image/')) {
      const size = await this.imageSize(url);
      if (size) Object.assign(part, size);
    }
    return part;
  }

  static imageSize(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') return resolve(null);
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }
}

export namespace ChatApi {
  export const $Class = Static($ChatApi);
  export let Class = $Class;

  export interface State {
    baseUrl: string;
    requestCount: number;
    seed: number;
    simulateLatency: boolean;
  }

  export interface Model {
    id: string;
    label: string;
    detail: string;
    tokensPerSecond: number;
    firstTokenMs: number;
    /** how much of a real tool call's duration the replay waits */
    toolScale: number;
  }

  export interface RequestLog {
    name: string;
    bytes: number;
    ms: number;
    at: number;
  }

  export interface Meta {
    count: number;
    pageSize: number;
    pages: { index: number; bytes: number; messages: number; firstId: string }[];
    totalBytes: number;
    indexBytes: number;
    firstAt: number;
    lastAt: number;
    roles: Record<string, number>;
    models: Record<string, number>;
    tools: Record<string, number>;
    calls: number;
    subagents: number;
    source: { file: string; lines: number };
  }

  /** one line of the index: id, role initial, preview, tool count, time */
  export interface IndexRow {
    id: string;
    r: string;
    t: string;
    c: number;
    at: number;
  }

  export type StreamEvent =
    | { type: 'token' | 'thinking_token' | 'thinking_start' | 'thinking_end' | 'done'; text: string }
    | { type: 'tool_call' | 'tool_result'; call: SessionLog.ToolCall };
}
