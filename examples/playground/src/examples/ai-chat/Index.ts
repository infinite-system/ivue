import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../virtual-scroller/VirtualScroller.vue';
import { Kit } from '../../kit/Kit';
import { Icons } from './Icons';
import type { Chat } from './Chat';
import type { ChatApi } from './ChatApi';
import { ChatExport } from './ChatExport';
import { SessionLog } from './SessionLog';

// The index: every message as one line, from the small index file, so
// the whole thread is listed and filtered without a content page. A
// second virtual scroller over the filtered ids; a click seeks the chat;
// selection is a set of ids plus an anchor, so shift-click takes the
// range in the current filtered order and a filter never loses a pick.
// Export gathers the selected messages in thread order, loading the
// pages they need.
class $Index {
  /** the one role the index composes: its own scroller over the filtered rows */
  static get $kit(): Index.Roles {
    return {
      Scroller: { view: VirtualScrollerView, namespace: VirtualScroller }
    };
  }

  static readonly SPEAKER_LABELS: Record<Index.SpeakerFilter, string> = {
    all: 'All',
    user: 'You',
    assistant: 'Agent'
  };
  static readonly TOOL_LABELS: Record<Index.ToolFilter, string> = {
    include: 'With tools',
    exclude: 'No tools',
    compaction: 'Compaction only'
  };
  static readonly ORDER_LABELS: Record<Index.Order, string> = {
    oldest: 'Oldest first',
    newest: 'Newest first'
  };
  static readonly EXPORT_LABELS: Record<Chat.ExportForm, string> = {
    markdown: 'Markdown',
    plain: 'Plain text',
    jsonl: 'JSONL'
  };

