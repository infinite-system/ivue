import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { CommentPage, CommentRow } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// The moderation queue: pending comments first (approve/delete), the
// approved history after, with a status filter and search. Nothing a
// reader sees exists until it passes through this table.
class $CommentsModel {
  constructor() {
    this.refresh();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get PAGE_SIZE() {
    return 50;
  }

  get rows() {
    return shallowRef<CommentRow[]>([]);
  }

  get total() {
    return ref(0);
  }

  get offset() {
    return ref(0);
  }

  get search() {
    return ref('');
  }

  get statusFilter() {
    return ref('');
  }

  get loading() {
    return ref(true);
  }

  get busyId() {
    return ref(0);
  }

  // ---- derived ----
  get pendingRows() {
    return this.rows.value.filter((row) => row.status === 'pending');
  }

  get decidedRows() {
    return this.rows.value.filter((row) => row.status !== 'pending');
  }

  get pendingCount() {
    return this.pendingRows.length;
  }

  get pageIndex() {
    return Math.floor(this.offset.value / this.PAGE_SIZE) + 1;
  }

  get pageCount() {
    return Math.max(1, Math.ceil(this.total.value / this.PAGE_SIZE));
  }

  get hasPreviousPage() {
    return this.offset.value > 0;
  }

  get hasNextPage() {
    return this.offset.value + this.PAGE_SIZE < this.total.value;
  }

  isBusy(id: number) {
    return this.busyId.value === id;
  }

  postUrl(slug: string) {
    return `https://ivue.dev/blog/${slug}`;
  }

  statusLabel(row: CommentRow) {
    return row.status === 'pending' ? 'pending' : 'approved';
  }

  // ---- actions ----
  async refresh() {
    this.loading.value = true;
    try {
      const page = await Api.Class.comments({
        status: this.statusFilter.value,
        search: this.search.value,
        limit: this.PAGE_SIZE,
        offset: this.offset.value,
      });
      this.applyPage(page);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  applyPage(page: CommentPage) {
    this.rows.value = page.rows;
    this.total.value = page.total;
  }

  searchNow() {
    this.offset.value = 0;
    this.refresh();
  }

  filterByStatus(status: string) {
    this.statusFilter.value = status;
    this.offset.value = 0;
    this.refresh();
  }

  nextPage() {
    if (!this.hasNextPage) return;
    this.offset.value += this.PAGE_SIZE;
    this.refresh();
  }

  previousPage() {
    if (!this.hasPreviousPage) return;
    this.offset.value -= this.PAGE_SIZE;
    this.refresh();
  }

  async approve(row: CommentRow) {
    await this.moderate(row, async () => {
      await Api.Class.approveComment(row.id);
      return `Approved — it is live on ${row.slug}.`;
    });
  }

  async remove(row: CommentRow) {
    await this.moderate(row, async () => {
      await Api.Class.deleteComment(row.id);
      return 'Comment deleted.';
    });
  }

  // Lock/unlock the THREAD a row belongs to — a locked thread keeps its
  // replies visible and accepts no new ones (enforced server-side too).
  async toggleLock(row: CommentRow) {
    const locking = !row.locked;
    await this.moderate(row, async () => {
      await Api.Class.lockComment(row.id, locking);
      return locking
        ? 'Thread locked — no new replies.'
        : 'Thread unlocked — replies open again.';
    });
  }

  // a reply belongs to a thread; only the root carries the flag
  isReply(row: CommentRow) {
    return Boolean(row.parentId);
  }

  lockLabel(row: CommentRow) {
    return row.locked ? 'Unlock' : 'Lock';
  }

  async moderate(row: CommentRow, action: () => Promise<string>) {
    this.busyId.value = row.id;
    try {
      const message = await action();
      this.$app.notify(message, 'success');
      await this.refresh();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.busyId.value = 0;
    }
  }
}

export namespace CommentsModel {
  export const $Class = $CommentsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
