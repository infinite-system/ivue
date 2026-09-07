import { Reactive } from 'ivue';
import { Notify } from 'quasar';
import { onMounted, ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { PressKinds } from './PressKinds';

// The pieces list — one row per piece with its expressions rolled up as
// a strip of kind badges colored by state. Filters narrow by text,
// status, kind and wave; keyboard moves through the rows. "New piece"
// starts blank or from a blog post (copied in, never linked).
class $PiecesModel {
  constructor() {
    onMounted(() => this.load());
  }

  protected get $app() {
    return AppStore.Class.use();
  }

  /* ---- state ---- */

  get rows() {
    return shallowRef<Api.PressPieceSummary[]>([]);
  }

  get loading() {
    return ref(false);
  }

  get search() {
    return ref('');
  }

  get statusFilter() {
    return ref('');
  }

  get kindFilter() {
    return ref('');
  }

  get waveFilter() {
    return ref(0);
  }

  /** the row the keyboard is on */
  get focusedIndex() {
    return ref(-1);
  }

  get newPieceOpen() {
    return ref(false);
  }

  get newTitle() {
    return ref('');
  }

  get newFromSlug() {
    return ref('');
  }

  get blogPosts() {
    return shallowRef<Api.BlogPostOption[]>([]);
  }

  get creating() {
    return ref(false);
  }

  /* ---- derivations ---- */

  get count(): number {
    return this.rows.value.length;
  }

  get isLoadingEmpty(): boolean {
    return this.loading.value && this.rows.value.length === 0;
  }

  get isEmpty(): boolean {
    return !this.loading.value && this.rows.value.length === 0;
  }

  get statusOptions(): { label: string; value: string }[] {
    return [
      { label: 'any status', value: '' },
      ...['draft', 'approved', 'scheduled', 'due', 'sent'].map((status) => ({
        label: PressKinds.Class.statusLabel(status),
        value: status,
      })),
    ];
  }

  get kindOptions(): { label: string; value: string }[] {
    return [
      { label: 'any kind', value: '' },
      ...PressKinds.Class.MENU.map((entry) => ({ label: PressKinds.Class.label(entry.kind), value: entry.kind })),
    ];
  }

  get waveOptions(): { label: string; value: number }[] {
    return [
      { label: 'both waves', value: 0 },
      { label: 'wave 1 · Vue launch', value: 1 },
      { label: 'wave 2 · agents story', value: 2 },
    ];
  }

  get blogPostOptions(): { label: string; value: string }[] {
    return [
      { label: 'blank piece', value: '' },
      ...this.blogPosts.value.map((post) => ({ label: post.title, value: post.slug })),
    ];
  }

  get canCreate(): boolean {
    return !this.creating.value && (Boolean(this.newFromSlug.value) || this.newTitle.value.trim().length > 0);
  }

  get createLabel(): string {
    return this.creating.value ? 'Creating…' : this.newFromSlug.value ? 'Start from this post' : 'Create piece';
  }

  /* ---- methods ---- */

  async load() {
    this.loading.value = true;
    try {
      this.rows.value = await Api.Class.pressPieces({
        q: this.search.value.trim(),
        status: this.statusFilter.value,
        kind: this.kindFilter.value,
        wave: this.waveFilter.value,
      });
      if (this.focusedIndex.value >= this.rows.value.length) this.focusedIndex.value = this.rows.value.length - 1;
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  searchNow() {
    this.load();
  }

  open(piece: Api.PressPieceSummary) {
    this.$app.openPiece(piece.id);
  }

  isFocused(index: number): boolean {
    return this.focusedIndex.value === index;
  }

  /** ↑↓ move, Enter opens, a approves the first draft expression of the row */
  onKeydown(event: KeyboardEvent) {
    if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
    const last = this.rows.value.length - 1;
    if (event.key === 'ArrowDown') {
      this.focusedIndex.value = Math.min(last, this.focusedIndex.value + 1);
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.focusedIndex.value = Math.max(0, this.focusedIndex.value - 1);
      event.preventDefault();
    } else if (event.key === 'Enter' && this.focusedIndex.value >= 0) {
      this.open(this.rows.value[this.focusedIndex.value]);
    } else if (event.key === 'a' && this.focusedIndex.value >= 0) {
      this.approveFirstDraft(this.rows.value[this.focusedIndex.value]);
    }
  }

  async approveFirstDraft(piece: Api.PressPieceSummary) {
    const draft = piece.expressions.find((state) => state.status === 'draft');
    if (!draft) return;
    try {
      await Api.Class.pressAct(draft.id, 'approve');
      Notify.create({ type: 'positive', message: `${PressKinds.Class.label(draft.kind)} approved` });
      await this.load();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  async openNewPiece() {
    this.newPieceOpen.value = true;
    if (!this.blogPosts.value.length) {
      try {
        this.blogPosts.value = await Api.Class.pressBlogPosts();
      } catch (error) {
        this.$app.reportFailure(error);
      }
    }
  }

  closeNewPiece() {
    this.newPieceOpen.value = false;
  }

  async createPiece() {
    if (!this.canCreate) return;
    this.creating.value = true;
    try {
      const piece = await Api.Class.pressCreatePiece(
        this.newFromSlug.value
          ? { fromSlug: this.newFromSlug.value }
          : { title: this.newTitle.value.trim(), base: '' },
      );
      this.newPieceOpen.value = false;
      this.newTitle.value = '';
      this.newFromSlug.value = '';
      this.$app.openPiece(piece.id);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.creating.value = false;
    }
  }

  /* ---- labels ---- */

  kindLabel(state: Api.PressState): string {
    return PressKinds.Class.label(state.kind);
  }

  stateTitle(state: Api.PressState): string {
    const venue = state.venue ? ` @ ${state.venue}` : '';
    return `${PressKinds.Class.label(state.kind)}${venue} — ${PressKinds.Class.statusLabel(state.status)}${state.mode === 'derived' ? ' (derived)' : ''}`;
  }

  stateTone(state: Api.PressState): string {
    return `state-${state.status}`;
  }

  hasExpressions(piece: Api.PressPieceSummary): boolean {
    return piece.expressions.length > 0;
  }

  waveLabel(piece: Api.PressPieceSummary): string {
    return piece.wave === 2 ? 'wave 2' : 'wave 1';
  }

  nextDueLabel(piece: Api.PressPieceSummary): string {
    return piece.nextDueAt ? PressKinds.Class.easternTime(piece.nextDueAt) + ' ET' : '—';
  }

  calendarLabel(piece: Api.PressPieceSummary): string {
    return piece.calendarIds.length ? `${piece.calendarIds.length} placed` : '—';
  }
}

export namespace PiecesModel {
  export const $Class = $PiecesModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
