import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { DripPlanEntry } from '../platform/Api';
import type { AppModel } from '../app/AppModel';

// The drip preview — the exact plan the next cron tick executes, because
// the Worker computes both from the same Drip.plan().
class $DripModel {
  constructor(public app: AppModel.Instance) {
    this.load();
  }

  get entries() {
    return shallowRef<DripPlanEntry[]>([]);
  }

  get cadenceHours() {
    return ref(0);
  }

  get loading() {
    return ref(true);
  }

  get dueNowCount() {
    return this.entries.value.filter((entry) => entry.sendNow).length;
  }

  get caughtUpCount() {
    return this.entries.value.filter((entry) => !entry.nextSlug).length;
  }

  async load() {
    this.loading.value = true;
    try {
      const preview = await Api.Class.dripPreview();
      this.entries.value = preview.entries;
      this.cadenceHours.value = preview.cadenceHours;
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }
}

export namespace DripModel {
  export const $Class = $DripModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
