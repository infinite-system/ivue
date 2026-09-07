import { Reactive } from 'ivue';
import { Notify } from 'quasar';
import { ref, shallowRef, watch } from 'vue';
import { Api } from '../platform/Api';
import type { PressExpression, PressMirror, PressPieceRecord, PressRevision } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';
import { Markdown } from './Markdown';
import { PressKinds } from './PressKinds';

// One expression's card — the platform-shaped preview that is also the
// editor. Authored text edits in place (a segment per tweet card, one
// body elsewhere) and autosaves; derived text is read-only and points
// at the base. The footer holds approve, schedule, post, mark sent,
// clone, detach, revisions, and Copy of the projection.
class $ExpressionModel {
  static readonly AUTOSAVE_MS = 800;
  static readonly COPIED_MS = 1400;
  static readonly X_NAME = 'Evgeny';
  static readonly X_HANDLE = '@ivue_dev';
  static readonly SENT_PLATFORMS = ['x', 'linkedin', 'reddit', 'devto', 'hn', 'bluesky', 'mastodon', 'threads', 'email', 'other'];

  protected get $app() {
    return AppStore.use();
  }

  constructor(
    public props: ExpressionModel.Props,
    public emit: ExpressionModel.Emits,
  ) {
    this.adopt(props.expression);
    watch(
      () => props.expression,
      (expression) => this.adopt(expression),
    );
  }

  /* ---- state ---- */

  /** per child id, the text as typed */
  get segmentDrafts() {
    return shallowRef<Record<number, string>>({});
  }

  get bodyDraft() {
    return ref('');
  }

  /** meta fields the frames edit: title, subject, tags, canonical, cover, greeting, signoff, firstComment, subreddit */
  get metaDraft() {
    return shallowRef<Record<string, unknown>>({});
  }

  get saveState() {
    return ref<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  }

  get saveTimer() {
    return ref<ReturnType<typeof setTimeout> | null>(null);
  }

  get copiedKey() {
    return ref<string | null>(null);
  }

  get lintProblems() {
    return shallowRef<string[]>([]);
  }

  get scheduleOpen() {
    return ref(false);
  }

  /** datetime-local value in the browser's zone */
  get scheduleAt() {
    return ref('');
  }

  get sentOpen() {
    return ref(false);
  }

  get sentUrl() {
    return ref('');
  }

  get sentPlatform() {
    return ref('');
  }

  get sentVenue() {
    return ref('');
  }

  get revisions() {
    return shallowRef<PressRevision[]>([]);
  }

  get revisionsOpen() {
    return ref(false);
  }

  get cloneOpen() {
    return ref(false);
  }

  get busy() {
    return ref(false);
  }

  get dragFromId() {
    return ref<number | null>(null);
  }

  /* ---- the record ---- */

  get record(): PressExpression {
    return this.props.expression;
  }

  get piece(): PressPieceRecord {
    return this.props.piece;
  }

  get kind(): string {
    return this.record.kind;
  }

  get frame(): string {
    return PressKinds.Class.frame(this.kind);
  }

  get isParent(): boolean {
    return PressKinds.Class.isParent(this.kind);
  }

  get isDerived(): boolean {
    return this.record.mode === 'derived';
  }

  get isAuthored(): boolean {
    return this.record.mode === 'authored';
  }

  get children(): PressExpression[] {
    return this.record.children ?? [];
  }

  /** children with their live number (skipped ones carry none) */
  get numbered(): { child: PressExpression; number: number | null; text: string }[] {
    let live = 0;
    return this.children.map((child) => {
      const text = this.segmentDrafts.value[child.id] ?? child.body;
      if (child.skipped) return { child, number: null, text };
      live += 1;
      return { child, number: live, text };
    });
  }

  get liveCount(): number {
    return this.children.filter((child) => !child.skipped).length;
  }

  get kindLabel(): string {
    return PressKinds.Class.label(this.kind);
  }

  get platformLabel(): string {
    return PressKinds.Class.platformLabel(this.kind);
  }

  get statusLabel(): string {
    return PressKinds.Class.statusLabel(this.record.status);
  }

  get statusTone(): string {
    return `state-${this.record.status}`;
  }

  get modeLabel(): string {
    return this.isDerived ? 'derived from the base' : 'written by hand';
  }

  get unapprovedBecause(): string {
    return String(this.record.meta.unapprovedBecause ?? '');
  }

  get limit(): number | null {
    return PressKinds.Class.limit(this.isParent ? PressKinds.Class.childKind(this.kind) : this.kind);
  }

