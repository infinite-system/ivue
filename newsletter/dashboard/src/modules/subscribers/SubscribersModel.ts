import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type {
  AudiencePage,
  ListSummary,
  SubscriberRow,
} from '../platform/Api';
import { AppStore } from '../app/AppStore';

// The subscribers table: server-side pagination and search, list filter,
// bulk selection with unsubscribe/resubscribe/remove, and the
// add-subscriber form. A row's email opens the app-wide subscriber
// modal (subscriber/SubscriberModal.vue) via the route query.
class $SubscribersModel {
  constructor() {
    this.refresh();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get PAGE_SIZE() {
    return 25;
  }

  // ---- table state ----
  get rows() {
    return shallowRef<SubscriberRow[]>([]);
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

  get listFilter() {
    return ref('');
  }

  get lists() {
    return shallowRef<ListSummary[]>([]);
  }

  get loading() {
    return ref(false);
  }

  get selectedEmails() {
    return shallowRef<string[]>([]);
  }

  // ---- add-subscriber form ----
  get addEmail() {
    return ref('');
  }

  get addName() {
    return ref('');
  }

  get addList() {
    return ref('newsletter');
  }

  // ---- derived ----
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

  get selectionCount() {
    return this.selectedEmails.value.length;
  }

  get allOnPageSelected() {
    const selected = new Set(this.selectedEmails.value);
    return (
      this.rows.value.length > 0 &&
      this.rows.value.every((row) => selected.has(row.email))
    );
  }

  // ---- actions ----
  async refresh() {
    this.loading.value = true;
    try {
      const [page, lists] = await Promise.all([
        Api.Class.subscribers({
          list: this.listFilter.value,
          search: this.search.value,
          limit: this.PAGE_SIZE,
          offset: this.offset.value,
        }),
        Api.Class.lists(),
      ]);
      this.applyPage(page);
      this.lists.value = lists;
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  applyPage(page: AudiencePage) {
    this.rows.value = page.rows;
    this.total.value = page.total;
    // selection only ever refers to visible rows
    const visible = new Set(page.rows.map((row) => row.email));
    this.selectedEmails.value = this.selectedEmails.value.filter((email) =>
      visible.has(email),
    );
  }

  searchNow() {
    this.offset.value = 0;
    this.refresh();
  }

  filterByList(list: string) {
    this.listFilter.value = list;
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

  rowKey(row: SubscriberRow) {
    return row.email + ' ' + row.list;
  }

  selectLabel(row: SubscriberRow) {
    return `Select ${row.email}`;
  }

  isSelected(email: string) {
    return this.selectedEmails.value.includes(email);
  }

  toggleSelected(email: string) {
    this.selectedEmails.value = this.isSelected(email)
      ? this.selectedEmails.value.filter((selected) => selected !== email)
      : [...this.selectedEmails.value, email];
  }

  toggleSelectPage() {
    this.selectedEmails.value = this.allOnPageSelected
      ? []
      : this.rows.value.map((row) => row.email);
  }

  async bulkUnsubscribe() {
    await this.bulkAction(async (emails) => {
      await Api.Class.unsubscribeMany(emails);
      return `Unsubscribed ${emails.length}.`;
    });
  }

  async bulkResubscribe() {
    await this.bulkAction(async (emails) => {
      await Api.Class.resubscribeMany(emails);
      return `Resubscribed ${emails.length}.`;
    });
  }

  async bulkRemove(purgeSends: boolean) {
    await this.bulkAction(async (emails) => {
      await Api.Class.removeMany(emails, purgeSends);
      return `Removed ${emails.length}${purgeSends ? ' (send history purged)' : ''}.`;
    });
  }

  async bulkAction(action: (emails: string[]) => Promise<string>) {
    const emails = this.selectedEmails.value;
    if (!emails.length) return;
    try {
      const message = await action(emails);
      this.$app.notify(message, 'success');
      this.selectedEmails.value = [];
      await this.refresh();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  async addSubscriber() {
    const email = this.addEmail.value.trim().toLowerCase();
    if (!email) return;
    try {
      await Api.Class.addSubscriber({
        email,
        name: this.addName.value.trim(),
        list: this.addList.value.trim() || 'newsletter',
      });
      this.$app.notify(`Added ${email}.`, 'success');
      this.addEmail.value = '';
      this.addName.value = '';
      await this.refresh();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

}

export namespace SubscribersModel {
  export const $Class = $SubscribersModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
