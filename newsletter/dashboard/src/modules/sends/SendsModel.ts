import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { SendLogRow } from '../platform/Api';
import type { AppModel } from '../app/AppModel';

// The global send log: every (recipient, post) delivery ever recorded in
// the ledger, newest first, searchable by recipient or slug — sending
// history as a first-class trackable surface, not just the per-
// subscriber drawer.
class $SendsModel {
  constructor(public app: AppModel.Instance) {
    this.refresh();
  }

  get PAGE_SIZE() {
    return 50;
  }

  get rows() {
    return shallowRef<SendLogRow[]>([]);
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

  get loading() {
    return ref(true);
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

  async refresh() {
    this.loading.value = true;
    try {
      const page = await Api.Class.sends({
        search: this.search.value,
        limit: this.PAGE_SIZE,
        offset: this.offset.value,
      });
      this.rows.value = page.rows;
      this.total.value = page.total;
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  searchNow() {
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
}

export namespace SendsModel {
  export const $Class = $SendsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