  get xName(): string {
    return $ExpressionModel.X_NAME;
  }

  get xHandle(): string {
    return $ExpressionModel.X_HANDLE;
  }

  /** the text as it will be copied or posted */
  get copyText(): string {
    if (this.isParent) return this.numbered.filter((entry) => entry.number !== null).map((entry) => entry.text).join('\n\n');
    if (this.kind === 'email') return `${this.subject}\n\n${this.bodyDraft.value}`;
    return this.bodyDraft.value;
  }

  get bodyCount(): number {
    return PressKinds.Class.count(this.bodyDraft.value);
  }

  get bodyOver(): boolean {
    return this.limit !== null && this.bodyCount > this.limit;
  }

  get countLabel(): string {
    return this.limit === null ? `${this.bodyCount} chars` : `${this.bodyCount} / ${this.limit}`;
  }

  /** where X folds the timeline: the text before and after */
  get beforeFold(): string {
    return this.foldSplit(this.bodyDraft.value, PressKinds.Class.xFold)[0];
  }

  get afterFold(): string {
    return this.foldSplit(this.bodyDraft.value, PressKinds.Class.xFold)[1];
  }

  get beforeLinkedinFold(): string {
    return this.foldSplit(this.bodyDraft.value, PressKinds.Class.linkedinFold)[0];
  }

  get afterLinkedinFold(): string {
    return this.foldSplit(this.bodyDraft.value, PressKinds.Class.linkedinFold)[1];
  }

  get renderedBody(): string {
    return Markdown.Class.render(this.bodyDraft.value);
  }

  get renderedFirstComment(): string {
    return Markdown.Class.render(this.firstComment);
  }

  get title(): string {
    return String(this.metaDraft.value.title ?? this.piece.title);
  }

  get subject(): string {
    return String(this.metaDraft.value.subject ?? this.piece.title);
  }

  get cover(): string {
    return String(this.metaDraft.value.cover ?? this.piece.banner ?? '');
  }

  get coverUrl(): string {
    const cover = this.cover;
    return cover.startsWith('/') ? `https://ivue.dev${cover}` : cover;
  }

  get tags(): string {
    return String(this.metaDraft.value.tags ?? '');
  }

  get canonical(): string {
    return String(this.metaDraft.value.canonical ?? this.piece.links[0]?.url ?? '');
  }

  get firstComment(): string {
    return String(this.metaDraft.value.firstComment ?? '');
  }

  get subreddit(): string {
    return this.record.venue || String(this.metaDraft.value.subreddit ?? 'r/vuejs');
  }

  get emailTo(): string {
    return String(this.metaDraft.value.to ?? this.record.venue);
  }

  get mirrors(): { mirror: PressMirror; label: string; count: number; limit: number | null; over: boolean; sentLabel: string }[] {
    return this.record.mirrors.map((mirror) => {
      const limit = PressKinds.Class.limit(mirror.platform);
      const count = PressKinds.Class.count(this.copyText);
      return {
        mirror,
        label: PressKinds.Class.PLATFORM_LABELS[mirror.platform] ?? mirror.platform,
        count,
        limit,
        over: limit !== null && count > limit,
        sentLabel: mirror.sentAt ? `sent ${Format.Class.date(mirror.sentAt)}` : 'not sent',
      };
    });
  }

  get hasMirrors(): boolean {
    return this.record.mirrors.length > 0;
  }

  /* ---- what the footer may do ---- */

  get canEdit(): boolean {
    return this.isAuthored && this.record.status !== 'sent' && this.record.status !== 'archived';
  }

  get canApprove(): boolean {
    return this.record.status === 'draft';
  }

  get canUnapprove(): boolean {
    return this.record.status === 'approved';
  }

  get canSchedule(): boolean {
    return this.record.status === 'approved';
  }

  get canReschedule(): boolean {
    return this.record.status === 'scheduled';
  }

  get canCancel(): boolean {
    return this.record.status === 'scheduled';
  }

  get canPost(): boolean {
    return this.platformLabel === 'X' && ['approved', 'scheduled', 'due'].includes(this.record.status);
  }

  get canMarkSent(): boolean {
    return ['approved', 'scheduled', 'due', 'sent'].includes(this.record.status);
  }

  get canDetach(): boolean {
    return this.isDerived;
  }

  get approveLabel(): string {
    return this.busy.value ? '…' : this.record.status === 'approved' ? 'Approved ✓' : 'Approve';
  }

