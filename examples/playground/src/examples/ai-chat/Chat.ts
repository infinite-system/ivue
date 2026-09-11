import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../virtual-scroller/VirtualScroller.vue';
import { Kit } from '../../kit/Kit';
import { ChatMessage } from './ChatMessage';
import ChatMessageView from './ChatMessage.vue';
import { Composer } from './Composer';
import ChatComposerView from './ChatComposer.vue';
import { Index } from './Index';
import ChatIndexView from './ChatIndex.vue';
import { Sidebar } from './sidebar/Sidebar';
import { Peek } from './Peek';
import ChatPeekView from './ChatPeek.vue';
import SidebarView from './sidebar/Sidebar.vue';
import type { ChatSettings } from './ChatSettings';
import { ChatApi } from './ChatApi';
import { Clock } from './Clock';
import { SessionLog } from './SessionLog';
import { SessionParser } from './SessionParser';
import { Markdown } from './Markdown';

// The thread. One row per message from the first request on — a small
// index says how many there are and who said what — and the content of a
// row arrives only when the scroller's window reaches its page. The
// scroller owns geometry and never learns that a row is unloaded: a stub
// renders at the estimated item size, so a page landing above the
// viewport moves nothing. Replies replay real turns as a stream; the
// bottom stays pinned only while the reader is there. One clock times
// every wait.
class $Chat {
  /** the roles the thread composes — the scroller, a row, the composer, the index — built once per class by Static() */
  static get $kit() {
    return {
      Scroller: { namespace: VirtualScroller, view: VirtualScrollerView },
      Message: { namespace: ChatMessage, view: ChatMessageView },
      Composer: { namespace: Composer, view: ChatComposerView },
      Index: { namespace: Index, view: ChatIndexView },
      Sidebar: { namespace: Sidebar, view: SidebarView },
      Peek: { namespace: Peek, view: ChatPeekView }
    } satisfies Kit.Of<Chat.Role>;
  }

