import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { Stats } from '../platform/Api';
import type { AppModel } from '../app/AppModel';

// System stats: list totals, signups over the last 60 days, and sends
// per post from the ledger.
class $StatsModel {
  constructor(public app: AppModel.Instance) {
    this.load();
  }

  get stats() {
    return shallowRef<Stats | null>(null);
  }

  get loading() {
    return ref(true);
  }

  get signupPeak() {
    const days = this.stats.value?.signups ?? [];
    return days.reduce((peak, day) => Math.max(peak, day.count), 0);
  }

  async load() {
    this.loading.value = true;
    try {
      this.stats.value = await Api.Class.stats();
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }
}

export namespace StatsModel {
  export const $Class = $StatsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