  get saveLabel(): string {
    switch (this.saveState.value) {
      case 'dirty':
        return 'Unsaved';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Not saved';
      default:
        return '';
    }
  }

  get scheduledLabel(): string {
    const at = this.record.scheduledAt;
    return at ? `${Format.Class.dateTime(at)} · ${PressKinds.Class.easternTime(at)} ET` : '';
  }

  get sentLabel(): string {
    const at = this.record.sentAt;
    return at ? `sent ${Format.Class.dateTime(at)}` : '';
  }

  get scheduleEasternPreview(): string {
    const epoch = Format.Class.epochFromLocalInput(this.scheduleAt.value);
    return epoch ? `${PressKinds.Class.easternTime(epoch)} ET` : '';
  }

  get hasLintProblems(): boolean {
    return this.lintProblems.value.length > 0;
  }

  get sentPlatformOptions(): { label: string; value: string }[] {
    return $ExpressionModel.SENT_PLATFORMS.map((platform) => ({
      label: PressKinds.Class.PLATFORM_LABELS[platform] ?? platform,
      value: platform,
    }));
  }

  get cloneOptions(): { label: string; value: string }[] {
    return PressKinds.Class.MENU.filter((entry) => entry.kind !== this.kind).map((entry) => ({
      label: PressKinds.Class.label(entry.kind),
      value: entry.kind,
    }));
  }

  /* ---- adopting a record ---- */

  adopt(expression: PressExpression) {
    if (this.saveState.value === 'dirty' || this.saveState.value === 'saving') return;
    const drafts: Record<number, string> = {};
    for (const child of expression.children ?? []) drafts[child.id] = child.body;
    this.segmentDrafts.value = drafts;
    this.bodyDraft.value = expression.body;
    this.metaDraft.value = { ...expression.meta };
    this.lintProblems.value = [];
  }

  /* ---- editing ---- */

  segmentText(child: PressExpression): string {
    return this.segmentDrafts.value[child.id] ?? child.body;
  }

  segmentCount(child: PressExpression): number {
    return PressKinds.Class.count(this.segmentText(child));
  }

  segmentOver(child: PressExpression): boolean {
    const limit = this.limit;
    return limit !== null && this.segmentCount(child) > limit;
  }

  segmentCountLabel(child: PressExpression): string {
    return this.limit === null ? `${this.segmentCount(child)}` : `${this.segmentCount(child)} / ${this.limit}`;
  }

  onSegmentInput(child: PressExpression, event: Event) {
    const text = (event.target as HTMLElement).innerText.replace(/ /g, ' ');
    this.segmentDrafts.value = { ...this.segmentDrafts.value, [child.id]: text };
    this.markDirty(() => this.saveSegment(child));
  }

  onBodyInput(event: Event) {
    const target = event.target as HTMLElement & { value?: string };
    this.bodyDraft.value = (target.value ?? target.innerText).replace(/ /g, ' ');
    this.markDirty(() => this.saveBody());
  }

  setMeta(key: string, value: unknown) {
    this.metaDraft.value = { ...this.metaDraft.value, [key]: value };
    this.markDirty(() => this.saveBody());
  }

  onMetaInput(key: string, event: Event) {
    this.setMeta(key, (event.target as HTMLInputElement).value);
  }

