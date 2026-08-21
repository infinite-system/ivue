import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { AdminSettings } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// Socials settings: the tweet template ({title}/{url} placeholders) and
// the X credential status with the setup runbook.
class $SocialsSettingsModel {
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

  get templateDraft() {
    return ref('');
  }

  get saving() {
    return ref(false);
  }

  get loading() {
    return ref(true);
  }

  get templateDirty() {
    return (
      this.templateDraft.value.trim() !==
      (this.settings.value?.tweetTemplate ?? '')
    );
  }

  get saveDisabled() {
    return !this.templateDirty || this.saving.value;
  }

  get xConfigured() {
    return this.settings.value?.xConfigured ?? false;
  }

  async load() {
    this.loading.value = true;
    try {
      const settings = await Api.Class.settings();
      this.settings.value = settings;
      this.templateDraft.value = settings.tweetTemplate;
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async saveTemplate() {
    if (this.saveDisabled) return;
    this.saving.value = true;
    try {
      const saved = await Api.Class.saveSettings({
        tweetTemplate: this.templateDraft.value.trim(),
      });
      this.settings.value = saved;
      this.templateDraft.value = saved.tweetTemplate;
      this.$app.notify('Tweet template saved.', 'success');
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.saving.value = false;
    }
  }
}

export namespace SocialsSettingsModel {
  export const $Class = $SocialsSettingsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
