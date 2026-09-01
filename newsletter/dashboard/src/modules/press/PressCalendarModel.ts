import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import {
  PRESS_ENTRIES,
  type PressChannel,
  type PressEntry,
} from './press-calendar.data';

// The press calendar — six months of planned submissions rendered as a
// month grid, checkable per entry. The PLAN is committed data
// (press-calendar.data.ts); the PROGRESS is the user's own and lives in
// localStorage, so checking a box never needs a deploy. Rendering is
// observation-bounded: only the open month materializes day cells.
class $PressCalendarModel {
  protected static readonly STORAGE_KEY = 'ivue-press-done-v1';

  constructor() {
    this.restoreDone();
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

  /** entry opened in the detail rail */
  get openId() {
    return ref<string | null>(null);
  }

  /** calendar grid or the venue/article stats tables */
  get viewMode() {
    return ref<'calendar' | 'venues'>('calendar');
  }

  /* ---- derivations (plain getters — zero bytes) ---- */

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
  get monthCells(): PressCalendarModel.Cell[] {
    const cursor = this.monthCursor.value;
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    // Monday-first grid
    const lead = (first.getDay() + 6) % 7;
    const cells: PressCalendarModel.Cell[] = [];
    for (let blank = 0; blank < lead; blank++)
      cells.push({ day: 0, entries: [] });
    for (let day = 1; day <= daysInMonth; day++)
      cells.push({ day, entries: this.entriesByDay.get(day) ?? [] });
    return cells;
  }

  get monthLabel(): string {
    return this.monthCursor.value.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
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

  /** every month the plan spans, first-of-month dates ascending */
  get planMonths(): Date[] {
    const stamps = new Set<number>();
    for (const entry of this.entries) {
      const date = new Date(entry.date + 'T00:00:00');
      stamps.add(new Date(date.getFullYear(), date.getMonth(), 1).getTime());
    }
    return [...stamps].sort((a, b) => a - b).map((stamp) => new Date(stamp));
  }

  /** one row per venue: planned vs posted, which articles, last post date */
  get venueStats(): PressCalendarModel.VenueStat[] {
    const done = this.doneIds.value;
    const byVenue = new Map<string, PressCalendarModel.VenueStat>();
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
      (a, b) => b.posted - a.posted || b.planned - a.planned,
    );
  }

  /** one row per article: where it has been posted so far */
  get articleStats(): PressCalendarModel.ArticleStat[] {
    const done = this.doneIds.value;
    const byArticle = new Map<string, PressCalendarModel.ArticleStat>();
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
      (a, b) => b.posted - a.posted || b.planned - a.planned,
    );
  }

  get isCalendarMode(): boolean {
    return this.viewMode.value === 'calendar';
  }

  get isVenuesMode(): boolean {
    return this.viewMode.value === 'venues';
  }

  /* ---- methods ---- */

  showCalendar() {
    this.viewMode.value = 'calendar';
  }

  showVenues() {
    this.viewMode.value = 'venues';
  }

  initialCursor(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
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

  open(id: string) {
    this.openId.value = this.openId.value === id ? null : id;
  }

  closeDetail() {
    this.openId.value = null;
  }

  isOpen(id: string): boolean {
    return this.openId.value === id;
  }

  entryTone(entry: PressEntry): string {
    return this.isDone(entry.id) ? 'done' : `ch-${entry.channel}`;
  }

  persistDone() {
    try {
      localStorage.setItem(
        $PressCalendarModel.STORAGE_KEY,
        JSON.stringify([...this.doneIds.value]),
      );
    } catch {
      /* storage unavailable (private mode) — checkmarks stay in-memory */
    }
  }

  restoreDone() {
    try {
      const raw = localStorage.getItem($PressCalendarModel.STORAGE_KEY);
      if (raw) this.doneIds.value = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* corrupted or unavailable — start empty */
    }
  }
}

export namespace PressCalendarModel {
  export const $Class = $PressCalendarModel; // raw — children extend this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  export interface Cell {
    /** 0 = leading blank cell */
    day: number;
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