  /** plain-text paste for the contenteditable frames */
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  markDirty(save: () => Promise<void>) {
    this.saveState.value = 'dirty';
    if (this.saveTimer.value !== null) clearTimeout(this.saveTimer.value);
    this.saveTimer.value = setTimeout(() => save(), $ExpressionModel.AUTOSAVE_MS);
  }

  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveNow();
    }
  }

  async saveNow() {
    if (this.saveTimer.value !== null) {
      clearTimeout(this.saveTimer.value);
      this.saveTimer.value = null;
    }
    if (this.isParent) {
      for (const child of this.children)
        if (this.segmentText(child) !== child.body) await this.saveSegment(child);
      if (JSON.stringify(this.metaDraft.value) !== JSON.stringify(this.record.meta)) await this.saveBody();
    } else await this.saveBody();
  }

  async saveSegment(child: PressExpression) {
    const text = this.segmentText(child);
    if (text === child.body) {
      this.saveState.value = 'clean';
      return;
    }
    await this.patch(child.id, { body: text });
  }

  async saveBody() {
    const changes: { body?: string; meta?: Record<string, unknown> } = {};
    if (!this.isParent && this.bodyDraft.value !== this.record.body) changes.body = this.bodyDraft.value;
    if (JSON.stringify(this.metaDraft.value) !== JSON.stringify(this.record.meta)) changes.meta = this.metaDraft.value;
    if (!Object.keys(changes).length) {
      this.saveState.value = 'clean';
      return;
    }
    await this.patch(this.record.id, changes);
  }

  async patch(id: number, changes: Parameters<typeof Api.Class.pressPatchExpression>[1]) {
    this.saveState.value = 'saving';
    try {
      const fresh = await Api.Class.pressPatchExpression(id, changes);
      this.saveState.value = 'saved';
      this.emit('changed', fresh);
    } catch (error) {
      this.saveState.value = 'error';
      this.$app.reportFailure(error);
    }
  }

  /* ---- segments ---- */

  async setSkipped(child: PressExpression, skipped: boolean) {
    await this.act(() => Api.Class.pressPatchExpression(child.id, { skipped }));
  }

  skipLabel(child: PressExpression): string {
    return child.skipped ? 'Restore' : 'Skip';
  }

  segmentTone(child: PressExpression): string {
    return child.skipped ? 'skipped' : this.segmentOver(child) ? 'over' : '';
  }

  async addSegment() {
    await this.act(() => Api.Class.pressAct(this.record.id, 'segment', { body: '' }));
  }

  onDragStart(child: PressExpression) {
    this.dragFromId.value = child.id;
  }

  onDragOver(event: DragEvent) {
    if (this.dragFromId.value !== null) event.preventDefault();
  }

  async onDrop(target: PressExpression) {
    const from = this.dragFromId.value;
    this.dragFromId.value = null;
    if (from === null || from === target.id) return;
    const order = this.children.map((child) => child.id).filter((id) => id !== from);
    order.splice(order.indexOf(target.id), 0, from);
    await this.act(() => Api.Class.pressReorder(this.record.id, order));
  }

  isDragging(child: PressExpression): boolean {
    return this.dragFromId.value === child.id;
  }

  /* ---- status ---- */

  async approve() {
    await this.saveNow();
    this.lintProblems.value = [];
    try {
      this.busy.value = true;
      const fresh = await Api.Class.pressAct(this.record.id, 'approve');
      this.emit('changed', fresh);
      Notify.create({ type: 'positive', message: `${this.kindLabel} approved as this exact text` });
    } catch (error) {
      const lint = await Api.Class.pressLint(this.record.id).catch(() => ({ problems: [] as string[] }));
      this.lintProblems.value = lint.problems.length ? lint.problems : [error instanceof Error ? error.message : String(error)];
    } finally {
      this.busy.value = false;
    }
  }

  async unapprove() {
    await this.act(() => Api.Class.pressAct(this.record.id, 'unapprove'));
  }

  async archive() {
    try {
      await Api.Class.pressAct(this.record.id, 'archive');
      this.emit('removed', this.record.id);
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  async detach() {
    await this.act(() => Api.Class.pressAct(this.record.id, 'detach'), 'Detached — this text is yours now; the base no longer regenerates it');
  }

  openClone() {
    this.cloneOpen.value = true;
  }

  closeClone() {
    this.cloneOpen.value = false;
  }

  async clone(kind: string) {
    this.cloneOpen.value = false;
    await this.act(() => Api.Class.pressAct(this.record.id, 'clone', { kind }), `Cloned as ${PressKinds.Class.label(kind)}`);
  }

  /* ---- scheduling ---- */

  openSchedule() {
    if (!this.scheduleAt.value) this.scheduleAt.value = this.defaultScheduleAt();
    this.scheduleOpen.value = true;
  }

  closeSchedule() {
    this.scheduleOpen.value = false;
  }

  /** the linked calendar day at 9:00 local, else an hour from now */
  defaultScheduleAt(): string {
    const calendarDay = /^(\d{4}-\d{2}-\d{2})/.exec(this.record.calendarId ?? '')?.[1];
    if (calendarDay) return `${calendarDay}T09:00`;
    const soon = new Date(Date.now() + 3600_000);
    soon.setSeconds(0, 0);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`;
  }

  async schedule() {
    const epoch = Format.Class.epochFromLocalInput(this.scheduleAt.value);
    if (!epoch) return;
    this.scheduleOpen.value = false;
    const action = this.record.status === 'scheduled' ? 'reschedule' : 'schedule';
    await this.act(() => Api.Class.pressAct(this.record.id, action, { dueAt: epoch }), `Scheduled for ${PressKinds.Class.easternTime(epoch)} ET`);
  }

  async cancelSchedule() {
    await this.act(() => Api.Class.pressAct(this.record.id, 'cancel'), 'Schedule cancelled — still approved');
  }

  /* ---- posting ---- */

  async post() {
    if (!window.confirm(`Post this ${this.kindLabel} to X now?`)) return;
    await this.act(() => Api.Class.pressAct(this.record.id, 'post'), 'Posted to X — the ledger has it');
  }

  openSent(platform?: string) {
    this.sentPlatform.value = platform ?? this.platformKey;
    this.sentVenue.value = this.record.venue;
    this.sentUrl.value = '';
    this.sentOpen.value = true;
  }

  get platformKey(): string {
    const entry = Object.entries(PressKinds.Class.PLATFORM_LABELS).find(([, label]) => label === this.platformLabel);
    return entry?.[0] ?? 'other';
  }

  closeSent() {
    this.sentOpen.value = false;
  }

  async markSent() {
    this.sentOpen.value = false;
    await this.act(
      () =>
        Api.Class.pressAct(this.record.id, 'sent', {
          url: this.sentUrl.value.trim() || undefined,
          platform: this.sentPlatform.value || undefined,
          venue: this.sentVenue.value.trim() || undefined,
        }),
      'Marked sent — the ledger has it',
    );
  }

  /* ---- revisions ---- */

  async openRevisions() {
    this.revisionsOpen.value = true;
    try {
      this.revisions.value = await Api.Class.pressRevisions(this.record.id);
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  closeRevisions() {
    this.revisionsOpen.value = false;
  }

  async restore(revision: PressRevision) {
    this.revisionsOpen.value = false;
    await this.act(() => Api.Class.pressRestore(this.record.id, revision.id), 'Restored as a new save');
  }

  revisionLabel(revision: PressRevision): string {
    return `${Format.Class.dateTime(revision.savedAt)} · ${revision.author}`;
  }

  revisionExcerpt(revision: PressRevision): string {
    const line = revision.body.split('\n').find((candidate) => candidate.trim()) ?? '';
    return line.length > 90 ? `${line.slice(0, 87)}…` : line;
  }

  /* ---- copy ---- */

  async copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedKey.value = key;
      setTimeout(() => this.clearCopied(key), $ExpressionModel.COPIED_MS);
    } catch {
      Notify.create({ type: 'negative', message: 'Copy failed — select the text instead' });
    }
  }

  clearCopied(key: string) {
    if (this.copiedKey.value === key) this.copiedKey.value = null;
  }

  copyAll() {
    return this.copy(this.copyText, 'all');
  }

  copySegment(child: PressExpression) {
    return this.copy(this.segmentText(child), `segment-${child.id}`);
  }

  copyLabel(key: string): string {
    return this.copiedKey.value === key ? 'Copied ✓' : 'Copy';
  }

  isCopied(key: string): boolean {
    return this.copiedKey.value === key;
  }

  segmentKey(child: PressExpression): string {
    return `segment-${child.id}`;
  }

  /* ---- helpers ---- */

  /** every footer verb: save first, call, replace the record, say what happened */
  async act(call: () => Promise<PressExpression>, message?: string) {
    await this.saveNow();
    this.busy.value = true;
    try {
      const fresh = await call();
      this.saveState.value = 'clean';
      this.emit('changed', fresh);
      if (message) Notify.create({ type: 'positive', message });
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.busy.value = false;
    }
  }

  foldSplit(text: string, fold: number): [string, string] {
    if (PressKinds.Class.count(text) <= fold) return [text, ''];
    // walk code points, URLs weighted, until the fold
    let weight = 0;
    let index = 0;
    const characters = [...text];
    while (index < characters.length && weight < fold) {
      const rest = characters.slice(index).join('');
      const url = /^https?:\/\/[^\s<>)]+/.exec(rest);
      if (url) {
        weight += 23;
        index += [...url[0]].length;
      } else {
        weight += 1;
        index += 1;
      }
    }
    return [characters.slice(0, index).join(''), characters.slice(index).join('')];
  }

  formatDate(unixSeconds: number | null): string {
    return Format.Class.dateTime(unixSeconds);
  }
}

export namespace ExpressionModel {
  export const $Class = $ExpressionModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    expression: PressExpression;
    piece: PressPieceRecord;
  }

  export type Emits = {
    (event: 'changed', record: PressExpression): void;
    (event: 'removed', id: number): void;
  };
}
