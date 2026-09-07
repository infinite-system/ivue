import { Reactive } from 'ivue';
import { Static } from 'ivue/extras';
import { nextTick, ref, shallowRef, watch } from 'vue';
import {
  PRESS_ENTRIES,
  type PressChannel,
  type PressEntry,
} from './release-calendar.data';
import { Api } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { PressKinds } from '../press/PressKinds';

// The release calendar — six months of planned placements rendered as a
// month grid, checkable per entry, each entry opening a dialog that holds
// the copy to post. The PLAN is committed data (release-calendar.data.ts);
// the PROGRESS is the user's own and lives in localStorage, so checking a
// box never needs a deploy. The COPY is the press's rows, read from the
// Worker by the entry's source keys when the dialog opens — the calendar
// says when, the press says what. Rendering is observation-bounded: only
// the open month materializes day cells.
class $ReleaseCalendarModel {
  protected static readonly STORAGE_KEY = 'ivue-press-done-v1';
  static readonly COPIED_MS = 1400;
  static readonly SCHEDULE_HOUR = 9;
  static readonly WEEKDAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  static readonly CHANNEL_LABELS: Record<PressChannel, string> = {
    prep: 'prep',
    hn: 'Hacker News',
    reddit: 'Reddit',
    x: 'X',
    'newsletter-pitch': 'newsletter',
    podcast: 'podcast',
    creator: 'creator',
    gallery: 'gallery',
    directory: 'directory',
    community: 'community',
    'article-platform': 'article platform',
    intl: 'international',
    conference: 'conference',
  };
  static readonly WAVE_LABELS: Record<1 | 2, string> = {
    1: 'wave 1 · Vue launch',
    2: 'wave 2 · agents story',
  };

