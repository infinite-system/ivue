import { Static } from '../../Static';
import { SessionParser } from './SessionParser';

// A Claude Code session file, one JSON record per line, turned into the
// messages a chat renders. Streaming: feed it a line at a time and read
// the messages off as they close, so a 500 MB file from disk never has
// to exist as one string. The conversation records are `user`,
// `assistant` and `system`; everything else the file holds is session
// bookkeeping and is dropped.
//
// What the parser joins:
// - an assistant turn arrives as several records sharing `message.id`,
//   one per content block — they merge into one message;
// - a `tool_result` block in a user record joins the `tool_use` it
//   answers, by id, into one tool call carrying the structured result;
// - a run of two or more tool calls with no text between them, within
//   a turn or across consecutive tool-only turns, contracts to a batch;
// - subagent records (`isSidechain`) fold under the Agent call that
//   spawned them, in order of appearance.
class $SessionLog {
  static readonly CONVERSATION_TYPES = new Set(['user', 'assistant', 'system']);

  /** the tags a prompt carries that a reader never typed */
  static readonly PROMPT_NOISE = [
    /<system-reminder>[\s\S]*?<\/system-reminder>/g,
    /<command-message>[\s\S]*?<\/command-message>/g,
    /<command-name>[\s\S]*?<\/command-name>/g,
    /<command-args>[\s\S]*?<\/command-args>/g,
    /<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g,
  ];

  /** the whole text at once — the tests' and the build script's door */
  static parse(text: string, options: SessionLog.Options = {}): SessionLog.Message[] {
    const parser = new SessionParser.Class(options);
    for (const line of text.split('\n')) parser.line(line);
    return parser.finish();
  }