  /** pages fetched beyond the window, each side — two, so a row is loaded before it can mount in the padding */
  static readonly PAGE_MARGIN = 2;
  /** within this many px of the end, the reader counts as at the bottom */
  static readonly BOTTOM_THRESHOLD_PX = 48;
  /** how long after a reply ends its last pin may keep converging */
  static readonly SEEK_RELEASE_MS = 1200;
  /** one paint later — a frame where there is one, a tick where there is not */
  static frame(): Promise<void> {
    return new Promise((resolve) =>
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => resolve())
        : setTimeout(resolve, 16)
    );
  }

  static bytes(count: number): string {
    if (count < 1024) return `${count} B`;
    if (count < 1024 * 1024) return `${(count / 1024).toFixed(0)} KB`;
    return `${(count / (1024 * 1024)).toFixed(1)} MB`;
  }

  static messageText(message: SessionLog.Message): string {
    return message.parts
      .map((part) =>
        part.kind === 'text' ? Markdown.Class.plain(part.text) : SessionLog.Class.partText(part)
      )
      .filter(Boolean)
      .join('\n');
  }

  static callCount(message: SessionLog.Message): number {
    return message.parts.reduce(
      (count, part) =>
        count +
        (part.kind === 'tool_call' ? 1 : part.kind === 'tool_batch' ? part.calls.length : 0),
      0
    );
  }

  /** a file's whole text where streams are missing: Blob.text, else a FileReader */
  static wholeText(file: File): Promise<string> {
    if (typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
      reader.readAsText(file);
    });
  }

  static tokenCount(message: SessionLog.Message): number {
    return message.parts.reduce(
      (count, part) =>
        count +
        (part.kind === 'text' || part.kind === 'thinking'
          ? ChatApi.Class.tokens(part.text).length
          : 0),
      0
    );
  }
  constructor(public props: Chat.Props = {}) {
    onMounted(() => this.load());
    onBeforeUnmount(() => this.dispose());
    watch(
      () => this.windowRange,
      (range) => this.onWindow(range)
    );
    watch(
      () => this.scrollOffset,
      () => this.onScroll()
    );
    watch(
      () => this.thumbDragging,
      (dragging) => this.onThumbDrag(dragging)
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Chat;
  }

  /** the kit is the class's; a subclass with its own `$kit` swaps the subtree */
  get kit() {
    return this.self.$kit;
  }

  /* ---- the look: closed here; ConfiguredChat is the layer that opens these to the kit and the settings ---- */

  get theme(): ChatSettings.Theme {
    return 'midnight';
  }

  get density(): ChatSettings.Density {
    return 'cozy';
  }

  get tree(): string {
    return 'shipped';
  }

  /** the one clock every loader reads — owned here, disposed here */
  protected get $clock() {
    return new Clock.Class();
  }

  get clock(): Clock.Model {
    return this.$clock;
  }

  /* ---- state ---- */

  get rows() {
    return shallowRef<Chat.Row[]>([]);
  }

  get meta() {
    return shallowRef<ChatApi.Meta | null>(null);
  }

  get indexRows() {
    return shallowRef<ChatApi.IndexEntry[]>([]);
  }

  get loadedPages() {
    return shallowRef<Set<number>>(new Set());
  }

  /** page → when its request started */
  get pendingPages() {
    return shallowRef<Map<number, number>>(new Map());
  }

  get requests() {
    return shallowRef<ChatApi.RequestLog[]>([]);
  }

  get bytesFetched() {
    return ref(0);
  }

  /** bumps when a message is changed in place (a streaming reply, a resolved call) */
  get revision() {
    return ref(0);
  }

  /** ids of the parts a reader opened — tool calls, batches, thinking */
  get expanded() {
    return shallowRef<Set<string>>(new Set());
  }

  get atBottom() {
    return ref(true);
  }

  /** whether the latest message's top is inside the viewport — the chip hides as soon as it is */
  get latestInView() {
    return ref(true);
  }

  /** the window reached while the thumb was held — fetched on the drop, not on the way */
  get heldWindow() {
    return shallowRef<{ start: number; end: number } | null>(null);
  }

  /** a landing is in flight — pin, paint, pin — so the next word's landing waits for it */
  get landing() {
    return ref(false);
  }

  /** the scrollbar's thumb is being dragged: rows fly past as skeletons and no page is asked for */
  get thumbDragging(): boolean {
    return Boolean(this.scroller.value?.scrollbarDragging);
  }

  get streaming() {
    return shallowRef<Chat.Streaming | null>(null);
  }

  get tokensStreamed() {
    return ref(0);
  }

  get source() {
    return ref<'sample' | 'file'>('sample');
  }

  get fileName() {
    return ref('');
  }

  get fileLines() {
    return ref(0);
  }

  get loadingFile() {
    return ref(false);
  }

  get loadingThread() {
    return ref(false);
  }

  get error() {
    return ref('');
  }

  /** the side panel that is open, if any */
  get sidebarTab() {
    return ref<Chat.SidebarTab | null>(null);
  }

  /** a search the index should take up when it opens: the text, or an empty string to focus the box */
  get searchRequest() {
    return ref<string | null>(null);
  }

  get indexOpen(): boolean {
    return this.sidebarTab.value === 'Index';
  }

  /** the row the reader last landed on through the index, for the mark */
  get focusedId() {
    return ref<string | null>(null);
  }

  // TEMPLATE-REF TARGET — the scroller's exposed instance
  get scroller() {
    return ref<VirtualScroller.Exposed<Chat.Row> | null>(null);
  }

  // TEMPLATE-REF TARGET — the scrollbar peek's exposed instance
  get peek() {
    return ref<Peek.Exposed | null>(null);
  }

  /* ---- derived ---- */

  get count(): number {
    return this.rows.value.length;
  }

  get loadedCount(): number {
    let loaded = 0;
    for (const row of this.rows.value) if (row.message) loaded++;
    return loaded;
  }

  get domRowCount(): number {
    return this.scroller.value?.visibleItems.length ?? 0;
  }

  get windowRange(): { start: number; end: number } {
    const range = this.scroller.value?.visibleIndex;
    return range ? { start: range.start, end: range.end } : { start: 0, end: 0 };
  }

  get scrollOffset(): number {
    return Number(this.scroller.value?.scrollPosition ?? 0);
  }

  get pageSize(): number {
    return this.meta.value?.pageSize ?? 200;
  }

  get pageCount(): number {
    return this.meta.value?.pages.length ?? 0;
  }

  get totalBytes(): number {
    return this.meta.value?.totalBytes ?? 0;
  }

  get isStreaming(): boolean {
    return this.streaming.value !== null;
  }

  get hasThread(): boolean {
    return this.count > 0;
  }

  get latestIndex(): number {
    return Math.max(0, this.count - 1);
  }

  get showsJumpToLatest(): boolean {
    return this.hasThread && !this.latestInView.value;
  }

  get pendingPageCount(): number {
    return this.pendingPages.value.size;
  }

  get isFetching(): boolean {
    return this.pendingPageCount > 0;
  }

  get isLoadingThread(): boolean {
    return this.loadingThread.value;
  }

  get isLoadingFile(): boolean {
    return this.loadingFile.value;
  }

  get hasError(): boolean {
    return this.error.value !== '';
  }

  get sourceLabel(): string {
    if (this.source.value === 'file')
      return `${this.fileName.value} · ${this.fileLines.value.toLocaleString('en-US')} lines, parsed in this tab`;
    const meta = this.meta.value;
    return meta
      ? `${meta.source.file.slice(0, 8)}… · a real Claude Code session, scrubbed`
      : 'loading the sample…';
  }

  get countLabel(): string {
    return this.count.toLocaleString('en-US');
  }

  get loadedLabel(): string {
    return `${this.loadedCount.toLocaleString('en-US')} / ${this.countLabel}`;
  }

  get pagesLabel(): string {
    return `${this.loadedPages.value.size} / ${this.pageCount}`;
  }

  get bytesLabel(): string {
    return this.self.bytes(this.bytesFetched.value);
  }

  get totalBytesLabel(): string {
    return this.self.bytes(this.totalBytes);
  }

  get requestCountLabel(): string {
    return String(this.requests.value.length);
  }

  get tokensLabel(): string {
    return this.tokensStreamed.value.toLocaleString('en-US');
  }

  get lastRequestLabel(): string {
    const last = this.requests.value[this.requests.value.length - 1];
    return last ? `${last.name} · ${this.self.bytes(last.bytes)} in ${last.ms}ms` : '';
  }

  get fetchingLabel(): string {
    return this.lastRequestLabel || 'fetching…';
  }

  get indexToggleLabel(): string {
    return this.indexOpen ? 'Close index' : 'Index';
  }

  get fileLoadLabel(): string {
    return this.loadingFile.value ? 'Parsing…' : 'Open a .jsonl';
  }

  /* ---- loading ---- */

  async load() {
    this.loadingThread.value = true;
    this.error.value = '';
    const release = this.clock.hold();
    try {
      const meta = await ChatApi.Class.meta();
      this.log(meta.log);
      this.meta.value = meta.data;
      const index = await ChatApi.Class.index();
      this.log(index.log);
      this.loadedPages.value = new Set();
      this.expanded.value = new Set();
      this.applyIndex(index.data);
      // the scroller lays the new rows out on the next tick; the jump needs that geometry
      await nextTick();
      this.jumpToLatest(false);
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : String(error);
    } finally {
      release();
      this.loadingThread.value = false;
    }
  }

  log(entry: ChatApi.RequestLog) {
    this.requests.value = [...this.requests.value, entry];
    this.bytesFetched.value += entry.bytes;
  }

  /** the index becomes the rows: every message a stub with its role and preview */
  applyIndex(index: ChatApi.IndexEntry[]) {
    this.indexRows.value = index;
    const pageSize = this.pageSize;
    this.rows.value = index.map((entry, at) => ({
      id: entry.id,
      body: '',
      position: String(at + 1),
      index: at,
      page: Math.floor(at / pageSize),
      role: entry.role,
      preview: entry.text,
      calls: entry.calls,
      at: entry.at,
      message: null
    }));
  }

  onWindow(range: { start: number; end: number }) {
    if (this.source.value !== 'sample' || !this.count) return;
    if (this.thumbDragging) {
      this.heldWindow.value = range;
      return;
    }
    this.heldWindow.value = null;
    const first = Math.max(0, Math.floor(range.start / this.pageSize) - this.self.PAGE_MARGIN);
    const last = Math.min(
      this.pageCount - 1,
      Math.floor(Math.max(range.end - 1, 0) / this.pageSize) + this.self.PAGE_MARGIN
    );
    for (let page = first; page <= last; page++) void this.ensurePage(page);
  }

  /** the thumb dropped: the window it landed on loads now */
  onThumbDrag(dragging: boolean) {
    if (dragging) return;
    const held = this.heldWindow.value;
    if (held) this.onWindow(held);
  }

  async ensurePage(page: number) {
    if (this.loadedPages.value.has(page) || this.pendingPages.value.has(page)) return;
    const pending = new Map(this.pendingPages.value);
    pending.set(page, Date.now());
    this.pendingPages.value = pending;
    const release = this.clock.hold();
    try {
      const result = await ChatApi.Class.page(page);
      this.log(result.log);
      this.integratePage(page, result.data);
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : String(error);
    } finally {
      release();
      const done = new Map(this.pendingPages.value);
      done.delete(page);
      this.pendingPages.value = done;
    }
  }

  /** a page's messages replace their stubs by index — identity holds, nothing above moves */
  integratePage(page: number, messages: SessionLog.Message[]) {
    const next = this.rows.value.slice();
    const start = page * this.pageSize;
    messages.forEach((message, offset) => {
      const at = start + offset;
      const row = next[at];
      if (!row) return;
      next[at] = { ...row, message, role: message.role, preview: row.preview };
    });
    this.rows.value = next;
    const loaded = new Set(this.loadedPages.value);
    loaded.add(page);
    this.loadedPages.value = loaded;
  }

  /** when a stub's page started loading — the loader's counter start */
  pageStartedAt(row: Chat.Row): number {
    return this.pendingPages.value.get(row.page) ?? this.clock.now.value;
  }

  isPagePending(row: Chat.Row): boolean {
    return this.pendingPages.value.has(row.page);
  }

  /* ---- the reader's position ---- */

  onScroll() {
    const scroller = this.scroller.value;
    if (!scroller) return;
    const extent = Number(scroller.scrollExtent ?? 0);
    const container = Number(scroller.containerOuterSize ?? 0);
    const offset = this.scrollOffset;
    this.atBottom.value =
      extent <= container || offset + container >= extent - this.self.BOTTOM_THRESHOLD_PX;
    // the chip points at the latest message: once its top is on screen the reader has reached
    // it, however long it runs below the fold
    const latestTop = scroller.getIndexPosition?.(this.latestIndex);
    this.latestInView.value =
      this.atBottom.value ||
      (typeof latestTop === 'number' &&
        latestTop < offset + container - this.self.BOTTOM_THRESHOLD_PX);
  }

  /** the thread hands the peek every pointer move — it decides whether the track is under it */
  onThreadPointerMove(event: PointerEvent) {
    this.peek.value?.onThreadPointerMove(event);
  }

  onThreadPointerLeave() {
    this.peek.value?.onThreadPointerLeave();
  }

  jumpTo(index: number, animate = true) {
    if (!this.count) return;
    const target = Math.max(0, Math.min(this.latestIndex, index));
    this.focusedId.value = this.rows.value[target]?.id ?? null;
    this.scroller.value?.scrollToIndex(target, undefined, animate, 16);
  }

  /**
   * The sent message is on screen before the reply's wait begins: the
   * scroller lays a new row out on the next tick and measures it on its
   * first paint, so a single jump lands short of the end — jump, let it
   * paint, jump again onto the measured geometry.
   */
  async landLatest() {
    await nextTick();
    this.jumpToLatest(false);
    await this.self.frame();
    this.jumpToLatest(false);
  }

  jumpToLatest(animate = true) {
    const scroller = this.scroller.value;
    if (!scroller || !this.count) return;
    scroller.scrollToIndex(this.latestIndex, undefined, animate, 0);
    this.atBottom.value = true;
    this.latestInView.value = true;
  }

  /**
   * A streaming reply grows: keep its newest line in view while the reader
   * is at the bottom. The pin is the thread's END — the last row's bottom
   * at the viewport's bottom — never the row's top, so a reply taller than
   * the viewport shows where it is being written, not where it began.
   */
  pinToBottom() {
    if (!this.atBottom.value) return;
    const scroller = this.scroller.value;
    if (!scroller) return;
    const extent = Number(scroller.scrollExtent ?? 0);
    const container = Number(scroller.containerOuterSize ?? 0);
    scroller.setScrollPosition(-Math.max(0, extent - container), false, true, false);
  }

  /**
   * The reply's last pin lands on its final layout: 'done' contracts the
   * calls into batches, the row shrinks on the next render and measures
   * on the paint after — a pin before that leaves the viewport past the
   * new end, on nothing. Pin, let it paint, pin again.
   */
  async settleAtBottom() {
    if (this.landing.value) return;
    this.landing.value = true;
    try {
      this.pinToBottom();
      await nextTick();
      await this.self.frame();
      this.pinToBottom();
      await this.self.frame();
      this.pinToBottom();
    } finally {
      this.landing.value = false;
    }
  }

  isFocused(row: Chat.Row): boolean {
    return this.focusedId.value === row.id;
  }

  /* ---- text, expansion ---- */

  /** the plain text a row projects — copy reads it for rows the DOM never held */
  rowText(row: Chat.Row): string {
    if (!row.message) return '';
    return this.self.messageText(row.message);
  }

  isExpanded(id: string): boolean {
    return this.expanded.value.has(id);
  }

  /** the reader acts on the content: a seek still converging must not re-pin under them */
  toggle(id: string) {
    this.scroller.value?.cancelSeek();
    const next = new Set(this.expanded.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded.value = next;
  }

  expand(id: string) {
    if (this.isExpanded(id)) return;
    this.toggle(id);
  }

  toggleIndex() {
    this.toggleSidebar('Index');
  }

  toggleSidebar(tab: Chat.SidebarTab) {
    this.sidebarTab.value = this.sidebarTab.value === tab ? null : tab;
  }

  openSidebar(tab: Chat.SidebarTab) {
    this.sidebarTab.value = tab;
  }

  closeSidebar() {
    this.sidebarTab.value = null;
  }

  /** open the index on a search: a file's name from the files panel, or nothing to focus the box */
  search(text: string) {
    this.searchRequest.value = text;
    this.openSidebar('Index');
  }

  closeIndex() {
    this.closeSidebar();
  }

  /** the composer's search button and ⌘K: open the index to search, or close it when it is the open panel */
  toggleSearch() {
    if (this.sidebarTab.value === 'Index') this.closeSidebar();
    else this.search('');
  }

  /* ---- sending and the replayed reply ---- */

  /** the user's message joins the thread, then a real turn replays as the reply */
  async send(request: Chat.Request) {
    if (this.isStreaming) return;
    const parts: SessionLog.Part[] = [];
    if (request.text.trim()) parts.push({ kind: 'text', text: request.text.trim() });
    parts.push(...request.attachments);
    if (!parts.length) return;
    const now = Date.now();
    this.append({
      id: `local-user-${now}`,
      index: this.count,
      role: 'user',
      timestamp: now,
      parts,
      sidechain: false
    });
    await this.landLatest();
    const source = await this.pickSource(request.text);
    await this.reply(source, ChatApi.Class.model(request.model));
  }

  append(message: SessionLog.Message): Chat.Row {
    const row: Chat.Row = {
      id: message.id,
      body: '',
      position: String(this.count + 1),
      index: this.count,
      page: -1,
      role: message.role,
      preview: this.self.messageText(message).replace(/\s+/g, ' ').slice(0, 96),
      calls: this.self.callCount(message),
      at: message.timestamp,
      message
    };
    this.rows.value = [...this.rows.value, row];
    this.indexRows.value = [
      ...this.indexRows.value,
      {
        id: row.id,
        role: message.role,
        text: row.preview,
        calls: this.self.callCount(message),
        at: message.timestamp
      }
    ];
    return row;
  }

  /**
   * The turn to replay: a loaded assistant message with text, preferring
   * one whose words meet the draft's; the last loaded page otherwise.
   */
  async pickSource(text: string): Promise<SessionLog.Message> {
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);
    const candidates = this.rows.value
      .map((row) => row.message)
      .filter((message): message is SessionLog.Message =>
        Boolean(message && message.role === 'assistant' && !message.id.startsWith('local-'))
      );
    const withText = candidates.filter((message) =>
      message.parts.some((part) => part.kind === 'text')
    );
    const pool = withText.length ? withText : candidates;
    if (!pool.length)
      return {
        id: 'fallback',
        index: 0,
        role: 'assistant',
        timestamp: Date.now(),
        parts: [
          { kind: 'text', text: 'No turn is loaded yet to replay — scroll the thread first.' }
        ],
        sidechain: false
      };
    let best = pool[Math.floor(ChatApi.Class.random() * pool.length)];
    let bestScore = 0;
    for (const message of pool) {
      const haystack = this.self.messageText(message).toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = message;
      }
    }
    return best;
  }

  async reply(source: SessionLog.Message, model: ChatApi.Model) {
    const startedAt = Date.now();
    const message: SessionLog.Message = {
      id: `local-reply-${startedAt}`,
      index: this.count,
      role: 'assistant',
      timestamp: startedAt,
      parts: [],
      sidechain: false,
      model: model.label,
      replay: true
    };
    const row = this.append(message);
    const controller = new AbortController();
    const release = this.clock.hold();
    const streaming: Chat.Streaming = {
      row,
      message,
      startedAt,
      controller,
      release,
      firstTokenAt: null,
      lastPinAt: 0,
      thinking: null,
      sourceId: source.id
    };
    this.streaming.value = streaming;
    try {
      for await (const event of ChatApi.Class.stream(source, model, controller.signal))
        this.applyEvent(streaming, event);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        this.error.value = error instanceof Error ? error.message : String(error);
    } finally {
      message.durationMs = Date.now() - startedAt;
      message.usage = { output_tokens: this.self.tokenCount(message) };
      this.refreshIndexRow(message);
      release();
      this.streaming.value = null;
      this.bump();
      void this.settleAtBottom();
      // a card the reader opens later is theirs to open where it is
      setTimeout(() => this.scroller.value?.cancelSeek(), this.self.SEEK_RELEASE_MS);
    }
  }

  applyEvent(streaming: Chat.Streaming, event: ChatApi.StreamEvent) {
    const { message } = streaming;
    const last = message.parts[message.parts.length - 1];
    switch (event.type) {
      case 'thinking_start': {
        const part: SessionLog.ThinkingPart = {
          kind: 'thinking',
          text: '',
          durationMs: null,
          startedAt: Date.now()
        };
        message.parts.push(part);
        streaming.thinking = part;
        break;
      }
      case 'thinking_token':
        if (streaming.thinking) streaming.thinking.text += event.text;
        break;
      case 'thinking_end':
        if (streaming.thinking)
          streaming.thinking.durationMs = Date.now() - (streaming.thinking.startedAt ?? Date.now());
        streaming.thinking = null;
        break;
      case 'token':
        if (streaming.firstTokenAt === null) streaming.firstTokenAt = Date.now();
        this.tokensStreamed.value++;
        if (last && last.kind === 'text') last.text += event.text;
        else message.parts.push({ kind: 'text', text: event.text });
        break;
      case 'tool_call': {
        const call: SessionLog.ToolCall = {
          ...event.call,
          state: 'running',
          result: null,
          durationMs: null,
          startedAt: Date.now(),
          children: null
        };
        message.parts.push({ kind: 'tool_call', call });
        break;
      }
      case 'tool_result': {
        const part = message.parts.find(
          (candidate): candidate is SessionLog.ToolCallPart =>
            candidate.kind === 'tool_call' && candidate.call.id === event.call.id
        );
        if (part) {
          part.call.result = event.call.result;
          part.call.state = event.call.state === 'failed' ? 'failed' : 'done';
          part.call.durationMs = Date.now() - part.call.startedAt;
          part.call.children = event.call.children;
        }
        break;
      }
      case 'done':
        this.contract(message);
        break;
    }
    this.bump();
    // a card or a thought is a whole block arriving at once: land it after it has measured, so the
    // reader sees the call and its spinner the moment it appears; words pin on a cadence
    if (
      event.type === 'tool_call' ||
      event.type === 'tool_result' ||
      event.type === 'thinking_start' ||
      event.type === 'thinking_end'
    ) {
      streaming.lastPinAt = Date.now();
      void this.settleAtBottom();
      return;
    }
    // every word lands after its line has measured, so the caret is never left under the fold; a landing
    // already in flight covers the words that arrive during its paints
    streaming.lastPinAt = Date.now();
    void this.settleAtBottom();
  }

  /** when the reply is done, its runs of calls contract to batches like any loaded turn */
  contract(message: SessionLog.Message) {
    const parts: SessionLog.Part[] = [];
    let calls: SessionLog.ToolCall[] = [];
    const flush = () => {
      if (calls.length >= 2) parts.push({ kind: 'tool_batch', calls, messageIds: [message.id] });
      else for (const call of calls) parts.push({ kind: 'tool_call', call });
      calls = [];
    };
    for (const part of message.parts) {
      if (part.kind === 'tool_call') calls.push(part.call);
      else {
        flush();
        parts.push(part);
      }
    }
    flush();
    message.parts = parts;
  }

  /** a reply's index row learns its final preview and tool count once the stream ends */
  refreshIndexRow(message: SessionLog.Message) {
    const preview = this.self.messageText(message).replace(/\s+/g, ' ').slice(0, 96);
    this.indexRows.value = this.indexRows.value.map((entry) =>
      entry.id === message.id
        ? { ...entry, text: preview, calls: this.self.callCount(message) }
        : entry
    );
    const at = this.rows.value.findIndex((row) => row.id === message.id);
    if (at >= 0) {
      const next = this.rows.value.slice();
      next[at] = { ...next[at], preview };
      this.rows.value = next;
    }
  }

  bump() {
    this.revision.value++;
  }

  stopStreaming() {
    this.streaming.value?.controller.abort();
  }

  /* ---- a reader's own file ---- */

  /** parse a session file from disk as a stream of lines; nothing leaves the tab */
  async open(file: File) {
    this.stopStreaming();
    this.loadingFile.value = true;
    this.error.value = '';
    const release = this.clock.hold();
    try {
      const parser = new SessionParser.Class({ scrub: true });
      if (typeof file.stream === 'function' && typeof TextDecoderStream !== 'undefined') {
        const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
        let carry = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          carry += value;
          const lines = carry.split('\n');
          carry = lines.pop() ?? '';
          for (const line of lines) parser.line(line);
          this.fileLines.value = parser.lines;
        }
        if (carry) parser.line(carry);
      } else for (const line of (await this.self.wholeText(file)).split('\n')) parser.line(line);
      const messages = parser.finish();
      if (!messages.length) throw new Error('No conversation records in that file.');
      this.adoptMessages(messages, file.name, parser.lines);
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : String(error);
    } finally {
      release();
      this.loadingFile.value = false;
    }
  }

  adoptMessages(messages: SessionLog.Message[], name: string, lines: number) {
    this.source.value = 'file';
    this.fileName.value = name;
    this.fileLines.value = lines;
    this.meta.value = null;
    this.loadedPages.value = new Set();
    this.pendingPages.value = new Map();
    this.expanded.value = new Set();
    this.indexRows.value = messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: this.self.messageText(message).replace(/\s+/g, ' ').slice(0, 96),
      calls: this.self.callCount(message),
      at: message.timestamp
    }));
    this.rows.value = messages.map((message, at) => ({
      id: message.id,
      body: '',
      position: String(at + 1),
      index: at,
      page: -1,
      role: message.role,
      preview: this.indexRows.value[at].text,
      calls: this.indexRows.value[at].calls,
      at: message.timestamp,
      message
    }));
    void nextTick(() => this.jumpToLatest(false));
  }

  /* ---- export ---- */

  /** the messages for a set of ids, in thread order, their pages loaded first */
  async messagesFor(ids: Set<string>): Promise<SessionLog.Message[]> {
    const rows = this.rows.value.filter((row) => ids.has(row.id));
    const pages = new Set(
      rows.filter((row) => !row.message && row.page >= 0).map((row) => row.page)
    );
    await Promise.all([...pages].map((page) => this.ensurePage(page)));
    return this.rows.value
      .filter((row) => ids.has(row.id) && row.message)
      .map((row) => row.message as SessionLog.Message);
  }

  /* ---- teardown ---- */

  dispose() {
    this.stopStreaming();
    this.clock.dispose();
  }
}

