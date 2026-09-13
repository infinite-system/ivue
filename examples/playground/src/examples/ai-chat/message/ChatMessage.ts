import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { KitContainer } from '../../../kit/KitContainer';
import { MessagePartList } from './message-part/MessagePartList';
import MessagePartListView from './message-part/MessagePartList.vue';
import GutterView from './ChatMessage.Gutter.vue';
import HeaderView from './ChatMessage.Header.vue';
import StubView from './ChatMessage.Stub.vue';
import AwaitView from './ChatMessage.Await.vue';
import FooterView from './ChatMessage.Footer.vue';
import type { Chat } from '../Chat';
import { Clock } from '../Clock';
import type { SessionLog } from '../SessionLog';

// One row of the thread: a stub with its loader while the page is on the
// way, then the message — role, time, model stamp, and its parts, each
// rendered through the entry its kit names for the part's kind. The row's
// own sections are roles too, so any of them swaps from outside. A row that
// is being streamed re-reads the chat's revision, so in-place growth of
// its message re-renders this row and nothing else.
class $ChatMessage extends KitContainer.$Class<ChatMessage.Roles> {
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

  /** the row's sections in the order the template renders them — built once per class by Static(). Each
   *  leaf decides its own presence at its root: the stub and the parts are the two states of one row, the
   *  await line shows while the reply has nothing yet, the footer once there is a receipt. The parts are a
   *  compositor of their own, fed by this container's one bind. */
  static override get $kit(): ChatMessage.Roles {
    return {
      Gutter: { view: GutterView },
      Header: { view: HeaderView },
      Stub: { view: StubView },
      MessagePartList: {
        view: MessagePartListView,
        namespace: MessagePartList,
        bind: this.bindPartList
      },
      Await: { view: AwaitView },
      Footer: { view: FooterView },
      order: ['Gutter', 'Header', 'Stub', 'MessagePartList', 'Await', 'Footer']
    };
  }

  /** what the parts list receives from the row: the message's parts, the chat, the message */
  static bindPartList({ model }: Kit.Seam<$ChatMessage>): MessagePartList.Props {
    return { parts: model.parts, chat: model.chat, message: model.message };
  }

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

  constructor(public props: ChatMessage.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ChatMessage;
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

  export type Role = 'Gutter' | 'Header' | 'Stub' | 'MessagePartList' | 'Await' | 'Footer';
  /** the row's kit: its sections in an order — declared, so the row's instance type and its kit can
   *  name each other */
  export type Roles = Kit.Of<Role, $ChatMessage> & { order: readonly Role[] };
}
