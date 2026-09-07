import { Reactive } from 'ivue';
import { onMounted, ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';
import { PressKinds } from './PressKinds';

// The Sent tab — the posting ledger, newest first: piece, kind,
// platform, venue, URL, remote ids, who posted, the calendar entry it
// fulfilled. Filter by text to see where one piece has been.
class $SentModel {
  constructor() {
    onMounted(() => this.load());
  }

  protected get $app() {
    return AppStore.Class.use();
  }

  get rows() {
    return shallowRef<Api.PressPosting[]>([]);
  }

  get loading() {
    return ref(false);
  }

  get filter() {
    return ref('');
  }

  get filtered(): Api.PressPosting[] {
    const needle = this.filter.value.trim().toLowerCase();
    if (!needle) return this.rows.value;
    return this.rows.value.filter((row) =>
      [row.pieceTitle, row.platform, row.venue, row.url, row.kind]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }

  get isLoadingEmpty(): boolean {
    return this.loading.value && this.filtered.length === 0;
  }

  get isEmpty(): boolean {
    return !this.loading.value && this.filtered.length === 0;
  }

  async load() {
    this.loading.value = true;
    try {
      this.rows.value = await Api.Class.pressPostings();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  whenLabel(row: Api.PressPosting): string {
    return `${Format.Class.dateTime(row.postedAt)} · ${PressKinds.Class.easternTime(row.postedAt)} ET`;
  }

  kindLabel(row: Api.PressPosting): string {
    return PressKinds.Class.label(row.kind ?? '');
  }

  platformLabel(row: Api.PressPosting): string {
    return PressKinds.Class.PLATFORM_LABELS[row.platform] ?? row.platform;
  }

  byLabel(row: Api.PressPosting): string {
    return row.postedBy === 'api' ? 'the Worker' : 'by hand';
  }

  remoteLabel(row: Api.PressPosting): string {
    return row.remoteIds.join(', ') || '—';
  }

  calendarLabel(row: Api.PressPosting): string {
    return row.calendarId ?? '—';
  }

  urlLabel(row: Api.PressPosting): string {
    return row.url ?? '—';
  }

  openPiece(row: Api.PressPosting) {
    if (row.pieceId) this.$app.openPiece(row.pieceId);
  }
}

export namespace SentModel {
  export const $Class = $SentModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