  constructor() {
    this.restoreDone();
    watch(
      () => this.openId.value,
      (id, previousId) => this.onOpenChanged(id, previousId),
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ReleaseCalendarModel;
  }

  protected get $app() {
    return AppStore.Class.use();
  }

  /* ---- state ---- */

  /** first day of the month currently on screen */
  get monthCursor() {
    return ref(this.initialCursor());
  }

  /** ids of entries the user marked posted */
  get doneIds() {
    return shallowRef<ReadonlySet<string>>(new Set());
  }

  /** channel filter — empty means all */
  get channelFilter() {
    return ref<PressChannel | ''>('');
  }

  /** wave filter — 0 means both */
  get waveFilter() {
    return ref<0 | 1 | 2>(0);
  }

  /** hide entries already done */
  get pendingOnly() {
    return ref(false);
  }

  /** entry open in the dialog */
  get openId() {
    return ref<string | null>(null);
  }

  /** the press rows behind the open entry, read by its source keys */
  get openExpressions() {
    return shallowRef<Api.PressExpression[]>([]);
  }

  get loadingCopy() {
    return ref(false);
  }

  /** which of the open entry's expressions is showing */
  get activeExpressionId() {
    return ref<number | null>(null);
  }

  /** key of the text copied a moment ago — its button reads Copied */
  get copiedKey() {
    return ref<string | null>(null);
  }

  /** the dialog element — focused on open */
  get dialogEl() {
    return ref<HTMLElement | null>(null);
  }

  /** the card that opened the dialog — focus returns there on close */
  get returnFocusEl() {
    return shallowRef<HTMLElement | null>(null);
  }

  /* ---- derivations (plain getters — zero bytes) ---- */

  get weekdays(): string[] {
    return this.self.WEEKDAYS;
  }

  get entries(): PressEntry[] {
    return PRESS_ENTRIES;
  }

  get filteredEntries(): PressEntry[] {
    const channel = this.channelFilter.value;
    const wave = this.waveFilter.value;
    const pending = this.pendingOnly.value;
    const done = this.doneIds.value;
    return this.entries.filter((entry) => {
      if (channel && entry.channel !== channel) return false;
      if (wave && entry.wave !== wave) return false;
      if (pending && done.has(entry.id)) return false;
      return true;
    });
  }

  /** the open month's entries, keyed by day-of-month */
  get entriesByDay(): Map<number, PressEntry[]> {
    const cursor = this.monthCursor.value;
    const byDay = new Map<number, PressEntry[]>();
    for (const entry of this.filteredEntries) {
      const date = new Date(entry.date + 'T00:00:00');
      if (
        date.getFullYear() !== cursor.getFullYear() ||
        date.getMonth() !== cursor.getMonth()
      )
        continue;
      const day = date.getDate();
      const bucket = byDay.get(day);
      if (bucket) bucket.push(entry);
      else byDay.set(day, [entry]);
    }
    return byDay;
  }

  /** grid cells for the open month: leading blanks + day numbers */
  get monthCells(): ReleaseCalendarModel.Cell[] {
    const cursor = this.monthCursor.value;
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    // Monday-first grid
    const lead = (first.getDay() + 6) % 7;
    const cells: ReleaseCalendarModel.Cell[] = [];
    for (let blank = 0; blank < lead; blank++)
      cells.push({ day: 0, iso: '', entries: [] });
    for (let day = 1; day <= daysInMonth; day++)
      cells.push({
        day,
        iso: this.isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), day)),
        entries: this.entriesByDay.get(day) ?? [],
      });
    return cells;
  }

  get monthLabel(): string {
    return this.monthCursor.value.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  get todayIso(): string {
    return this.isoDate(new Date());
  }

  get monthDoneCount(): number {
    const done = this.doneIds.value;
    return this.openMonthEntries.filter((entry) => done.has(entry.id)).length;
  }

  get monthTotalCount(): number {
    return this.openMonthEntries.length;
  }

  get openMonthEntries(): PressEntry[] {
    const byDay = this.entriesByDay;
    const flat: PressEntry[] = [];
    for (const bucket of byDay.values()) flat.push(...bucket);
    return flat;
  }

  get totalDoneCount(): number {
    const done = this.doneIds.value;
    return this.entries.filter((entry) => done.has(entry.id)).length;
  }

  get totalCount(): number {
    return this.entries.length;
  }

  get openEntry(): PressEntry | null {
    const id = this.openId.value;
    if (!id) return null;
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  get isDialogOpen(): boolean {
    return this.openEntry !== null;
  }

  get activeExpression(): Api.PressExpression | null {
    const rows = this.openExpressions.value;
    const id = this.activeExpressionId.value;
    return rows.find((row) => row.id === id) ?? rows[0] ?? null;
  }

  get hasCopyTabs(): boolean {
    return this.openExpressions.value.length > 1;
  }

  get hasCopy(): boolean {
    return this.openExpressions.value.length > 0;
  }

  /** the live segments of a thread, else null */
  get activeSegments(): Api.PressExpression[] | null {
    const row = this.activeExpression;
    if (!row?.children) return null;
    return row.children.filter((child) => !child.skipped);
  }

  get activeBody(): string {
    const row = this.activeExpression;
    if (!row) return '';
    if (row.children) return (this.activeSegments ?? []).map((child) => child.body).join('\n\n');
    return row.body;
  }

  get activeStatusLabel(): string {
    const row = this.activeExpression;
    return row ? PressKinds.Class.statusLabel(row.status) : '';
  }

  get activeStatusTone(): string {
    const row = this.activeExpression;
    return row ? `state-${row.status}` : '';
  }

  /** one placement, one expression: the dialog can schedule and mark it directly */
  get singleExpression(): Api.PressExpression | null {
    const rows = this.openExpressions.value;
    return rows.length === 1 ? rows[0] : null;
  }

  get canScheduleHere(): boolean {
    return this.singleExpression?.status === 'approved';
  }

  get scheduleHereLabel(): string {
    const entry = this.openEntry;
    return entry ? `Schedule for ${this.dateLabel(entry)}` : 'Schedule';
  }

  get openEntryIsDone(): boolean {
    const entry = this.openEntry;
    return entry !== null && this.isDone(entry.id);
  }

  get openEntryDoneLabel(): string {
    return this.openEntryIsDone ? 'Posted' : 'Mark as posted';
  }

  get channels(): PressChannel[] {
    const seen = new Set<PressChannel>();
    for (const entry of this.entries) seen.add(entry.channel);
    return [...seen].sort();
  }

  get hasPriorMonth(): boolean {
    return this.monthOffset(this.monthCursor.value) > 0;
  }

  get hasNextMonth(): boolean {
    const months = this.planMonths;
    return this.monthOffset(this.monthCursor.value) < months.length - 1;
  }

  get hasTodayInPlan(): boolean {
    return this.monthOffset(this.initialCursor()) >= 0;
  }

  /** every month the plan spans, first-of-month dates ascending */
  get planMonths(): Date[] {
    const stamps = new Set<number>();
    for (const entry of this.entries) {
      const date = new Date(entry.date + 'T00:00:00');
      stamps.add(new Date(date.getFullYear(), date.getMonth(), 1).getTime());
    }
    return [...stamps].sort((left, right) => left - right).map((stamp) => new Date(stamp));
  }

  /** one row per venue: planned vs posted, which articles, last post date */
  get venueStats(): ReleaseCalendarModel.VenueStat[] {
    const done = this.doneIds.value;
    const byVenue = new Map<string, ReleaseCalendarModel.VenueStat>();
    for (const entry of this.entries) {
      let stat = byVenue.get(entry.venue);
      if (!stat) {
        stat = {
          venue: entry.venue,
          url: entry.url,
          channel: entry.channel,
          planned: 0,
          posted: 0,
          articles: [],
          lastPosted: '',
        };
        byVenue.set(entry.venue, stat);
      }
      stat.planned++;
      if (done.has(entry.id)) {
        stat.posted++;
        stat.articles.push(entry.article);
        if (entry.date > stat.lastPosted) stat.lastPosted = entry.date;
      }
    }
    return [...byVenue.values()].sort(
      (left, right) => right.posted - left.posted || right.planned - left.planned,
    );
  }

  /** one row per article: where it has been posted so far */
  get articleStats(): ReleaseCalendarModel.ArticleStat[] {
    const done = this.doneIds.value;
    const byArticle = new Map<string, ReleaseCalendarModel.ArticleStat>();
    for (const entry of this.entries) {
      let stat = byArticle.get(entry.article);
      if (!stat) {
        stat = { article: entry.article, planned: 0, posted: 0, venues: [] };
        byArticle.set(entry.article, stat);
      }
      stat.planned++;
      if (done.has(entry.id)) {
        stat.posted++;
        stat.venues.push(entry.venue);
      }
    }
    return [...byArticle.values()].sort(
      (left, right) => right.posted - left.posted || right.planned - left.planned,
    );
  }

  /* ---- methods ---- */

  initialCursor(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  monthOffset(cursor: Date): number {
    return this.planMonths.findIndex(
      (month) =>
        month.getFullYear() === cursor.getFullYear() &&
        month.getMonth() === cursor.getMonth(),
    );
  }

  priorMonth() {
    const index = this.monthOffset(this.monthCursor.value);
    if (index > 0) this.monthCursor.value = this.planMonths[index - 1];
  }

  nextMonth() {
    const index = this.monthOffset(this.monthCursor.value);
    if (index >= 0 && index < this.planMonths.length - 1)
      this.monthCursor.value = this.planMonths[index + 1];
  }

  goToToday() {
    if (this.hasTodayInPlan) this.monthCursor.value = this.initialCursor();
  }

  isToday(cell: ReleaseCalendarModel.Cell): boolean {
    return cell.iso === this.todayIso;
  }

  isDone(id: string): boolean {
    return this.doneIds.value.has(id);
  }

  toggleDone(id: string) {
    const next = new Set(this.doneIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.doneIds.value = next;
    this.persistDone();
  }

  /** the dialog's checkbox: the calendar's mark, and the ledger when one expression is behind the entry */
  async toggleOpenDone() {
    const entry = this.openEntry;
    if (!entry) return;
    const wasDone = this.isDone(entry.id);
    this.toggleDone(entry.id);
    const single = this.singleExpression;
    if (!wasDone && single && single.status !== 'sent') {
      try {
        const fresh = await Api.Class.pressAct(single.id, 'sent', {
          venue: entry.venue,
          calendarId: entry.id,
        });
        this.replaceExpression(fresh);
      } catch (error) {
        this.$app.reportFailure(error);
      }
    }
  }

  /** open the entry's dialog; remembers the card so focus can return */
  open(id: string, event?: Event) {
    const target = event?.currentTarget as HTMLElement | null | undefined;
    // duck-typed so the model runs where no DOM exists (node tests)
    this.returnFocusEl.value =
      target && typeof target.focus === 'function' ? target : null;
    this.activeExpressionId.value = null;
    this.copiedKey.value = null;
    this.openExpressions.value = [];
    this.openId.value = id;
    this.loadCopy();
  }

  /** the press rows behind the open entry, one lookup per source key, deduped */
  async loadCopy() {
    const entry = this.openEntry;
    if (!entry || !entry.copy.length) return;
    this.loadingCopy.value = true;
    try {
      const seen = new Map<number, Api.PressExpression>();
      for (const key of entry.copy) {
        for (const row of await Api.Class.pressExpressionsForSource(key))
          if (!seen.has(row.id)) seen.set(row.id, row);
      }
      if (this.openId.value === entry.id) this.openExpressions.value = [...seen.values()];
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loadingCopy.value = false;
    }
  }

  replaceExpression(fresh: Api.PressExpression) {
    this.openExpressions.value = this.openExpressions.value.map((row) =>
      row.id === fresh.id ? fresh : row,
    );
  }

  closeDetail() {
    this.openId.value = null;
  }

  isOpen(id: string): boolean {
    return this.openId.value === id;
  }

  onDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') this.closeDetail();
  }

  async onOpenChanged(id: string | null, previousId: string | null) {
    await nextTick();
    if (id) this.dialogEl.value?.focus();
    else if (previousId) this.returnFocusEl.value?.focus();
  }

  showExpression(id: number) {
    this.activeExpressionId.value = id;
  }

  isExpressionActive(row: Api.PressExpression): boolean {
    return this.activeExpression?.id === row.id;
  }

  expressionTitle(row: Api.PressExpression): string {
    const venue = row.venue && row.venue !== 'X' ? ` · ${row.venue}` : '';
    return `${PressKinds.Class.label(row.kind)}${venue}`;
  }

  openInPress() {
    const row = this.activeExpression;
    if (row) this.$app.openPiece(row.pieceId);
  }

  /** the entry's day at the launch hour, local */
  async scheduleHere() {
    const entry = this.openEntry;
    const single = this.singleExpression;
    if (!entry || !single) return;
    const dueAt = Math.floor(
      new Date(`${entry.date}T${String(this.self.SCHEDULE_HOUR).padStart(2, '0')}:00:00`).getTime() / 1000,
    );
    try {
      const fresh = await Api.Class.pressAct(single.id, 'schedule', { dueAt });
      this.replaceExpression(fresh);
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  /* ---- labels ---- */

  entryTone(entry: PressEntry): string {
    return this.isDone(entry.id) ? 'done' : `ch-${entry.channel}`;
  }

  channelTone(entry: PressEntry): string {
    return `ch-${entry.channel}`;
  }

  orDash(text: string): string {
    return text || '—';
  }

  listLabel(items: string[]): string {
    return this.orDash(items.join(', '));
  }

  channelLabel(channel: PressChannel): string {
    return this.self.CHANNEL_LABELS[channel] ?? channel;
  }

  waveLabel(entry: PressEntry): string {
    return this.self.WAVE_LABELS[entry.wave];
  }

  effortLabel(entry: PressEntry): string {
    const minutes = entry.effortMin;
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  }

  dateLabel(entry: PressEntry): string {
    return new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  doneAriaLabel(entry: PressEntry): string {
    return `${this.isDone(entry.id) ? 'Posted' : 'Not posted'}: ${entry.venue}`;
  }

  openAriaLabel(entry: PressEntry): string {
    return `Open ${entry.venue} — ${entry.angle}`;
  }

  hasArticle(entry: PressEntry): boolean {
    return entry.article !== 'n/a' && entry.article !== 'voice';
  }

  copyLabel(key: string): string {
    return this.copiedKey.value === key ? 'Copied ✓' : 'Copy';
  }

  isCopied(key: string): boolean {
    return this.copiedKey.value === key;
  }

  segmentKey(child: Api.PressExpression): string {
    return `segment-${child.id}`;
  }

  segmentLabel(index: number, count: number): string {
    return `${index + 1} / ${count}`;
  }

  /* ---- clipboard ---- */

  async copyActive() {
    await this.copyText('all', this.activeBody);
  }

  async copySegment(child: Api.PressExpression) {
    await this.copyText(this.segmentKey(child), child.body);
  }

  async copyText(key: string, text: string) {
    if (!(await this.writeClipboard(text))) return;
    this.copiedKey.value = key;
    setTimeout(() => this.clearCopied(key), this.self.COPIED_MS);
  }

  clearCopied(key: string) {
    if (this.copiedKey.value === key) this.copiedKey.value = null;
  }

  /** clipboard API where it exists, the selection fallback elsewhere */
  async writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to the selection path */
    }
    if (typeof document === 'undefined') return false;
    // the selection path moves focus into a scratch textarea — hand it
    // back afterwards so Escape still reaches the dialog
    const focused = document.activeElement as HTMLElement | null;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    textarea.remove();
    focused?.focus();
    return copied;
  }

  /* ---- persistence ---- */

  persistDone() {
    try {
      localStorage.setItem(
        this.self.STORAGE_KEY,
        JSON.stringify([...this.doneIds.value]),
      );
    } catch {
      /* storage unavailable (private mode) — checkmarks stay in-memory */
    }
  }

  restoreDone() {
    try {
      const raw = localStorage.getItem(this.self.STORAGE_KEY);
      if (raw) this.doneIds.value = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* corrupted or unavailable — start empty */
    }
  }
}

export namespace ReleaseCalendarModel {
  export const $Class = Static($ReleaseCalendarModel); // raw — children extend this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  export interface Cell {
    /** 0 = leading blank cell */
    day: number;
    /** YYYY-MM-DD, empty for a blank */
    iso: string;
    entries: PressEntry[];
  }

  export interface VenueStat {
    venue: string;
    url: string;
    channel: string;
    planned: number;
    posted: number;
    articles: string[];
    lastPosted: string;
  }

  export interface ArticleStat {
    article: string;
    planned: number;
    posted: number;
    venues: string[];
  }
}
