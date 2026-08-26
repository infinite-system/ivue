import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { AdminSettings, ListSummary } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// Newsletter settings: the drip clock — cadence in days, send hour in
// the subscriber's LOCAL time, the default timezone for addresses with
// no captured zone — plus per-list overrides (blank = inherit the
// defaults), and the sender identity readout.
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

  get lists() {
    return shallowRef<ListSummary[]>([]);
  }

  // ---- drafts (defaults) ----
  get cadenceDaysDraft() {
    return ref('');
  }

  get sendHourDraft() {
    return ref('');
  }

  get defaultTimezoneDraft() {
    return ref('');
  }

  // per-list drafts, keyed by list name; '' = inherit the default
  get listCadenceDrafts() {
    return ref<Record<string, string>>({});
  }

  get listSendHourDrafts() {
    return ref<Record<string, string>>({});
  }

  get saving() {
    return ref(false);
  }

  get loading() {
    return ref(true);
  }

  // ---- derived ----
  get isDirty() {
    const settings = this.settings.value;
    if (!settings) return false;
    if (this.cadenceDaysDraft.value !== String(settings.cadenceDays))
      return true;
    if (this.sendHourDraft.value !== String(settings.sendHourLocal))
      return true;
    if (this.defaultTimezoneDraft.value !== settings.defaultTimezone)
      return true;
    return this.lists.value.some((entry) => {
      const override = settings.listOverrides[entry.list] ?? {};
      return (
        this.listCadenceDrafts.value[entry.list] !==
          this.draftOf(override.cadenceDays) ||
        this.listSendHourDrafts.value[entry.list] !==
          this.draftOf(override.sendHourLocal)
      );
    });
  }

  get saveDisabled() {
    return !this.isDirty || this.saving.value;
  }

  get saveButtonLabel() {
    return this.saving.value ? 'Saving…' : 'Save schedule';
  }

  // the label under the form: what the current drafts MEAN
  get scheduleSummary() {
    const days = Number(this.cadenceDaysDraft.value);
    const hour = Number(this.sendHourDraft.value);
    if (!Number.isInteger(days) || !Number.isInteger(hour)) return '';
    return `One email every ${days} day${days === 1 ? '' : 's'}, at ${this.hourLabel(hour)} in each subscriber's own timezone.`;
  }

  cadenceLabel(list: string) {
    return `Cadence for ${list}`;
  }

  sendHourLabel(list: string) {
    return `Send hour for ${list}`;
  }

  hourLabel(hour: number) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return '—';
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelveHour}${hour < 12 ? 'am' : 'pm'}`;
  }

  draftOf(value: number | undefined) {
    return value === undefined ? '' : String(value);
  }

  effectiveCadence(list: string) {
    return (
      this.listCadenceDrafts.value[list] || this.cadenceDaysDraft.value || '—'
    );
  }

  effectiveSendHour(list: string) {
    const draft =
      this.listSendHourDrafts.value[list] || this.sendHourDraft.value;
    return draft === '' ? '—' : this.hourLabel(Number(draft));
  }

  // ---- actions ----
  async load() {
    this.loading.value = true;
    try {
      const [settings, lists] = await Promise.all([
        Api.Class.settings(),
        Api.Class.lists(),
      ]);
      this.applySettings(settings, lists);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  applySettings(settings: AdminSettings, lists?: ListSummary[]) {
    this.settings.value = settings;
    if (lists) this.lists.value = lists;
    this.cadenceDaysDraft.value = String(settings.cadenceDays);
    this.sendHourDraft.value = String(settings.sendHourLocal);
    this.defaultTimezoneDraft.value = settings.defaultTimezone;
    const cadenceDrafts: Record<string, string> = {};
    const sendHourDrafts: Record<string, string> = {};
    for (const entry of this.lists.value) {
      const override = settings.listOverrides[entry.list] ?? {};
      cadenceDrafts[entry.list] = this.draftOf(override.cadenceDays);
      sendHourDrafts[entry.list] = this.draftOf(override.sendHourLocal);
    }
    this.listCadenceDrafts.value = cadenceDrafts;
    this.listSendHourDrafts.value = sendHourDrafts;
  }

  async saveSchedule() {
    if (this.saveDisabled) return;
    this.saving.value = true;
    try {
      const listSchedules: Record<
        string,
        { cadenceDays: number | null; sendHourLocal: number | null }
      > = {};
      for (const entry of this.lists.value) {
        const cadenceDraft = this.listCadenceDrafts.value[entry.list] ?? '';
        const sendHourDraft = this.listSendHourDrafts.value[entry.list] ?? '';
        listSchedules[entry.list] = {
          cadenceDays: cadenceDraft === '' ? null : Number(cadenceDraft),
          sendHourLocal: sendHourDraft === '' ? null : Number(sendHourDraft),
        };
      }
      const saved = await Api.Class.saveSettings({
        cadenceDays: Number(this.cadenceDaysDraft.value),
        sendHourLocal: Number(this.sendHourDraft.value),
        defaultTimezone: this.defaultTimezoneDraft.value.trim(),
        listSchedules,
      });
      this.applySettings(saved);
      this.$app.notify('Drip schedule saved.', 'success');
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
