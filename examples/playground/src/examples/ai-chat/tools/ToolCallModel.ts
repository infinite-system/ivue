import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { CodeBlock } from './CodeBlock';
import CodeBlockView from './CodeBlock.vue';
import { SubThread } from './SubThread';
import SubThreadView from './SubThread.vue';
import ToolHeadView from './ToolHead.vue';
import ToolFootView from './ToolFoot.vue';
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
  /** the roles every card composes: its head and foot, the code block, and a nested thread */
  static get $kit() {
    return {
      Head: { vue: ToolHeadView },
      Foot: { vue: ToolFootView },
      CodeBlock: { namespace: CodeBlock, vue: CodeBlockView },
      SubThread: { namespace: SubThread, vue: SubThreadView },
    } satisfies Kit.Of<ToolCallModel.Role>;
  }

  static readonly ICONS: Record<string, string> = {
    Bash: '❯',
    Edit: '✎',
    NotebookEdit: '✎',
    Write: '✚',
    Read: '≡',
    Agent: '⇶',
    Skill: '◈',
    WebFetch: '⇣',
    WebSearch: '⌕',
    Artifact: '▣',
    Grep: '⌕',
    Glob: '✱',
    ToolSearch: '⌕',
    AskUserQuestion: '?',
  };
  /** result text past this many characters folds behind "show everything" */
  static readonly CAP = 4_000;

  constructor(public props: ToolCallModel.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ToolCallModel;
  }

  /** the kit is the class's — a tool that overrides `$kit` swaps its own leaves */
  get kit() {
    return this.self.$kit;
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

  /** the action's own title — a shell call's description, an agent's brief — shown before the argument */
  get title(): string {
    const description = this.input.description;
    return typeof description === 'string' ? description.split('\n')[0].trim() : '';
  }

  get hasTitle(): boolean {
    return this.title !== '';
  }

  /** the path a file tool names, empty for every other tool */
  get filePath(): string {
    const path = this.input.file_path ?? this.input.notebook_path ?? this.input.path;
    return typeof path === 'string' ? path.trim() : '';
  }

  get isFileTool(): boolean {
    return this.filePath !== '';
  }

  /** the file's own name — always shown whole; the directory is what truncates */
  get fileName(): string {
    return this.filePath.split('/').pop() ?? '';
  }

  get fileDir(): string {
    const segments = this.filePath.split('/');
    segments.pop();
    return segments.length ? `${segments.join('/')}/` : '';
  }

  /** the directory shortened to its last two segments — `…/examples/ai-chat/` — so the file name stays whole */
  get fileDirShort(): string {
    const segments = this.fileDir.split('/').filter(Boolean);
    return segments.length > 2 ? `…/${segments.slice(-2).join('/')}/` : this.fileDir;
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

  /** one triangle; the card's open class turns it */
  get toggleGlyph(): string {
    return '▸';
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
    /** the entry this view was rendered through: the class it constructs */
    kit?: Kit.Entry;
  }

  export type Role = 'Head' | 'Foot' | 'CodeBlock' | 'SubThread';

  export interface Section {
    title: string;
    code: string;
    lang: string;
    tone?: 'plain' | 'error' | 'muted';
    startLine?: number;
  }
}
