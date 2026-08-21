import { Reactive } from 'ivue';
import { ref, shallowRef, watch } from 'vue';
import { Api } from '../platform/Api';
import type { SubscriberDetail } from '../platform/Api';
import { AppStore } from '../app/AppStore';

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
    const hours = this.detail.value?.cadenceHours ?? 0;
    if (!hours) return '';
    return hours % 24 === 0
      ? `every ${hours / 24} day${hours === 24 ? '' : 's'}`
      : `every ${hours} hours`;
  }

  get isFullyCaughtUp() {
    return Boolean(this.detail.value) && !this.upcoming.length;
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
