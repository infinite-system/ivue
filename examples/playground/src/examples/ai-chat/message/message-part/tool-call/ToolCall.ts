import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { Kit } from '../../../../../kit/Kit';
import { KitContainer } from '../../../../../kit/KitContainer';
import { Icons } from '../../../Icons';
import { ToolCallSections } from './ToolCall.Sections';
import ToolCallSectionsView from './ToolCall.Sections.vue';
import { ToolCallSubThread } from './ToolCall.SubThread';
import ToolCallSubThreadView from './ToolCall.SubThread.vue';
import ToolCallHeaderView from './ToolCall.Header.vue';
import ToolCallCaptionView from './ToolCall.Caption.vue';
import ToolCallThreadView from './ToolCall.Thread.vue';
import ToolCallFooterView from './ToolCall.Footer.vue';
import type { Chat } from '../../../Chat';
import { Clock } from '../../../Clock';
import { Highlighter } from '../../../Highlighter';
import { SessionLog } from '../../../SessionLog';

// What every tool card shares: the collapsed line (icon, name, the one
// argument that matters, state, elapsed), the expansion state kept on
// the chat by call id, the "show everything" cap, and the raw input and
// result. One view renders every card — the sections in their order — and
// a tool's own class extends this to name its sections, its caption, and
// nothing else; the generic card renders input as JSON and the result as
// text.
class $ToolCall extends KitContainer.$Class<ToolCall.Roles> {
  /** the card's sections in the order they render: the collapsed line, then what an expanded card
   *  shows — a caption, the code blocks as a list of their own, a nested thread, the foot; each leaf
   *  past the header decides its own presence, which is the expansion */
  static override get $kit(): ToolCall.Roles {
    return {
      Header: { view: ToolCallHeaderView },
      Caption: { view: ToolCallCaptionView },
      Sections: {
        view: ToolCallSectionsView,
        namespace: ToolCallSections,
        bind: this.bindSections
      },
      Thread: { view: ToolCallThreadView },
      SubThread: {
        view: ToolCallSubThreadView,
        namespace: ToolCallSubThread,
        bind: this.bindSubThread
      },
      Footer: { view: ToolCallFooterView },
      order: ['Header', 'Caption', 'Sections', 'Thread', 'Footer']
    };
  }

  /** what the blocks list receives from the card: the sections, the cap, and whether the card is open */
  static bindSections({ model }: Kit.Seam<$ToolCall>): ToolCallSections.Props {
    return { sections: model.sections, cap: model.cap, expanded: model.isExpanded };
  }

  /** what a nested thread receives: the messages a call carried, and the chat */
  static bindSubThread({ model }: Kit.Seam<$ToolCall>): ToolCallSubThread.Props {
    return { messages: model.thread, chat: model.chat };
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
    AskUserQuestion: '?'
  };
  /** result text past this many characters folds behind "show everything" */
  static readonly CAP = 4_000;

  constructor(public props: ToolCall.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ToolCall;
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
    if (this.isRunning)
      return this.call.startedAt
        ? Clock.Class.label(this.chat.clock.elapsed(this.call.startedAt, null), true)
        : '';
    return this.call.durationMs !== null ? Clock.Class.label(this.call.durationMs) : '';
  }

  get isExpanded(): boolean {
    return this.chat.isExpanded(this.call.id);
  }

  /** the line above the blocks — a tool with one says so; the generic card has none */
  get caption(): string {
    return '';
  }

  get showsCaption(): boolean {
    return this.isExpanded && this.caption !== '';
  }

  /* ---- a nested thread: the messages a call carried, an agent's run ---- */

  get thread(): SessionLog.Message[] {
    return this.call.children ?? [];
  }

  get hasThread(): boolean {
    return this.thread.length > 0;
  }

  get showsThread(): boolean {
    return this.isExpanded && this.hasThread;
  }

  get threadId(): string {
    return `${this.call.id}:thread`;
  }

  get isThreadOpen(): boolean {
    return this.chat.isExpanded(this.threadId);
  }

  get threadLabel(): string {
    const count = this.thread.length;
    return `${this.isThreadOpen ? 'hide' : 'show'} the subagent's thread · ${count.toLocaleString('en-US')} message${count === 1 ? '' : 's'}`;
  }

  get showsAll(): boolean {
    return this.chat.isExpanded(`${this.call.id}:all`);
  }

  get cardClass(): Record<string, boolean> {
    return {
      'ac-tool-open': this.isExpanded,
      'ac-tool-running': this.isRunning,
      'ac-tool-failed': this.isFailed
    };
  }

  get toggleLabel(): string {
    return this.isExpanded ? 'collapse' : 'expand';
  }

  /** one chevron; the card's open class turns it */
  get chevronIcon(): string {
    return Icons.Class.PATHS.chevron;
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
    return structured && typeof structured === 'object' && !Array.isArray(structured)
      ? (structured as Record<string, unknown>)
      : {};
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
  get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [{ title: 'input', code: this.inputJson, lang: 'json' }];
    if (this.resultText)
      sections.push({
        title: this.isFailed ? 'error' : 'result',
        code: this.resultText,
        lang: 'text',
        tone: this.isFailed ? 'error' : 'plain'
      });
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

  toggleThread() {
    this.chat.toggle(this.threadId);
  }
}

export namespace ToolCall {
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Roles = Kit.Roles<'Header' | 'Caption' | 'Thread' | 'Footer', $ToolCall> & {
    Sections: Kit.Entry<$ToolCall, undefined, typeof ToolCallSections>;
    SubThread: Kit.Entry<$ToolCall, undefined, typeof ToolCallSubThread>;
    order: readonly Role[];
  };

  /** what every leaf of the card receives: its entry and the card model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }
  export const $Class = Static($ToolCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    call: SessionLog.ToolCall;
    chat: Chat.Model;
    message: SessionLog.Message | null;
    /** the entry this view was rendered through: the class it constructs */
    kit?: Kit.Entry;
  }

  export type Role = 'Header' | 'Caption' | 'Sections' | 'Thread' | 'Footer';

  /** a label beside a section's title */
  export interface Tag {
    text: string;
    class?: string | Record<string, boolean>;
  }

  /** one block of an expanded card, as data: the list renders every one the same way */
  export interface Section {
    title: string;
    code: string;
    lang: string;
    tone?: 'plain' | 'error' | 'muted';
    startLine?: number;
    /** the title is a file path — set in its own face, never uppercased */
    pathTitle?: boolean;
    tags?: Tag[];
    /** long lines wrap; off for code and diffs */
    wrap?: boolean;
    /** what stands in for an empty block */
    note?: string;
  }
}