  static saveFile(text: string, name: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  constructor(public props: Index.Props) {
    // the list reads like the chat: it opens at its end, and every new filtering lands there
    // again (or at its start when the newest is first) — after the scroller has its rows
    onMounted(() => this.landAfterFilter());
    watch(
      () => this.rows.value,
      () => this.landAfterFilter(),
      { flush: 'post' }
    );
    // a search the chat asked for — a file's name, or nothing — takes the box and the focus
    watch(
      () => this.chat.searchRequest.value,
      (request) => this.takeSearch(request),
      { immediate: true }
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Index;
  }

  get kit() {
    return this.self.$kit;
  }

  get searchIcon(): string {
    return Icons.Class.PATHS.search;
  }

  get jumpIcon(): string {
    return Icons.Class.PATHS.jump;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  /* ---- state ---- */

  get speaker() {
    return ref<Index.SpeakerFilter>('all');
  }

  get order() {
    return ref<Index.Order>('oldest');
  }

  get tools() {
    return ref<Index.ToolFilter>('include');
  }

  get query() {
    return ref('');
  }

  // TEMPLATE-REF TARGET — the search box, focused when the chat asks for a search
  get searchElement() {
    return ref<HTMLInputElement | null>(null);
  }

  get selected() {
    return shallowRef<Set<string>>(new Set());
  }

  get anchorId() {
    return ref<string | null>(null);
  }

  get focusedIndex() {
    return ref(0);
  }

  get exportForm() {
    return ref<Chat.ExportForm>('markdown');
  }

  get exporting() {
    return ref(false);
  }

  get copied() {
    return ref(false);
  }

  // TEMPLATE-REF TARGET — the index's own scroller
  get scroller() {
    return ref<VirtualScroller.Exposed<Index.Row> | null>(null);
  }

  /* ---- the filtered list ---- */

  get speakerOptions(): { value: Index.SpeakerFilter; label: string }[] {
    return (Object.keys(this.self.SPEAKER_LABELS) as Index.SpeakerFilter[]).map((value) => ({
      value,
      label: this.self.SPEAKER_LABELS[value]
    }));
  }

  get orderOptions(): { value: Index.Order; label: string }[] {
    return (Object.keys(this.self.ORDER_LABELS) as Index.Order[]).map((value) => ({
      value,
      label: this.self.ORDER_LABELS[value]
    }));
  }

  get isNewestFirst(): boolean {
    return this.order.value === 'newest';
  }

  get orderTitle(): string {
    return this.self.ORDER_LABELS[this.order.value];
  }

  get wrenchIcon(): string {
    return Icons.Class.PATHS.wrench;
  }

  get closeIcon(): string {
    return Icons.Class.PATHS.close;
  }

  /** the pick lists' caret: the model picker's chevron, turned down by the css */
  get caretIcon(): string {
    return Icons.Class.PATHS.chevron;
  }

  get downloadIcon(): string {
    return Icons.Class.PATHS.download;
  }

  get copyIcon(): string {
    return this.copied.value ? Icons.Class.PATHS.check : Icons.Class.PATHS.copy;
  }

  /** the row under the pointer in the list: the head line reads it, else the current row */
  get hovered() {
    return shallowRef<Index.Row | null>(null);
  }

  get focusRow(): Index.Row | undefined {
    return this.hovered.value ?? this.rows.value.find((row) => this.isCurrent(row));
  }

  get positionLabel(): string {
    const row = this.focusRow;
    const total = this.chat.indexRows.value.length;
    if (!row || !total) return '';
    return `#${(row.index + 1).toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`;
  }

  get dateLabel(): string {
    const row = this.focusRow;
    if (!row?.entry.at) return '';
    return new Date(row.entry.at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  get percentLabel(): string {
    const row = this.focusRow;
    const total = this.chat.indexRows.value.length;
    if (!row || total < 2) return '';
    return `${Math.round((row.index / (total - 1)) * 100)}%`;
  }

  /** what the filters left, when they left less than everything */
  get matchLabel(): string {
    const total = this.chat.indexRows.value.length;
    return this.count === total ? '' : `${this.count.toLocaleString('en-US')} match`;
  }

  get toolOptions(): { value: Index.ToolFilter; label: string }[] {
    return (Object.keys(this.self.TOOL_LABELS) as Index.ToolFilter[]).map((value) => ({
      value,
      label: this.self.TOOL_LABELS[value]
    }));
  }

  get exportOptions(): { value: Chat.ExportForm; label: string }[] {
    return (Object.keys(this.self.EXPORT_LABELS) as Chat.ExportForm[]).map((value) => ({
      value,
      label: this.self.EXPORT_LABELS[value]
    }));
  }

  // computed: stable-handle — the scroller's modelValue must be ONE list per
  // filter state, not a fresh array on every read; THIN, the walk is filterRows().
  get rows() {
    return computed(() => this.filterRows());
  }

  get count(): number {
    return this.rows.value.length;
  }

  get countLabel(): string {
    const total = this.chat.indexRows.value.length;
    return this.count === total
      ? `${total.toLocaleString('en-US')} messages`
      : `${this.count.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`;
  }

  get selectedCount(): number {
    return this.selected.value.size;
  }

  get hasSelection(): boolean {
    return this.selectedCount > 0;
  }

  get selectedLabel(): string {
    return this.selectedCount === 1
      ? '1 selected'
      : `${this.selectedCount.toLocaleString('en-US')} selected`;
  }

  get allShownSelected(): boolean {
    return this.count > 0 && this.rows.value.every((row) => this.selected.value.has(row.id));
  }

  get exportLabel(): string {
    return this.exporting.value ? 'Preparing…' : 'Export';
  }

  get exportTitle(): string {
    return `Download the selection as ${this.self.EXPORT_LABELS[this.exportForm.value]}`;
  }

  get copyLabel(): string {
    return this.copied.value ? 'Copied' : 'Copy';
  }

  get selectAllLabel(): string {
    return this.allShownSelected ? 'Clear all' : 'Select all';
  }

  /* ---- the walk behind rows ---- */

  filterRows(): Index.Row[] {
    const speaker = this.speaker.value;
    const tools = this.tools.value;
    const query = this.query.value.trim().toLowerCase();
    const output: Index.Row[] = [];
    this.chat.indexRows.value.forEach((entry, at) => {
      if (speaker === 'user' && entry.speaker !== 'user') return;
      if (speaker === 'assistant' && entry.speaker !== 'assistant') return;
      if (tools === 'exclude' && entry.calls > 0) return;
      if (tools === 'compaction' && !SessionLog.Class.isCompaction(entry.speaker, entry.text))
        return;
      if (query && !entry.text.toLowerCase().includes(query)) return;
      output.push({ id: entry.id, body: '', position: String(at + 1), index: at, entry });
    });
    return this.order.value === 'newest' ? output.reverse() : output;
  }

  takeSearch(request: string | null) {
    if (request === null) return;
    this.query.value = request;
    this.chat.searchRequest.value = null;
    void nextTick(() => this.searchElement.value?.focus());
  }

  /** where a fresh list lands: its top, in either order */
  landAfterFilter() {
    const scroller = this.scroller.value;
    if (!scroller || !this.rows.value.length) return;
    scroller.scrollToIndex(0, undefined, false, 0);
  }
  /* ---- per row ---- */

  isSelected(row: Index.Row): boolean {
    return this.selected.value.has(row.id);
  }

  isCurrent(row: Index.Row): boolean {
    return this.chat.focusedId.value === row.id;
  }

  isFocusedRow(row: Index.Row): boolean {
    return this.focusedIndex.value === this.rows.value.indexOf(row);
  }

  speakerMark(row: Index.Row): string {
    return row.entry.speaker === 'user'
      ? 'you'
      : row.entry.speaker === 'assistant'
        ? 'agent'
        : 'sys';
  }

  speakerClass(row: Index.Row): string {
    return `ix-role-${row.entry.speaker[0]}`;
  }

  timeLabel(row: Index.Row): string {
    if (!row.entry.at) return '';
    const date = new Date(row.entry.at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  toolsLabel(row: Index.Row): string {
    return row.entry.calls ? `${row.entry.calls} tool${row.entry.calls === 1 ? '' : 's'}` : '';
  }

  hasTools(row: Index.Row): boolean {
    return row.entry.calls > 0;
  }

  /** the count beside the wrench: the number alone, the glyph says the rest */
  toolsCount(row: Index.Row): string {
    return String(row.entry.calls);
  }

  /** the tools filter as a pick list: the value the reader chose */
  onToolsPick(event: Event) {
    this.setTools((event.target as HTMLSelectElement).value as Index.ToolFilter);
  }

  onOrderPick(event: Event) {
    this.setOrder((event.target as HTMLSelectElement).value as Index.Order);
  }

  onRowEnter(row: Index.Row) {
    this.hovered.value = row;
  }

  onListLeave() {
    this.hovered.value = null;
  }

  previewText(row: Index.Row): string {
    return row.entry.text || '(no text)';
  }

  rowText(row: Index.Row): string {
    return `${this.speakerMark(row)} ${row.entry.text}`;
  }

  rowClass(row: Index.Row): Record<string, boolean> {
    return {
      'ac-selected': this.isSelected(row),
      'ac-current': this.isCurrent(row),
      'ac-focused': this.isFocusedRow(row)
    };
  }

  /* ---- selection ---- */

  /** click picks one and sets the anchor; shift takes the range; ctrl or cmd toggles without moving the anchor */
  onRowClick(row: Index.Row, event: MouseEvent) {
    if (event.shiftKey && this.anchorId.value) this.selectRange(this.anchorId.value, row.id);
    else if (event.metaKey || event.ctrlKey) this.toggleOne(row.id);
    else {
      this.selected.value = new Set([row.id]);
      this.anchorId.value = row.id;
    }
    this.focusedIndex.value = this.rows.value.indexOf(row);
  }

  /** the checkbox: toggle, and become the anchor */
  onRowCheck(row: Index.Row, event: Event) {
    event.stopPropagation();
    this.toggleOne(row.id);
    this.anchorId.value = row.id;
    this.focusedIndex.value = this.rows.value.indexOf(row);
  }

  toggleOne(id: string) {
    const next = new Set(this.selected.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.value = next;
  }

  /** every row between two ids in the current filtered order joins the selection */
  selectRange(fromId: string, toId: string) {
    const rows = this.rows.value;
    const from = rows.findIndex((row) => row.id === fromId);
    const to = rows.findIndex((row) => row.id === toId);
    if (from < 0 || to < 0) return;
    const [start, end] = from <= to ? [from, to] : [to, from];
    const next = new Set(this.selected.value);
    for (let at = start; at <= end; at++) next.add(rows[at].id);
    this.selected.value = next;
  }

  toggleAllShown() {
    const next = new Set(this.selected.value);
    if (this.allShownSelected) for (const row of this.rows.value) next.delete(row.id);
    else for (const row of this.rows.value) next.add(row.id);
    this.selected.value = next;
  }

  clearSelection() {
    this.selected.value = new Set();
    this.anchorId.value = null;
  }

  /* ---- navigation ---- */

  seek(row: Index.Row) {
    this.chat.jumpTo(row.index);
  }

  onRowDoubleClick(row: Index.Row) {
    this.seek(row);
  }

  /** the key landed in a text field — the search box, or any other input in the panel */
  isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return Boolean(
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    );
  }

  onKeydown(event: KeyboardEvent) {
    // the chord that opened the panel closes it, wherever in the panel the focus sits
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.chat.closeIndex();
      return;
    }
    // typing in the search box is typing: a space or an arrow there is the box's, not the list's
    if (this.isTyping(event)) return;
    const rows = this.rows.value;
    if (!rows.length) return;
    const current = Math.max(0, Math.min(rows.length - 1, this.focusedIndex.value));
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.max(
        0,
        Math.min(rows.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))
      );
      this.focusedIndex.value = next;
      if (event.shiftKey) {
        if (!this.anchorId.value) this.anchorId.value = rows[current].id;
        this.selectRange(this.anchorId.value, rows[next].id);
      }
      this.scroller.value?.scrollToIndex(next, undefined, false);
    } else if (event.key === ' ') {
      event.preventDefault();
      this.toggleOne(rows[current].id);
      this.anchorId.value = rows[current].id;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.seek(rows[current]);
    } else if (event.key === 'Escape') this.chat.closeIndex();
  }

  /* ---- filters ---- */

  setSpeaker(value: Index.SpeakerFilter) {
    this.speaker.value = value;
  }

  setOrder(value: Index.Order) {
    this.order.value = value;
  }

  /** the one Date button: it turns the order over */
  toggleOrder() {
    this.order.value = this.order.value === 'newest' ? 'oldest' : 'newest';
  }

  isOrder(value: Index.Order): boolean {
    return this.order.value === value;
  }

  setTools(value: Index.ToolFilter) {
    this.tools.value = value;
  }

  isSpeaker(value: Index.SpeakerFilter): boolean {
    return this.speaker.value === value;
  }

  isTools(value: Index.ToolFilter): boolean {
    return this.tools.value === value;
  }

  clearQuery() {
    this.query.value = '';
  }

  /* ---- resize ---- */

  /* ---- export ---- */

  /** the selected messages in thread order, as the chosen form */
  async exportText(): Promise<string> {
    const messages = await this.chat.messagesFor(this.selected.value);
    return ChatExport.Class.text(messages, this.exportForm.value);
  }

  async download() {
    if (!this.hasSelection || this.exporting.value) return;
    this.exporting.value = true;
    try {
      const text = await this.exportText();
      const extension =
        this.exportForm.value === 'markdown'
          ? 'md'
          : this.exportForm.value === 'plain'
            ? 'txt'
            : 'jsonl';
      this.self.saveFile(text, `chat-selection.${extension}`);
    } finally {
      this.exporting.value = false;
    }
  }

  async copyMarkdown() {
    if (!this.hasSelection) return;
    const messages = await this.chat.messagesFor(this.selected.value);
    const text = ChatExport.Class.text(messages, 'markdown');
    try {
      await navigator.clipboard.writeText(text);
      this.copied.value = true;
      setTimeout(() => (this.copied.value = false), 1600);
    } catch {
      this.copied.value = false;
    }
  }
}

export namespace Index {
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Roles = { Scroller: Kit.Entry<$Index, undefined, typeof VirtualScroller> };
  export const $Class = Static($Index);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }

  export type SpeakerFilter = 'all' | 'user' | 'assistant';
  export type ToolFilter = 'include' | 'exclude' | 'compaction';
  export type Order = 'oldest' | 'newest';

  export interface Row extends VirtualScroller.BaseItem {
    index: number;
    entry: ChatApi.IndexEntry;
  }
}
