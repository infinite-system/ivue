import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { MessagePartText } from './message-parts/MessagePart.Text';
import MessagePartTextView from './message-parts/MessagePart.Text.vue';
import { MessagePartThinking } from './message-parts/MessagePart.Thinking';
import MessagePartThinkingView from './message-parts/MessagePart.Thinking.vue';
import { MessagePartAttachment } from './message-parts/MessagePart.Attachment';
import MessagePartAttachmentView from './message-parts/MessagePart.Attachment.vue';
import { MessagePartSystem } from './message-parts/MessagePart.System';
import MessagePartSystemView from './message-parts/MessagePart.System.vue';
import { MessagePartToolCall } from './message-parts/MessagePart.ToolCall';
import MessagePartToolCallView from './message-parts/MessagePart.ToolCall.vue';
import { MessagePartToolBatch } from './message-parts/MessagePart.ToolBatch';
import MessagePartToolBatchView from './message-parts/MessagePart.ToolBatch.vue';
import GutterView from './ChatMessage.Gutter.vue';
import HeaderView from './ChatMessage.Header.vue';
import StubView from './ChatMessage.Stub.vue';
import MessagePartsView from './ChatMessage.MessageParts.vue';
import AwaitView from './ChatMessage.Await.vue';
import FooterView from './ChatMessage.Footer.vue';
import type { Chat } from '../Chat';
import { Clock } from '../Clock';
import type { MessagePart } from './message-parts/MessagePart';
import type { SessionLog } from '../SessionLog';

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

  /** the roles a row composes — a part per kind, fed its part through `bind`, and its own sections in
   *  the order the template renders — built once per class by Static(). The part entries stay plain
   *  literals rather than `Kit.Class.entry(MessagePartText, …)`: each part view declares `part` as its own
   *  kind, while the seam's item is the union the kind→role lookup narrows at runtime, so a typed
   *  entry would refuse the one bind all six share. */
  static get $kit(): ChatMessage.Roles {
    return {
      Text: { view: MessagePartTextView, namespace: MessagePartText, bind: this.bindMessagePart },
      Thinking: {
        view: MessagePartThinkingView,
        namespace: MessagePartThinking,
        bind: this.bindMessagePart
      },
      Attachment: {
        view: MessagePartAttachmentView,
        namespace: MessagePartAttachment,
        bind: this.bindMessagePart
      },
      System: {
        view: MessagePartSystemView,
        namespace: MessagePartSystem,
        bind: this.bindMessagePart
      },
      ToolCall: {
        view: MessagePartToolCallView,
        namespace: MessagePartToolCall,
        bind: this.bindMessagePart
      },
      ToolBatch: {
        view: MessagePartToolBatchView,
        namespace: MessagePartToolBatch,
        bind: this.bindMessagePart
      },
      Gutter: { view: GutterView },
      Header: { view: HeaderView },
      Stub: { view: StubView },
      MessageParts: { view: MessagePartsView },
      Await: { view: AwaitView },
      Footer: { view: FooterView },
      order: ['Gutter', 'Header', 'Stub', 'MessageParts', 'Await', 'Footer']
    };
  }

  /** what every part receives from the row: its part, the chat, the message — the seam's item is the part */
  static bindMessagePart({
    model,
    item
  }: Kit.Seam<$ChatMessage, SessionLog.Part>): MessagePart.Props {
    return { part: item, chat: model.chat, message: model.message };
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

  static readonly SPEAKER_LABELS: Record<SessionLog.Speaker, string> = {
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

  get speaker(): SessionLog.Speaker {
    return this.row.speaker;
  }

  get speakerLabel(): string {
    return this.self.SPEAKER_LABELS[this.speaker];
  }

  get avatarLetter(): string {
    return this.speakerLabel.slice(0, 1);
  }

  get speakerClass(): string {
    return `ac-msg-${this.speaker}`;
  }

  get rowClass(): Record<string, boolean> {
    return {
      [this.speakerClass]: true,
      'ac-msg-stub': this.isStub,
      'ac-msg-streaming': this.isStreamingRow,
      'ac-msg-focused': this.chat.isFocused(this.row),
      'ac-msg-system': this.speaker === 'system'
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
    if (!message || message.speaker !== 'assistant') return '';
    const pieces: string[] = [];
    const tokens = message.usage?.output_tokens;
    if (tokens) pieces.push(`${tokens.toLocaleString('en-US')} tokens`);
    if (message.durationMs) pieces.push(Clock.Class.label(message.durationMs));
    return pieces.join(' · ');
  }

  get hasReceipt(): boolean {
    return this.receiptLabel !== '';
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
    return this.row.preview || `${this.speakerLabel} message`;
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

  /**
   * Whether a section renders this pass: the stub and the parts are the two states of one row, the
   * await line shows while the reply has nothing yet, the foot once there is a receipt; every other
   * role always. A layer overrides this for the roles it adds and falls back to `super`.
   */
  shows(role: ChatMessage.SectionRole): boolean {
    switch (role) {
      case 'Stub':
        return this.isStub;
      case 'MessageParts':
        return !this.isStub;
      case 'Await':
        return this.isAwaitingFirstToken;
      case 'Footer':
        return this.hasReceipt;
      default:
        return true;
    }
  }

  /**
   * What a seam hands the role's view: the entry's `bind` over the seam, or `{ model, kit }` when
   * the entry has none. Never a branch on the role's name — the entry is the table.
   */
  // invariant: The seam is built by one method that never names a role (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  seamProps(role: ChatMessage.Role, item?: SessionLog.Part, key?: string | number): Kit.Bound {
    return Kit.Class.seam(this, this.kit[role], item, key);
  }

  /** the role for a part: its kind's, or Text for a kind nobody mapped */
  partRole(part: SessionLog.Part): ChatMessage.PartRole {
    const role = this.self.PART_ROLES[part.kind];
    return role && role in this.kit ? role : 'Text';
  }

  partEntry(part: SessionLog.Part): Kit.Entry {
    return this.kit[this.partRole(part)];
  }

  partView(part: SessionLog.Part) {
    return this.partEntry(part).view;
  }

  /** the seam for a part: its role's entry, fed the part as the item and the loop's key */
  partProps(part: SessionLog.Part, at: number): Kit.Bound {
    return this.seamProps(this.partRole(part), part, this.partKey(part, at));
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

  /** what every section receives from the row: its entry and the row model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }

  export type PartRole = 'Text' | 'Thinking' | 'Attachment' | 'System' | 'ToolCall' | 'ToolBatch';
  export type SectionRole = 'Gutter' | 'Header' | 'Stub' | 'MessageParts' | 'Await' | 'Footer';
  export type Role = PartRole | SectionRole;
  /** the row's kit: its sections in an order, and a part role per kind fed its part — declared, so the
   *  row's instance type and its kit can name each other */
  export type Roles = Kit.Of<SectionRole, $ChatMessage> &
    Kit.Roles<PartRole, $ChatMessage, SessionLog.Part> & { order: readonly SectionRole[] };
}
