import { Reactive } from 'ivue';
import { ref, shallowRef, watch } from 'vue';
import { Api } from '../platform/Api';
import type { SubscriberDetail } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import type { SubscriberTabName } from '../app/AppStore';

// The subscriber modal's model: whichever email address rides the
// route's `subscriber` query, this loads that address's memberships,
// full send history, and the projected pipeline of what arrives next
// (the Worker unrolls the drip's own rule to the end of the archive).
class $SubscriberModel {
  constructor() {
    watch(
      () => this.$app.subscriberEmail,
      (email) => this.onEmailChanged(email),
      { immediate: true },
    );
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get detail() {
    return shallowRef<SubscriberDetail | null>(null);
  }

  get loading() {
    return ref(false);
  }

  // ---- tabs (routable — the active tab lives in the URL) ----
  get TABS(): { name: SubscriberTabName; label: string }[] {
    return [
      { name: 'sent', label: 'Sent' },
      { name: 'upcoming', label: 'Upcoming' },
    ];
  }

  get activeTab(): SubscriberTabName {
    return this.$app.subscriberTab;
  }

  // ---- derived ----
  get isOpen() {
    return Boolean(this.$app.subscriberEmail);
  }

  get email() {
    return this.$app.subscriberEmail;
  }

  get displayName() {
    const named = this.detail.value?.memberships.find(
      (membership) => membership.name,
    );
    return named?.name ?? '';
  }

  // suppression is address-wide: one membership carrying unsubscribedAt
  // means the pipeline is paused for the whole address
  get isSuppressed() {
    return Boolean(
      this.detail.value?.memberships.some(
        (membership) => membership.unsubscribedAt,
      ),
    );
  }

  get history() {
    return this.detail.value?.history ?? [];
  }

  get upcoming() {
    return this.detail.value?.upcoming ?? [];
  }

  get nextUp() {
    return this.upcoming[0] ?? null;
  }

  get cadenceLabel() {
    const detail = this.detail.value;
    if (!detail) return '';
    const days = detail.cadenceDays;
    const hour = detail.sendHourLocal;
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    return `every ${days} day${days === 1 ? '' : 's'} at ${twelveHour}${hour < 12 ? 'am' : 'pm'} — ${detail.timezone}`;
  }

  get isFullyCaughtUp() {
    return Boolean(this.detail.value) && !this.upcoming.length;
  }

  // ---- tabs ----
  isTabOpen(tab: SubscriberTabName) {
    return this.activeTab === tab;
  }

  openTab(tab: SubscriberTabName) {
    this.$app.openSubscriberTab(tab);
  }

  tabLabel(tab: SubscriberTabName) {
    const label = this.TABS.find((entry) => entry.name === tab)?.label ?? tab;
    if (!this.detail.value) return label;
    const count =
      tab === 'sent' ? this.history.length : this.upcoming.length;
    return `${label} (${count})`;
  }

  timezoneLabel(membership: SubscriberDetail['memberships'][number]) {
    return (
      membership.timezone ??
      (this.detail.value?.defaultTimezone ?? '') + ' (default)'
    );
  }

  isNext(position: number) {
    return position === 0;
  }

  pipelinePosition(position: number) {
    return position + 1;
  }

  // ---- actions ----
  onEmailChanged(email: string) {
    this.detail.value = null;
    if (email) this.load(email);
  }

  async load(email: string) {
    this.loading.value = true;
    try {
      this.detail.value = await Api.Class.subscriber(email);
    } catch (error) {
      this.$app.reportFailure(error);
      this.$app.closeSubscriber();
    } finally {
      this.loading.value = false;
    }
  }

  close() {
    this.$app.closeSubscriber();
  }

  // Every history slug previews — the Worker serves the welcome email's
  // preview from its own asset, catalog posts from the catalog.
  openPost(slug: string) {
    this.$app.openEmailPreview(slug);
  }
}

export namespace SubscriberModel {
  export const $Class = $SubscriberModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
