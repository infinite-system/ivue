import { Reactive } from 'ivue';
import { Notify } from 'quasar';
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { Api } from '../platform/Api';
import type { PressBaseRevision, PressExpression, PressPiece, PressPosting } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';
import { PressKinds } from './PressKinds';

// The piece page — the argument on the left (title, claim, notes, and
// the base every derived expression regenerates from), the expressions
// on the right as tabs, each a platform card. The base autosaves 800 ms
// after the last keystroke; ⌘S saves now. A save that changed the base
// brings back regenerated expressions, which replace the tabs in place.
class $PieceModel {
  static readonly AUTOSAVE_MS = 800;

  protected get $app() {
    return AppStore.use();
  }

  constructor() {
    onMounted(() => this.load());
    onUnmounted(() => this.flush());
    watch(
      () => [this.titleDraft.value, this.claimDraft.value, this.notesDraft.value, this.baseDraft.value],
      () => this.onDraftInput(),
    );
  }

  /* ---- state ---- */

  get piece() {
    return shallowRef<PressPiece | null>(null);
  }

  get loading() {
    return ref(true);
  }

  get titleDraft() {
    return ref('');
  }

  get claimDraft() {
    return ref('');
  }

  get notesDraft() {
    return ref('');
  }

  get baseDraft() {
    return ref('');
  }

  /** dirty | saving | saved | error */
  get saveState() {
    return ref<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  }

  get saveTimer() {
    return ref<ReturnType<typeof setTimeout> | null>(null);
  }

  get activeExpressionId() {
    return ref<number | null>(null);
  }

  get split() {
    return ref(38);
  }

  get postings() {
    return shallowRef<PressPosting[]>([]);
  }

  get baseRevisions() {
    return shallowRef<PressBaseRevision[]>([]);
  }

  get baseRevisionsOpen() {
    return ref(false);
  }

  get adding() {
    return ref(false);
  }

  /* ---- derivations ---- */

  get id(): number {
    return this.$app.pieceId;
  }

  get expressions(): PressExpression[] {
    return this.piece.value?.expressions ?? [];
  }

  get activeExpression(): PressExpression | null {
    const id = this.activeExpressionId.value;
    return this.expressions.find((expression) => expression.id === id) ?? this.expressions[0] ?? null;
  }

  get hasExpressions(): boolean {
    return this.expressions.length > 0;
  }

  get menu(): { kind: string; mode: 'derived' | 'authored'; label: string; modeLabel: string }[] {
    return PressKinds.Class.MENU.map((entry) => ({
      ...entry,
      label: PressKinds.Class.label(entry.kind),
      modeLabel: entry.mode === 'derived' ? 'from the base' : 'by hand',
    }));
  }

  get baseSegments(): string[] {
    return PressKinds.Class.segments(this.baseDraft.value);
  }

  /** the thread's shape while the base is written: one count per rule-split segment */
  get baseGutter(): { index: number; count: number; over: boolean }[] {
    return this.baseSegments.map((segment, index) => {
      const count = PressKinds.Class.count(PressKinds.Class.plain(segment));
      return { index: index + 1, count, over: count > PressKinds.Class.xFold };
    });
  }

  get derivedCount(): number {
    return this.expressions.filter((expression) => expression.mode === 'derived').length;
  }

  get saveLabel(): string {
    switch (this.saveState.value) {
      case 'dirty':
        return 'Unsaved';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return this.derivedCount ? `Saved · ${this.derivedCount} derived regenerated` : 'Saved';
      case 'error':
        return 'Not saved — retry';
      default:
        return '';
    }
  }

  get bannerUrl(): string {
    return this.piece.value?.banner ?? '';
  }

  get slugLabel(): string {
    return this.piece.value?.slug ? `from ${this.piece.value.slug}` : 'no article behind this piece';
  }

  get isDirty(): boolean {
    const piece = this.piece.value;
    if (!piece) return false;
    return (
      piece.title !== this.titleDraft.value ||
      piece.claim !== this.claimDraft.value ||
      piece.notes !== this.notesDraft.value ||
      piece.base !== this.baseDraft.value
    );
  }

  /* ---- loading ---- */

  async load() {
    this.loading.value = true;
    try {
      const piece = await Api.Class.pressPiece(this.id);
      this.adopt(piece);
      this.postings.value = await Api.Class.pressPostings(this.id);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  adopt(piece: PressPiece) {
    this.piece.value = piece;
    this.titleDraft.value = piece.title;
    this.claimDraft.value = piece.claim;
    this.notesDraft.value = piece.notes;
    this.baseDraft.value = piece.base;
    this.saveState.value = 'clean';
    if (this.activeExpressionId.value === null && piece.expressions[0])
      this.activeExpressionId.value = piece.expressions[0].id;
  }

  /* ---- saving ---- */

  onDraftInput() {
    if (!this.isDirty) return;
    this.saveState.value = 'dirty';
    if (this.saveTimer.value !== null) clearTimeout(this.saveTimer.value);
    this.saveTimer.value = setTimeout(() => this.saveNow(), $PieceModel.AUTOSAVE_MS);
  }

  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveNow();
    }
  }

