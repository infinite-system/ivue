import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Kit } from '../../kit/Kit';
import { TextPart } from './parts/TextPart';
import TextPartView from './parts/TextPart.vue';
import { ThinkingPart } from './parts/ThinkingPart';
import ThinkingPartView from './parts/ThinkingPart.vue';
import { AttachmentPart } from './parts/AttachmentPart';
import AttachmentPartView from './parts/AttachmentPart.vue';
import { SystemPart } from './parts/SystemPart';
import SystemPartView from './parts/SystemPart.vue';
import { ToolCallPart } from './parts/ToolCallPart';
import ToolCallPartView from './parts/ToolCallPart.vue';
import { ToolBatchPart } from './parts/ToolBatchPart';
import ToolBatchPartView from './parts/ToolBatchPart.vue';
import MessageGutterView from './sections/MessageGutter.vue';
import MessageHeadView from './sections/MessageHead.vue';
import MessageStubView from './sections/MessageStub.vue';
import MessagePartsView from './sections/MessageParts.vue';
import MessageAwaitView from './sections/MessageAwait.vue';
import MessageFootView from './sections/MessageFoot.vue';
import type { Chat } from './Chat';
import { Clock } from './Clock';
import type { SessionLog } from './SessionLog';

// One row of the thread: a stub with its loader while the page is on the
// way, then the message — role, time, model stamp, and its parts, each
// rendered through the entry its kit names for the part's kind. The row's
// own sections are roles too, so any of them swaps from outside. A row that
// is being streamed re-reads the chat's revision, so in-place growth of
// its message re-renders this row and nothing else.
class $ChatMessage {
  /** what the skeleton's frame takes: the stub's padding and its status line — the row's own head sits above it */
  static readonly SKELETON_FRAME_PX = 36;
  static readonly SKELETON_LINE_PX = 20;
  static readonly SKELETON_CARD_PX = 26;
  static readonly SKELETON_MAX_LINES = 6;
  static readonly SKELETON_MAX_CARDS = 2;
  /** the faintest and the firmest a skeleton line gets */
  static readonly SKELETON_OPACITY_MIN = 0.35;
  static readonly SKELETON_OPACITY_MAX = 0.7;

  /** a line's opacity between the bounds, varied by the preview's length and the line's place */
  static skeletonOpacity(length: number, at: number): number {
    const span = this.SKELETON_OPACITY_MAX - this.SKELETON_OPACITY_MIN;
    return (
      Math.round((this.SKELETON_OPACITY_MIN + span * (((length * 13 + at * 7) % 11) / 10)) * 100) /
      100
    );
  }

  /** the roles a row composes: a part per kind, and its own sections — built once per class by Static() */
  static get $kit() {
    return {
      Text: { namespace: TextPart, vue: TextPartView },
      Thinking: { namespace: ThinkingPart, vue: ThinkingPartView },
      Attachment: { namespace: AttachmentPart, vue: AttachmentPartView },
      System: { namespace: SystemPart, vue: SystemPartView },
      ToolCall: { namespace: ToolCallPart, vue: ToolCallPartView },
      ToolBatch: { namespace: ToolBatchPart, vue: ToolBatchPartView },
      Gutter: { vue: MessageGutterView },
      Head: { vue: MessageHeadView },
      Stub: { vue: MessageStubView },
      Parts: { vue: MessagePartsView },
      Await: { vue: MessageAwaitView },
      Foot: { vue: MessageFootView }
    } satisfies Kit.Of<ChatMessage.PartRole | ChatMessage.SectionRole>;
  }

  /** a part kind (the log's snake_case) names its role (the kit's PascalCase) */
  static readonly PART_ROLES: Record<SessionLog.Part['kind'], ChatMessage.PartRole> = {
    text: 'Text',
    thinking: 'Thinking',
    attachment: 'Attachment',
    system: 'System',
    tool_call: 'ToolCall',
    tool_batch: 'ToolBatch'
  };