  /** a duration for a label: 240ms, 4.8s, 47s, 1m 04s, 1h 02m */
  static duration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 10) return `${seconds.toFixed(1)}s`;
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`;
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  /** one record's `timestamp` as epoch milliseconds, 0 when absent */
  static epoch(record: SessionLog.Record): number {
    const stamp = record.timestamp;
    if (typeof stamp !== 'string') return 0;
    const parsed = Date.parse(stamp);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /** a prompt without the harness's own tags; '' when nothing typed remains */
  static promptText(content: string): string {
    let text = content;
    for (const noise of this.PROMPT_NOISE) text = text.replace(noise, '');
    return text.trim();
  }

  /** a tool result's content as one string: text blocks joined, images counted */
  static resultText(content: SessionLog.ResultContent | undefined): string {
    if (content === undefined || content === null) return '';
    if (typeof content === 'string') return content;
    return content
      .map((block) => (block.type === 'text' ? block.text ?? '' : block.type === 'image' ? '[image]' : ''))
      .filter(Boolean)
      .join('\n');
  }

  /** the images a tool result carries, as data URLs */
  static resultImages(content: SessionLog.ResultContent | undefined): string[] {
    if (!Array.isArray(content)) return [];
    return content
      .filter((block) => block.type === 'image' && block.source?.data)
      .map((block) => `data:${block.source?.media_type ?? 'image/png'};base64,${block.source?.data}`);
  }

  /** `tool: name` and the first line of what mattered — the collapsed line and the index's text */
  static callSummary(call: SessionLog.ToolCall): string {
    const input = call.input;
    const first = (value: unknown) => String(value ?? '').split('\n')[0].trim();
    switch (call.name) {
      case 'Bash':
        return first(input.command);
      case 'Edit':
      case 'Write':
      case 'Read':
      case 'NotebookEdit':
        return first(input.file_path);
      case 'Agent':
        return first(input.description ?? input.prompt);
      case 'Skill':
        return first(input.skill);
      case 'WebFetch':
      case 'WebSearch':
        return first(input.url ?? input.query);
      case 'Grep':
      case 'Glob':
        return first(input.pattern);
      case 'Artifact':
        return first(input.title ?? input.action ?? input.file_path);
      default: {
        const firstValue = Object.values(input)[0];
        return typeof firstValue === 'string' ? first(firstValue) : '';
      }
    }
  }

  /** the plain text a message projects — what copy and the index read */
  static messageText(message: SessionLog.Message): string {
    return message.parts.map((part) => this.partText(part)).filter(Boolean).join('\n');
  }

  static partText(part: SessionLog.Part): string {
    switch (part.kind) {
      case 'text':
        return part.text;
      case 'thinking':
        return `thinking · ${part.text.length.toLocaleString('en-US')} chars`;
      case 'tool_call':
        return `tool: ${part.call.name} ${this.callSummary(part.call)}`.trim();
      case 'tool_batch':
        return `${part.calls.length} tool calls: ${part.calls.map((call) => call.name).join(', ')}`;
      case 'attachment':
        return part.name;
      case 'system':
        return part.text;
    }
  }

  /** an assistant message that holds tool calls and thinking only — a batch candidate */
  static isToolOnly(message: SessionLog.Message): boolean {
    return (
      message.role === 'assistant' &&
      message.parts.length > 0 &&
      message.parts.every((part) => part.kind === 'tool_call' || part.kind === 'thinking')
    );
  }
}

export namespace SessionLog {
  export const $Class = Static($SessionLog);
  export let Class = $Class;
  export interface Options {
    /** run the scrub rules over every record before it is read */
    scrub?: boolean;
    /** keep only these system subtypes (all when absent) */
    systemSubtypes?: string[];
  }

  /** one line of the file, the fields the parser reads */
  export interface Record {
    type: string;
    uuid?: string;
    parentUuid?: string | null;
    timestamp?: string;
    isSidechain?: boolean;
    isCompactSummary?: boolean;
    isMeta?: boolean;
    message?: {
      id?: string;
      role?: string;
      model?: string;
      usage?: Usage;
      content?: string | Block[];
    };
    toolUseResult?: unknown;
    subtype?: string;
    durationMs?: number;
    hookCount?: number;
    content?: unknown;
  }

  export interface Block {
    type: string;
    text?: string;
    thinking?: string;
    id?: string;
    name?: string;
    input?: unknown;
    tool_use_id?: string;
    content?: ResultContent;
    is_error?: boolean;
  }

  export type ResultContent = string | { type: string; text?: string; source?: { media_type?: string; data?: string } }[];

  export interface Usage {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  }

  export type Role = 'user' | 'assistant' | 'system';
  export type CallState = 'pending' | 'running' | 'done' | 'failed';

  export interface ToolResult {
    text: string;
    images: string[];
    isError: boolean;
    structured: unknown;
  }

  export interface ToolCall {
    id: string;
    name: string;
    input: globalThis.Record<string, unknown>;
    state: CallState;
    result: ToolResult | null;
    durationMs: number | null;
    startedAt: number;
    /** an Agent call's subagent thread */
    children: Message[] | null;
  }

  export interface TextPart {
    kind: 'text';
    text: string;
  }
  export interface ThinkingPart {
    kind: 'thinking';
    text: string;
    durationMs: number | null;
    /** set while a replayed reply is thinking — the counter's start */
    startedAt?: number;
  }
  export interface ToolCallPart {
    kind: 'tool_call';
    call: ToolCall;
  }
  export interface ToolBatchPart {
    kind: 'tool_batch';
    calls: ToolCall[];
    messageIds: string[];
  }
  export interface AttachmentPart {
    kind: 'attachment';
    name: string;
    size: number;
    mimeType: string;
    url: string;
    width?: number;
    height?: number;
  }
  export interface SystemPart {
    kind: 'system';
    subtype: string;
    text: string;
    detail: string;
    durationMs: number | null;
  }
  export type Part = TextPart | ThinkingPart | ToolCallPart | ToolBatchPart | AttachmentPart | SystemPart;

  export interface Message {
    id: string;
    index: number;
    role: Role;
    timestamp: number;
    parts: Part[];
    model?: string;
    usage?: Usage;
    apiId?: string;
    sidechain: boolean;
    /** a folded subagent thread that found no Agent call */
    children?: Message[];
    /** a reply the page replayed from a real turn, not a record from the file */
    replay?: boolean;
    /** the whole reply's wall time once it is done */
    durationMs?: number;
  }
}
