import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { DripPlanEntry } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// The drip preview — the exact plan the next cron tick executes, because
// the Worker computes both from the same Drip.plan().
class $DripModel {
  constructor() {
    this.load();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get entries() {
    return shallowRef<DripPlanEntry[]>([]);
  }

  get cadenceDays() {
    return ref(0);
  }

  get sendHourLocal() {
    return ref(0);
  }

  get defaultTimezone() {
    return ref('');
  }

  get scheduleLabel() {
    const days = this.cadenceDays.value;
    if (!days) return '';
    return `one email every ${days} day${days === 1 ? '' : 's'}, at ${this.hourLabel} in each subscriber's own timezone`;
  }

  get hourLabel() {
    const hour = this.sendHourLocal.value;
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelveHour}${hour < 12 ? 'am' : 'pm'}`;
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
      this.cadenceDays.value = preview.cadenceDays;
      this.sendHourLocal.value = preview.sendHourLocal;
      this.defaultTimezone.value = preview.defaultTimezone;
    } catch (error) {
      this.$app.reportFailure(error);
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
