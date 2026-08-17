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

  get cadenceHours() {
    return ref(0);
  }

  // the editable cadence — saved to the Worker's D1 settings, effective
  // on the very next drip pass (cron or manual), no deploy involved
  get cadenceDraft() {
    return ref('');
  }

  get savingCadence() {
    return ref(false);
  }

  get loading() {
    return ref(true);
  }

  get cadenceDirty() {
    return Number(this.cadenceDraft.value) !== this.cadenceHours.value;
  }

  get cadenceSaveDisabled() {
    return !this.cadenceDirty || this.savingCadence.value;
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
      this.cadenceDraft.value = String(preview.cadenceHours);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async saveCadence() {
    if (this.cadenceSaveDisabled) return;
    this.savingCadence.value = true;
    try {
      const saved = await Api.Class.saveSettings({
        cadenceHours: Number(this.cadenceDraft.value),
      });
      this.$app.notify(`Cadence is now ${saved.cadenceHours}h.`, 'success');
      await this.load(); // due times shift with the new cadence
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.savingCadence.value = false;
    }
  }
}

export namespace DripModel {
  export const $Class = $DripModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