  /** the distance from `at` to `now` in the coarsest unit that is at least one */
  static relative(at: number, now: number): string {
    const dayMs = 86_400_000;
    const days = Math.floor((now - at) / dayMs);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  static readonly ROLE_LABELS: Record<SessionLog.Role, string> = {
    user: 'You',
    assistant: 'Agent',
    system: 'System'
  };

  constructor(public props: ChatMessage.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ChatMessage;
  }

  /** the kit is the class's; a subclass with its own `$kit` swaps the subtree */
  get kit() {
    return this.self.$kit;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get row(): Chat.Row {
    return this.props.row;
  }

  /** the message, re-read on every in-place change the chat announces */
  get message(): SessionLog.Message | null {
    void this.chat.revision.value;
    return this.row.message;
  }

  get isStub(): boolean {
    return this.message === null;
  }

  get role(): SessionLog.Role {
    return this.row.role;
  }

  get roleLabel(): string {
    return this.self.ROLE_LABELS[this.role];
  }

  get avatarLetter(): string {
    return this.roleLabel.slice(0, 1);
  }

  get roleClass(): string {
    return `ac-msg-${this.role}`;
  }

  get rowClass(): Record<string, boolean> {
    return {
      [this.roleClass]: true,
      'ac-msg-stub': this.isStub,
      'ac-msg-streaming': this.isStreamingRow,
      'ac-msg-focused': this.chat.isFocused(this.row),
      'ac-msg-system': this.role === 'system'
    };
  }

  get parts(): SessionLog.Part[] {
    return this.message?.parts ?? [];
  }

  get isStreamingRow(): boolean {
    return this.chat.streaming.value?.row.id === this.row.id;
  }

  get timeLabel(): string {
    const at = this.message?.timestamp ?? this.row.message?.timestamp ?? 0;
    if (!at) return '';
    const date = new Date(at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /** `Fri, Jul 30` — the year only when it is not this one */
  get dateLabel(): string {
    const at = this.message?.timestamp ?? 0;
    if (!at) return '';
    const date = new Date(at);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(
      'en-US',
      sameYear
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
    );
  }

  /** `3 days ago`, `today`, `2 months ago` — how far back the message sits */
  get relativeLabel(): string {
    const at = this.message?.timestamp ?? 0;
    return at ? this.self.relative(at, Date.now()) : '';
  }

  get hasDate(): boolean {
    return this.dateLabel !== '';
  }

  get modelLabel(): string {
    return this.message?.model ?? '';
  }

  get isReplay(): boolean {
    return Boolean(this.message?.replay);
  }

  get replayLabel(): string {
    return this.isReplay ? 'replayed from a real turn' : '';
  }

  /** the reply's stamp once it is done: tokens and wall time */
  get receiptLabel(): string {
    const message = this.message;
    if (!message || message.role !== 'assistant') return '';
    const pieces: string[] = [];
    const tokens = message.usage?.output_tokens;
    if (tokens) pieces.push(`${tokens.toLocaleString('en-US')} tokens`);
    if (message.durationMs) pieces.push(Clock.Class.label(message.durationMs));
    return pieces.join(' · ');
  }

  /** while the reply waits for its first token: the model name with the counter */
  get isAwaitingFirstToken(): boolean {
    const streaming = this.chat.streaming.value;
    return Boolean(
      streaming &&
      streaming.row.id === this.row.id &&
      streaming.firstTokenAt === null &&
      !streaming.thinking &&
      this.parts.length === 0
    );
  }

  /** the line under the head while the reply has nothing yet: one "Thinking…" and its clock */
  get awaitingLabel(): string {
    const streaming = this.chat.streaming.value;
    if (!streaming) return '';
    return `Thinking… · ${Clock.Class.label(this.chat.clock.elapsed(streaming.startedAt, null), true)}`;
  }

  get indexLabel(): string {
    return `#${(this.row.index + 1).toLocaleString('en-US')}`;
  }

  /* ---- the stub ---- */

  get stubLabel(): string {
    return this.row.preview || `${this.roleLabel} message`;
  }

  /**
   * The skeleton fills the stub's height the way the row will: a head of
   * two pills, then text lines and — for a turn that made calls — card
   * bars, as many as the estimate has room for; widths come from the
   * preview's length so neighbouring rows differ.
   */
  get skeletonBlocks(): ChatMessage.SkeletonBlock[] {
    const self = this.self;
    const room = this.stubHeight - self.SKELETON_FRAME_PX;
    const cards = Math.min(self.SKELETON_MAX_CARDS, this.row.calls);
    const lines = Math.max(
      1,
      Math.min(
        self.SKELETON_MAX_LINES,
        Math.floor((room - cards * self.SKELETON_CARD_PX) / self.SKELETON_LINE_PX)
      )
    );
    const length = this.row.preview.length;
    const blocks: ChatMessage.SkeletonBlock[] = [];
    for (let at = 0; at < lines; at++) {
      const last = at === lines - 1;
      const width = last ? 25 + ((length * (at + 3)) % 40) : 72 + ((length * (at + 1)) % 26);
      blocks.push({ kind: 'line', width: `${width}%`, opacity: self.skeletonOpacity(length, at) });
    }
    for (let at = 0; at < cards; at++)
      blocks.push({
        kind: 'card',
        width: `${58 + ((length * (at + 5)) % 30)}%`,
        opacity: self.skeletonOpacity(length, lines + at)
      });
    return blocks;
  }

  /** the stub's height in px — the scroller's estimate, never under the minimum */
  get stubHeight(): number {
    const size = this.chat.scroller.value?.estimatedItemSize ?? 72;
    return Math.max(48, Math.round(size));
  }

  get isPageLoading(): boolean {
    return this.chat.isPagePending(this.row);
  }

  get stubElapsedLabel(): string {
    if (!this.isPageLoading) return '';
    return Clock.Class.label(
      this.chat.clock.elapsed(this.chat.pageStartedAt(this.row), null),
      true
    );
  }

  get stubStatusLabel(): string {
    return this.isPageLoading
      ? `page ${this.row.page + 1} · ${this.stubElapsedLabel}`
      : `page ${this.row.page + 1}`;
  }

  /** the stub's height is the scroller's estimate, so a page landing never moves the geometry */
  get stubStyle(): Record<string, string> {
    return { height: `${this.stubHeight}px` };
  }

  skeletonClass(block: ChatMessage.SkeletonBlock): Record<string, boolean> {
    return { 'ac-skel-card': block.kind === 'card' };
  }

  skeletonStyle(block: ChatMessage.SkeletonBlock): Record<string, string> {
    return { width: block.width, opacity: String(block.opacity) };
  }

  /** the entry for a part: its kind's role, or Text for a kind nobody mapped */
  partEntry(part: SessionLog.Part): Kit.Entry {
    const role = this.self.PART_ROLES[part.kind];
    return (role && this.kit[role]) ?? this.kit.Text;
  }

  partView(part: SessionLog.Part) {
    return this.partEntry(part).vue;
  }

  partKey(part: SessionLog.Part, at: number): string {
    if (part.kind === 'tool_call') return part.call.id;
    if (part.kind === 'tool_batch') return `batch-${part.calls[0]?.id ?? at}`;
    return `${part.kind}-${at}`;
  }
}

export namespace ChatMessage {
  export interface SkeletonBlock {
    kind: 'line' | 'card';
    width: string;
    /** each line a little fainter or firmer than its neighbour — depth, not a flat stack */
    opacity: number;
  }

  export const $Class = Static($ChatMessage);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    row: Chat.Row;
    chat: Chat.Model;
    /** the entry this view was rendered through: the class it constructs */
    kit?: Kit.Entry;
  }

  export type PartRole = 'Text' | 'Thinking' | 'Attachment' | 'System' | 'ToolCall' | 'ToolBatch';
  export type SectionRole = 'Gutter' | 'Head' | 'Stub' | 'Parts' | 'Await' | 'Foot';
}
