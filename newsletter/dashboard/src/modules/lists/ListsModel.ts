import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { AdminSettings, ListSummary } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// List management: every list with its membership counts and effective
// drip clock, plus create / rename / delete. The default list is
// protected (the Worker refuses to rename or delete it); delete is
// refused while members remain — moving people is never a side effect.
class $ListsModel {
  constructor() {
    this.refresh();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get DEFAULT_LIST() {
    return 'newsletter';
  }

  get lists() {
    return shallowRef<ListSummary[]>([]);
  }

  get settings() {
    return shallowRef<AdminSettings | null>(null);
  }

  get loading() {
    return ref(true);
  }

  get busy() {
    return ref(false);
  }

  // ---- create form ----
  get createDraft() {
    return ref('');
  }

  get createDisabled() {
    return !this.createDraft.value.trim() || this.busy.value;
  }

  // ---- rename (one list at a time) ----
  get renamingList() {
    return ref('');
  }

  get renameDraft() {
    return ref('');
  }

  get renameDisabled() {
    return !this.renameDraft.value.trim() || this.busy.value;
  }

  // ---- derived ----
  isDefault(list: string) {
    return list === this.DEFAULT_LIST;
  }

  isRenaming(list: string) {
    return this.renamingList.value === list;
  }

  canDelete(entry: ListSummary) {
    return !this.isDefault(entry.list) && entry.members === 0;
  }

  deleteHint(entry: ListSummary) {
    if (this.isDefault(entry.list)) return 'default list';
    if (entry.members > 0) return 'has members';
    return '';
  }

  // the list's effective drip clock, overrides over defaults
  scheduleLabel(list: string) {
    const settings = this.settings.value;
    if (!settings) return '';
    const override = settings.listOverrides[list] ?? {};
    const days = override.cadenceDays ?? settings.cadenceDays;
    const hour = override.sendHourLocal ?? settings.sendHourLocal;
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    const inherited =
      override.cadenceDays === undefined && override.sendHourLocal === undefined;
    return `every ${days}d · ${twelveHour}${hour < 12 ? 'am' : 'pm'} local${inherited ? '' : ' (override)'}`;
  }

  // ---- actions ----
  async refresh() {
    this.loading.value = true;
    try {
      const [lists, settings] = await Promise.all([
        Api.Class.lists(),
        Api.Class.settings(),
      ]);
      this.lists.value = lists;
      this.settings.value = settings;
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async createList() {
    if (this.createDisabled) return;
    await this.perform(async () => {
      const created = await Api.Class.createList(this.createDraft.value.trim());
      this.createDraft.value = '';
      return `List "${created.list}" created.`;
    });
  }

  startRename(list: string) {
    this.renamingList.value = list;
    this.renameDraft.value = list;
  }

  cancelRename() {
    this.renamingList.value = '';
    this.renameDraft.value = '';
  }

  async confirmRename() {
    if (this.renameDisabled) return;
    const from = this.renamingList.value;
    const to = this.renameDraft.value.trim();
    if (to === from) {
      this.cancelRename();
      return;
    }
    await this.perform(async () => {
      await Api.Class.renameList(from, to);
      this.cancelRename();
      return `Renamed "${from}" to "${to}".`;
    });
  }

  async deleteList(list: string) {
    await this.perform(async () => {
      await Api.Class.deleteList(list);
      return `List "${list}" deleted.`;
    });
  }

  async perform(action: () => Promise<string>) {
    this.busy.value = true;
    try {
      const message = await action();
      this.$app.notify(message, 'success');
      await this.refresh();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.busy.value = false;
    }
  }
}

export namespace ListsModel {
  export const $Class = $ListsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
