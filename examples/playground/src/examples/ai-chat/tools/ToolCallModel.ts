import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import type { Chat } from '../Chat';
import { Clock } from '../Clock';
import { Highlighter } from '../Highlighter';
import { SessionLog } from '../SessionLog';

// What every tool card shares: the collapsed line (icon, name, the one
// argument that matters, state, elapsed), the expansion state kept on
// the chat by call id, the "show everything" cap, and the raw input and
// result. A tool's own class extends this and names its sections; the
// generic card renders input as JSON and the result as text.
class $ToolCallModel {
  static readonly ICONS: Record<string, string> = {
    Bash: '$',
    Edit: '±',
    Write: '✎',
    Read: '☰',
    Agent: '⑂',
    Skill: '◈',
    WebFetch: '⇣',
    WebSearch: '⌕',
    Artifact: '▣',
    Grep: '⌕',
    Glob: '✱',
    ToolSearch: '⌕',
    AskUserQuestion: '?',
    NotebookEdit: '✎',
  };
  /** result text past this many characters folds behind "show everything" */
  static readonly CAP = 4_000;

  constructor(public props: ToolCallModel.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ToolCallModel;
  }

  get call(): SessionLog.ToolCall {
    return this.props.call;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get name(): string {
    return this.call.name;
  }

  get icon(): string {
    if (this.name.startsWith('mcp__')) return '⌘';
    if (this.name.startsWith('Task')) return '☑';
    return this.self.ICONS[this.name] ?? '⚙';
  }

  get summary(): string {
    return SessionLog.Class.callSummary(this.call);
  }

  /** the collapsed line's text — exactly what the projection says for this part */
  get headText(): string {
    return `${this.name} ${this.summary}`.trim();
  }

  get state(): SessionLog.CallState {
    return this.call.state;
  }

  get isRunning(): boolean {
    return this.state === 'pending' || this.state === 'running';
  }

  get isFailed(): boolean {
    return this.state === 'failed';
  }

  get stateLabel(): string {
    return this.isRunning ? 'running' : this.isFailed ? 'failed' : 'done';
  }

  get elapsedLabel(): string {
    if (this.isRunning) return this.call.startedAt ? Clock.Class.label(this.chat.clock.elapsed(this.call.startedAt, null), true) : '';
    return this.call.durationMs !== null ? Clock.Class.label(this.call.durationMs) : '';
  }

  get isExpanded(): boolean {
    return this.chat.isExpanded(this.call.id);
  }

  get showsAll(): boolean {
    return this.chat.isExpanded(`${this.call.id}:all`);
  }

  get cardClass(): Record<string, boolean> {
    return { 'ac-tool-open': this.isExpanded, 'ac-tool-running': this.isRunning, 'ac-tool-failed': this.isFailed };
  }

  get toggleLabel(): string {
    return this.isExpanded ? 'collapse' : 'expand';
  }

  get toggleGlyph(): string {
    return this.isExpanded ? '▾' : '▸';
  }

  get stateClass(): string {
    return `ac-state-${this.stateLabel}`;
  }

  /** the error block a failed call shows under its own sections */
  get showsError(): boolean {
    return this.isFailed && this.resultText.length > 0;
  }

  get showsCapControl(): boolean {
    return this.isCapped || this.showsAll;
  }

  /* ---- input and result ---- */

  get input(): Record<string, unknown> {
    return this.call.input;
  }

  get inputJson(): string {
    return JSON.stringify(this.input, null, 2);
  }

  get structured(): Record<string, unknown> {
    const structured = this.call.result?.structured;
    return structured && typeof structured === 'object' && !Array.isArray(structured) ? (structured as Record<string, unknown>) : {};
  }

  get hasResult(): boolean {
    return this.call.result !== null;
  }

  get resultText(): string {
    return this.call.result?.text ?? '';
  }

  get images(): string[] {
    return this.call.result?.images ?? [];
  }

  get hasImages(): boolean {
    return this.images.length > 0;
  }

  get cap(): number | null {
    return this.showsAll ? null : this.self.CAP;
  }

  /** whether any block on this card is being cut by the cap */
  get isCapped(): boolean {
    return !this.showsAll && this.sections.some((section) => section.code.length > this.self.CAP);
  }

  get showAllLabel(): string {
    return this.showsAll ? 'Show less' : 'Show everything';
  }

  /** the blocks the expanded card renders — a tool's own class names its own */
  get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [{ title: 'input', code: this.inputJson, lang: 'json' }];
    if (this.resultText) sections.push({ title: this.isFailed ? 'error' : 'result', code: this.resultText, lang: 'text', tone: this.isFailed ? 'error' : 'plain' });
    return sections;
  }

  languageFor(path: unknown): string {
    return Highlighter.Class.languageForPath(String(path ?? ''));
  }

  pathLabel(path: unknown): string {
    return String(path ?? '').replace(/^~\//, '');
  }

  toggle() {
    this.chat.toggle(this.call.id);
  }

  toggleAll() {
    this.chat.toggle(`${this.call.id}:all`);
  }
}

export namespace ToolCallModel {
  export const $Class = Static($ToolCallModel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    call: SessionLog.ToolCall;
    chat: Chat.Model;
    message: SessionLog.Message | null;
  }

  export interface Section {
    title: string;
    code: string;
    lang: string;
    tone?: 'plain' | 'error' | 'muted';
    startLine?: number;
  }
}