  flush() {
    if (this.saveTimer.value !== null) {
      clearTimeout(this.saveTimer.value);
      this.saveTimer.value = null;
      if (this.isDirty) this.saveNow();
    }
  }

  async saveNow() {
    const piece = this.piece.value;
    if (!piece || !this.isDirty) return;
    if (this.saveTimer.value !== null) {
      clearTimeout(this.saveTimer.value);
      this.saveTimer.value = null;
    }
    this.saveState.value = 'saving';
    const changes: Record<string, string> = {};
    if (piece.title !== this.titleDraft.value) changes.title = this.titleDraft.value;
    if (piece.claim !== this.claimDraft.value) changes.claim = this.claimDraft.value;
    if (piece.notes !== this.notesDraft.value) changes.notes = this.notesDraft.value;
    if (piece.base !== this.baseDraft.value) changes.base = this.baseDraft.value;
    try {
      await Api.Class.pressPatchPiece(piece.id, changes);
      // the base may have regenerated expressions — re-read the detail
      const fresh = await Api.Class.pressPiece(piece.id);
      this.piece.value = fresh;
      this.saveState.value = this.isDirty ? 'dirty' : 'saved';
      if (this.isDirty) this.onDraftInput();
    } catch (error) {
      this.saveState.value = 'error';
      this.$app.reportFailure(error);
    }
  }

  /* ---- expressions ---- */

  selectTab(id: number) {
    this.activeExpressionId.value = id;
  }

  isActive(expression: PressExpression): boolean {
    return this.activeExpression?.id === expression.id;
  }

  tabLabel(expression: PressExpression): string {
    const venue = expression.venue && expression.venue !== 'X' ? ` · ${expression.venue}` : '';
    return `${PressKinds.Class.label(expression.kind)}${venue}`;
  }

  tabTone(expression: PressExpression): string {
    return `state-${expression.status}`;
  }

  modeMark(expression: PressExpression): string {
    return expression.mode === 'derived' ? 'derived' : 'authored';
  }

  async addExpression(entry: { kind: string; mode: 'derived' | 'authored' }) {
    const piece = this.piece.value;
    if (!piece) return;
    this.adding.value = true;
    try {
      const created = await Api.Class.pressAddExpression(piece.id, { kind: entry.kind, mode: entry.mode });
      this.piece.value = { ...piece, expressions: [...piece.expressions, created] };
      this.activeExpressionId.value = created.id;
      Notify.create({ message: `${PressKinds.Class.label(entry.kind)} added${entry.mode === 'derived' ? ' from the base' : ''}` });
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.adding.value = false;
    }
  }

  /** a card saved, approved, scheduled… — its fresh record replaces the tab */
  onExpressionChanged(record: PressExpression) {
    const piece = this.piece.value;
    if (!piece) return;
    const known = piece.expressions.some((expression) => expression.id === record.id);
    this.piece.value = {
      ...piece,
      expressions: known
        ? piece.expressions.map((expression) => (expression.id === record.id ? record : expression))
        : [...piece.expressions, record],
    };
    if (!known) this.activeExpressionId.value = record.id;
  }

  onExpressionArchived(id: number) {
    const piece = this.piece.value;
    if (!piece) return;
    this.piece.value = { ...piece, expressions: piece.expressions.filter((expression) => expression.id !== id) };
    if (this.activeExpressionId.value === id) this.activeExpressionId.value = this.expressions[0]?.id ?? null;
  }

  async refreshPostings() {
    try {
      this.postings.value = await Api.Class.pressPostings(this.id);
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  /* ---- base revisions ---- */

  async openBaseRevisions() {
    this.baseRevisionsOpen.value = true;
    try {
      this.baseRevisions.value = await Api.Class.pressBaseRevisions(this.id);
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  closeBaseRevisions() {
    this.baseRevisionsOpen.value = false;
  }

  async restoreBase(revision: PressBaseRevision) {
    try {
      await Api.Class.pressRestoreBase(this.id, revision.id);
      this.baseRevisionsOpen.value = false;
      await this.load();
      Notify.create({ type: 'positive', message: 'Base restored — derived expressions regenerated' });
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  revisionLabel(revision: PressBaseRevision): string {
    return `${Format.Class.dateTime(revision.savedAt)} · ${revision.author}`;
  }

  revisionExcerpt(revision: PressBaseRevision): string {
    const line = revision.base.split('\n').find((candidate) => candidate.trim()) ?? '';
    return line.length > 90 ? `${line.slice(0, 87)}…` : line;
  }

  postingLabel(row: PressPosting): string {
    return `${Format.Class.dateTime(row.postedAt)} · ${PressKinds.Class.PLATFORM_LABELS[row.platform] ?? row.platform}${row.venue ? ` · ${row.venue}` : ''}${row.postedBy === 'api' ? ' · by the Worker' : ''}`;
  }
}

export namespace PieceModel {
  export const $Class = $PieceModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