export namespace Chat {
  export const $Class = Static($Chat);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Model = InstanceType<typeof Class>;
  export type Role = 'Scroller' | 'Message' | 'Composer' | 'Index' | 'Sidebar' | 'Peek';
  export type SidebarTab = 'Index' | 'Files' | 'Settings';

  export interface Props {
    dark?: boolean;
    /** the entry the root was rendered through: the class it constructs, the consumer's props */
    kit?: Kit.Entry;
  }

  /** one row of the scroller: a stub until its page lands, then the message */
  export interface Row extends VirtualScroller.BaseItem {
    index: number;
    page: number;
    role: SessionLog.Role;
    preview: string;
    /** how many tool calls it made — known from the index before the page loads */
    calls: number;
    /** when it was said — known from the index before the page loads */
    at: number;
    message: SessionLog.Message | null;
  }

  export interface Request {
    text: string;
    model: string;
    attachments: SessionLog.AttachmentPart[];
  }

  export interface Streaming {
    row: Row;
    message: SessionLog.Message;
    startedAt: number;
    firstTokenAt: number | null;
    lastPinAt: number;
    controller: AbortController;
    release: () => void;
    thinking: SessionLog.ThinkingPart | null;
    sourceId: string;
  }

  export type ExportForm = 'markdown' | 'plain' | 'jsonl';
}
