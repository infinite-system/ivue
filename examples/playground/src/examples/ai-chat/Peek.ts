import { ref, shallowRef, type ShallowUnwrapRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../virtual-scroller/VirtualScroller.vue';
import type { Chat } from './Chat';
import type { Kit } from '../../kit/Kit';

// The scrollbar's peek: hover the track and a small card slides in beside
// the pointer, showing the messages that live at that position — a mini
// virtual scroller over the same rows, so the wheel walks it and a click
// jumps the thread there. It reads previews the index already carries,
// so a peek never fetches a page. While the thumb is dragged the peek
// follows it.
class $Peek {
  /** the roles the peek composes — the mini scroller; built once per class by Static() */
  static get $kit() {
    return {
      Scroller: { namespace: VirtualScroller, vue: VirtualScrollerView },
    } satisfies Kit.Of<Peek.Role>;
  }

  /** rows the card shows at once */
  static readonly ROWS = 7;
  static readonly ROW_PX = 30;
  static readonly HEAD_PX = 30;
  /** the card stays this long after the pointer leaves, so it can be crossed into */
  static readonly LINGER_MS = 220;

  constructor(public props: Peek.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Peek;
  }

  get kit() {
    return this.self.$kit;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get open() {
    return ref(false);
  }

  /** the pointer's y inside the thread, where the card is anchored */
  get y() {
    return ref(0);
  }

  /** the row under the pointer's position on the track */
  get index() {
    return ref(0);
  }

  get lingerTimer() {
    return shallowRef<ReturnType<typeof setTimeout> | null>(null);
  }

  // TEMPLATE-REF TARGET — the mini scroller's exposed instance
  get scroller() {
    return ref<VirtualScroller.Exposed<Chat.Row> | null>(null);
  }

  get rows() {
    return this.chat.rows;
  }

  get count(): number {
    return this.rows.value.length;
  }

  get row(): Chat.Row | undefined {
    return this.rows.value[this.index.value];
  }

  get listHeight(): number {
    return this.self.ROWS * this.self.ROW_PX;
  }

  get cardHeight(): number {
    return this.listHeight + this.self.HEAD_PX;
  }

  get listStyle(): Record<string, string> {
    return { height: `${this.listHeight}px` };
  }

  /** the card is centred on the pointer, kept inside the thread */
  get style(): Record<string, string> {
    const top = Math.max(8, this.y.value - this.cardHeight / 2);
    return { top: `${top}px` };
  }

  get positionLabel(): string {
    if (!this.count) return '';
    return `#${(this.index.value + 1).toLocaleString()} of ${this.count.toLocaleString()}`;
  }

  get dateLabel(): string {
    const row = this.row;
    if (!row?.at) return '';
    const date = new Date(row.at);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  get percentLabel(): string {
    if (this.count < 2) return '';
    return `${Math.round((this.index.value / (this.count - 1)) * 100)}%`;
  }

  roleMark(row: Chat.Row): string {
    return row.role === 'user' ? 'you' : row.role === 'assistant' ? 'agent' : 'sys';
  }

  rowClass(row: Chat.Row): Record<string, boolean> {
    return { 'ac-peek-hot': row.index === this.index.value, [`ac-role-${row.role}`]: true };
  }

  previewText(row: Chat.Row): string {
    return row.preview || '(no text)';
  }

  timeLabel(row: Chat.Row): string {
    if (!row.at) return '';
    const date = new Date(row.at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /** a pointer over the track, or dragging its thumb: the card follows */
  onThreadPointerMove(event: PointerEvent) {
    const thread = event.currentTarget as HTMLElement;
    const track = thread.querySelector<HTMLElement>('.virtual-scroller__track');
    if (!track || !this.count) return;
    const target = event.target as HTMLElement | null;
    const overTrack = Boolean(target?.closest('.virtual-scroller__track'));
    const overCard = Boolean(target?.closest('.ac-peek'));
    if (!overTrack && !this.chat.thumbDragging) {
      // over the card the wheel walks it; anywhere else the card lingers, then goes
      if (overCard) this.cancelLinger();
      else if (this.open.value) this.leave();
      return;
    }
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    this.y.value = event.clientY - thread.getBoundingClientRect().top;
    this.show(Math.round(fraction * (this.count - 1)));
  }

  onThreadPointerLeave() {
    this.leave();
  }

  show(index: number) {
    this.cancelLinger();
    this.index.value = index;
    this.open.value = true;
    // the hot row sits in the middle of the card
    this.scroller.value?.scrollToIndex(Math.max(0, index - Math.floor(this.self.ROWS / 2)), undefined, false, 0);
  }

  /** the card lingers so the pointer can cross the gap into it */
  leave() {
    this.cancelLinger();
    this.lingerTimer.value = setTimeout(() => this.close(), this.self.LINGER_MS);
  }

  close() {
    this.open.value = false;
  }

  cancelLinger() {
    if (this.lingerTimer.value) clearTimeout(this.lingerTimer.value);
    this.lingerTimer.value = null;
  }

  /** a row jumps the thread there */
  select(row: Chat.Row) {
    this.chat.jumpTo(row.index);
    this.close();
  }
}

export namespace Peek {
  export const $Class = Static($Peek);
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
  /** what a template ref to the peek's view resolves to */
  export type Exposed = ShallowUnwrapRef<Instance>;

  export type Role = 'Scroller';

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}
