import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { ListSummary, PostSummary, SendResult } from '../platform/Api';
import type { AppModel } from '../app/AppModel';

// Sending: a targeted send (specific post → specific addresses, ledger-
// checked, with an explicit force-resend), a whole-list broadcast, and
// the on-demand drip pass. Broadcast and drip arm-then-confirm — one
// click never mails a list.
class $SendModel {
  constructor(public app: AppModel.Instance) {
    this.load();
  }

  get posts() {
    return shallowRef<PostSummary[]>([]);
  }

  get lists() {
    return shallowRef<ListSummary[]>([]);
  }

  // ---- targeted send ----
  get slug() {
    return ref('');
  }

  get recipientsText() {
    return ref('');
  }

  get force() {
    return ref(false);
  }

  get sending() {
    return ref(false);
  }

  get result() {
    return shallowRef<SendResult | null>(null);
  }

  // ---- broadcast + drip (arm-then-confirm) ----
  get broadcastList() {
    return ref('newsletter');
  }

  get broadcastArmed() {
    return ref(false);
  }

  get dripArmed() {
    return ref(false);
  }

  get recipients() {
    return this.recipientsText.value
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  get canSend() {
    return Boolean(this.slug.value) && this.recipients.length > 0;
  }

  async load() {
    try {
      const [catalog, lists] = await Promise.all([
        Api.Class.posts(),
        Api.Class.lists(),
      ]);
      this.posts.value = [...catalog].sort(
        (first, second) => second.timestamp - first.timestamp,
      );
      this.lists.value = lists;
    } catch (error) {
      this.app.reportFailure(error);
    }
  }

  async sendTargeted() {
    if (!this.canSend || this.sending.value) return;
    this.sending.value = true;
    this.result.value = null;
    try {
      const report = await Api.Class.send({
        slug: this.slug.value,
        emails: this.recipients,
        force: this.force.value,
      });
      this.result.value = report;
      this.app.notify(
        `Delivered ${report.delivered}, skipped as repeat ${report.skippedAsRepeat.length}.`,
        report.delivered > 0 ? 'success' : 'info',
      );
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.sending.value = false;
    }
  }

  async confirmBroadcast() {
    if (!this.broadcastArmed.value) {
      this.broadcastArmed.value = true;
      return;
    }
    this.broadcastArmed.value = false;
    if (!this.slug.value) return;
    try {
      const report = await Api.Class.broadcast(
        this.slug.value,
        this.broadcastList.value,
      );
      this.app.notify(
        `Broadcast "${report.slug}": ${report.recipients} sent, ${report.skippedAsRepeat} already had it.`,
        'success',
      );
    } catch (error) {
      this.app.reportFailure(error);
    }
  }

  async confirmDrip() {
    if (!this.dripArmed.value) {
      this.dripArmed.value = true;
      return;
    }
    this.dripArmed.value = false;
    try {
      const outcome = await Api.Class.dripNow();
      this.app.notify(`Drip pass delivered ${outcome.delivered}.`, 'success');
    } catch (error) {
      this.app.reportFailure(error);
    }
  }

  disarm() {
    this.broadcastArmed.value = false;
    this.dripArmed.value = false;
  }
}

export namespace SendModel {
  export const $Class = $SendModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
