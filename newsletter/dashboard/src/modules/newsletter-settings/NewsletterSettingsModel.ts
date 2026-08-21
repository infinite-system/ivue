import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { AdminSettings } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// Newsletter settings: the drip cadence (editable, effective next pass)
// and the sender identity readout — the system's whole posture on one
// page.
class $NewsletterSettingsModel {
  constructor() {
    this.load();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get settings() {
    return shallowRef<AdminSettings | null>(null);
  }

  get cadenceDraft() {
    return ref('');
  }

  get saving() {
    return ref(false);
  }

  get loading() {
    return ref(true);
  }

  get cadenceDirty() {
    return (
      Number(this.cadenceDraft.value) !==
      (this.settings.value?.cadenceHours ?? 0)
    );
  }

  get saveDisabled() {
    return !this.cadenceDirty || this.saving.value;
  }

  async load() {
    this.loading.value = true;
    try {
      const settings = await Api.Class.settings();
      this.settings.value = settings;
      this.cadenceDraft.value = String(settings.cadenceHours);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async saveCadence() {
    if (this.saveDisabled) return;
    this.saving.value = true;
    try {
      const saved = await Api.Class.saveSettings({
        cadenceHours: Number(this.cadenceDraft.value),
      });
      this.settings.value = saved;
      this.cadenceDraft.value = String(saved.cadenceHours);
      this.$app.notify(`Cadence is now ${saved.cadenceHours}h.`, 'success');
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.saving.value = false;
    }
  }
}

export namespace NewsletterSettingsModel {
  export const $Class = $NewsletterSettingsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
