import { Reactive } from 'ivue';
import { Notify } from 'quasar';
import { onMounted, ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { PressExpression, PressQueue, PressQueueJob, ScheduledJob } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';
import { PressKinds } from './PressKinds';

// The queue — every pending job soonest first with its expression
// resolved, the expressions that came due on a platform without an API
// (copy and mark sent), and the recent executions.
class $QueueModel {
  protected get $app() {
    return AppStore.use();
  }

  constructor() {
    onMounted(() => this.load());
  }

  get queue() {
    return shallowRef<PressQueue>({ upcoming: [], recent: [], due: [] });
  }

  get loading() {
    return ref(false);
  }

  get copiedId() {
    return ref<number | null>(null);
  }

  get upcoming(): PressQueueJob[] {
    return this.queue.value.upcoming;
  }

  get due(): (PressExpression & { pieceTitle: string })[] {
    return this.queue.value.due;
  }

  get recent(): ScheduledJob[] {
    return this.queue.value.recent;
  }

  get isEmpty(): boolean {
    return !this.loading.value && !this.upcoming.length && !this.due.length;
  }

  async load() {
    this.loading.value = true;
    try {
      this.queue.value = await Api.Class.pressQueue();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  jobLabel(job: PressQueueJob): string {
    if (job.expression) return `${PressKinds.Class.label(job.expression.kind)}${job.expression.venue ? ` @ ${job.expression.venue}` : ''}`;
    return `${job.kind} ${job.payload.slug ?? job.payload.text?.slice(0, 40) ?? ''}`;
  }

  jobText(job: PressQueueJob): string {
    const expression = job.expression;
    if (!expression) return '';
    return this.textOf(expression);
  }

  textOf(expression: PressExpression): string {
    if (expression.children) return expression.children.filter((child) => !child.skipped).map((child) => child.body).join('\n\n');
    return expression.body;
  }

  dueLabel(unixSeconds: number): string {
    return `${Format.Class.dateTime(unixSeconds)} · ${PressKinds.Class.easternTime(unixSeconds)} ET · ${Format.Class.relativeDue(unixSeconds)}`;
  }

  resultLabel(job: ScheduledJob): string {
    if (!job.result) return '—';
    if (job.result.error) return `error: ${job.result.error}`;
    return job.result.detail ?? (job.result.ok ? 'ok' : 'skipped');
  }

  openPiece(expression: PressExpression) {
    this.$app.openPiece(expression.pieceId);
  }

  async cancel(job: PressQueueJob) {
    try {
      if (job.expression) await Api.Class.pressAct(job.expression.id, 'cancel');
      else await Api.Class.scheduleCancel(job.id);
      Notify.create({ message: 'Job cancelled' });
      await this.load();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  async copy(expression: PressExpression) {
    const text = this.textOf(expression);
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.value = expression.id;
      setTimeout(() => this.clearCopied(expression.id), 1400);
    } catch {
      Notify.create({ type: 'negative', message: 'Copy failed — select the text instead' });
    }
  }

  clearCopied(id: number) {
    if (this.copiedId.value === id) this.copiedId.value = null;
  }

  copyLabel(expression: PressExpression): string {
    return this.copiedId.value === expression.id ? 'Copied ✓' : 'Copy';
  }

  async markSent(expression: PressExpression) {
    const url = window.prompt('Where did it go? (URL, optional)') ?? '';
    try {
      await Api.Class.pressAct(expression.id, 'sent', { url: url.trim() || undefined });
      Notify.create({ type: 'positive', message: 'Marked sent — the ledger has it' });
      await this.load();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }
}

export namespace QueueModel {
  export const $Class = $QueueModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
