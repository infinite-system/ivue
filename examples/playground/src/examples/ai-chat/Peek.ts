import { computed, nextTick, ref, shallowRef, watch, type ShallowUnwrapRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../virtual-scroller/VirtualScroller.vue';
import type { Chat } from './Chat';
import { Icons } from './Icons';
import { Index } from './Index';
import type { Kit } from '../../kit/Kit';

// The scrollbar's peek: hover the track and a small card slides in beside
// the pointer, showing the messages that live at that position — a mini
// virtual scroller over the same rows, so the wheel walks it and a click
// jumps the thread there. It reads previews the index already carries,
// so a peek never fetches a page. While the thumb is dragged the peek
// follows it. A search box at its top narrows the card to the rows whose
// preview holds every word, and the same role and tools pickers as the
// index narrow it further; while the box holds text or focus the card
// stays, so the reader can type without the pointer pinning it.
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
  /** the search row, the pickers and the position line above the list */
  static readonly HEAD_PX = 104;
  /** the card stays this long after the pointer leaves, so it can be crossed into */
  static readonly LINGER_MS = 220;

  constructor(public props: Peek.Props) {
    watch(
      () => [this.query.value, this.role.value, this.tools.value],
      () => this.onQueryChange(),
    );
  }

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

  get query() {
    return ref('');
  }

  get searchFocused() {
    return ref(false);
  }

  get role() {
    return ref<Index.RoleFilter>('all');
  }

  get tools() {
    return ref<Index.ToolFilter>('include');
  }

  // TEMPLATE-REF TARGET — the search box
  get searchElement() {
    return ref<HTMLInputElement | null>(null);
  }

  // computed: stable-handle — the mini scroller's modelValue must be ONE list per
  // change of rows or query, not a fresh array per read
  get rows() {
    return computed(() => this.filtered());
  }

  // TEMPLATE-REF TARGET — the mini scroller's exposed instance
  get scroller() {
    return ref<VirtualScroller.Exposed<Chat.Row> | null>(null);
  }

  get allRows() {
    return this.chat.rows;
  }

  get count(): number {
    return this.allRows.value.length;
  }

  get row(): Chat.Row | undefined {
    return this.allRows.value[this.index.value];
  }

  get searchIcon(): string {
    return Icons.$Class.PATHS.search;
  }

  get roleOptions(): { value: Index.RoleFilter; label: string }[] {
    return (Object.keys(Index.$Class.ROLE_LABELS) as Index.RoleFilter[]).map((value) => ({ value, label: Index.$Class.ROLE_LABELS[value] }));
  }

  get toolOptions(): { value: Index.ToolFilter; label: string }[] {
    return (Object.keys(Index.$Class.TOOL_LABELS) as Index.ToolFilter[]).map((value) => ({ value, label: Index.$Class.TOOL_LABELS[value] }));
  }

  get hasQuery(): boolean {
    return this.query.value.trim().length > 0;
  }

  /** anything narrows the list: words in the box, a role, a tools pick */
  get isFiltered(): boolean {
    return this.hasQuery || this.role.value !== 'all' || this.tools.value !== 'include';
  }

  /** the card holds while the reader is narrowing it — a filter set, text in the box, or focus on it */
  get isPinned(): boolean {
    return this.isFiltered || this.searchFocused.value;
  }


  get matchLabel(): string {
    if (!this.isFiltered) return '';
    const matches = this.rows.value.length;
    return matches === 1 ? '1 match' : `${matches.toLocaleString('en-US')} matches`;
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

  isRole(value: Index.RoleFilter): boolean {
    return this.role.value === value;
  }

  isTools(value: Index.ToolFilter): boolean {
    return this.tools.value === value;
  }

  setRole(value: Index.RoleFilter) {
    this.role.value = value;
  }

  setTools(value: Index.ToolFilter) {
    this.tools.value = value;
  }

  roleMark(row: Chat.Row): string {
    return row.role === 'user' ? 'you' : row.role === 'assistant' ? 'agent' : 'sys';
  }

  rowClass(row: Chat.Row): Record<string, boolean> {
    return { [`ac-role-${row.role}`]: true };
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
    // the card first: its own scroller has a track too, and a pointer on it must not move the card
    const overCard = Boolean(target?.closest('.ac-peek'));
    if (overCard) {
      this.cancelLinger();
      return;
    }
    const overTrack = Boolean(target && track.contains(target));
    if (!overTrack && !this.chat.thumbDragging) {
      // anywhere else the card lingers, then goes
      if (this.open.value) this.leave();
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

  onSearchFocus() {
    this.cancelLinger();
    this.searchFocused.value = true;
  }

  onSearchBlur() {
    this.searchFocused.value = false;
    if (!this.isFiltered) this.leave();
  }

  /** Escape clears the search, then the pickers, and closes the card once it is clear */
  onSearchKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (this.hasQuery) this.query.value = '';
    else if (this.isFiltered) this.resetFilters();
    else this.close();
  }

  resetFilters() {
    this.role.value = 'all';
    this.tools.value = 'include';
  }

  clearQuery() {
    this.query.value = '';
    this.searchElement.value?.focus();
  }

  /** the list changes under the scroll: a search lands on its first match, a cleared one back on the hot row */
  async onQueryChange() {
    await nextTick();
    const scroller = this.scroller.value;
    if (!scroller) return;
    if (this.isFiltered) scroller.scrollToIndex(0, undefined, false, 0);
    else scroller.scrollToIndex(Math.max(0, this.index.value - Math.floor(this.self.ROWS / 2)), undefined, false, 0);
  }

  show(index: number) {
    this.cancelLinger();
    this.index.value = index;
    this.open.value = true;
    // the hot row sits in the middle of the card; a filtered card keeps the reader's place in the matches
    if (!this.isFiltered) this.scroller.value?.scrollToIndex(Math.max(0, index - Math.floor(this.self.ROWS / 2)), undefined, false, 0);
  }

  /** the card lingers so the pointer can cross the gap into it; a search in progress holds it */
  leave() {
    this.cancelLinger();
    if (this.isPinned) return;
    this.lingerTimer.value = setTimeout(() => this.close(), this.self.LINGER_MS);
  }

  close() {
    this.open.value = false;
    this.query.value = '';
    this.resetFilters();
    this.searchFocused.value = false;
  }

  /** the rows the card lists: all of them, or those whose preview holds every word of the query */
  protected filtered(): Chat.Row[] {
    const words = this.query.value.toLowerCase().split(/\s+/).filter(Boolean);
    const role = this.role.value;
    const tools = this.tools.value;
    const rows = this.allRows.value;
    if (!this.isFiltered) return rows;
    return rows.filter((row) => {
      if (role !== 'all' && row.role !== role) return false;
      if (tools === 'exclude' && row.calls > 0) return false;
      if (tools === 'only' && row.calls === 0) return false;
      if (!words.length) return true;
      const text = `${this.roleMark(row)} ${row.preview}`.toLowerCase();
      return words.every((word) => text.includes(word));
    });
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
