import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { Icons } from '../Icons';
import { ToolCallPart } from './ToolCallPart';
import ToolCallPartView from './ToolCallPart.vue';
import { Clock } from '../Clock';
import type { SessionLog } from '../SessionLog';
import { ToolCallModel } from '../tools/ToolCallModel';
import type { Part } from './Part';

// A run of tool calls as one row: the count, the tools' icons in order,
// the combined time, a mark if any failed. It opens to its calls, each
// collapsed and each with its own state, so the batch and a call never
// reset each other.
class $ToolBatchPart {
  /** the one role a batch composes: the part that picks a card per call */
  static get $kit() {
    return {
      Call: { namespace: ToolCallPart, view: ToolCallPartView }
    } satisfies Kit.Of<'Call'>;
  }

  constructor(public props: Part.Props<SessionLog.ToolBatchPart>) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ToolBatchPart;
  }

  get kit() {
    return this.self.$kit;
  }

  get part(): SessionLog.ToolBatchPart {
    return this.props.part;
  }

  get calls(): SessionLog.ToolCall[] {
    return this.part.calls;
  }

  get id(): string {
    return `batch-${this.calls[0]?.id ?? 'x'}`;
  }

  get isExpanded(): boolean {
    return this.props.chat.isExpanded(this.id);
  }

  get count(): number {
    return this.calls.length;
  }

  get countLabel(): string {
    return `${this.count} tool calls`;
  }

  /** one icon per kind of call, with how many: `❯⁴ ✎²` rather than a row of four dollars */
  get icons(): ToolBatchPart.IconGroup[] {
    const groups = new Map<string, ToolBatchPart.IconGroup>();
    for (const call of this.calls) {
      const icon =
        ToolCallModel.Class.ICONS[call.name] ??
        (call.name.startsWith('mcp__') ? '⌘' : call.name.startsWith('Task') ? '☑' : '⚙');
      const group = groups.get(icon);
      if (group) {
        group.count += 1;
        group.isMany = true;
      } else groups.set(icon, { key: icon, icon, name: call.name, count: 1, isMany: false });
    }
    return [...groups.values()];
  }

  get namesLabel(): string {
    const counts = new Map<string, number>();
    for (const call of this.calls) counts.set(call.name, (counts.get(call.name) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
      .join(', ');
  }

  get hasFailure(): boolean {
    return this.calls.some((call) => call.state === 'failed');
  }

  get isRunning(): boolean {
    return this.calls.some((call) => call.state === 'pending' || call.state === 'running');
  }

  get totalMs(): number {
    return this.calls.reduce((total, call) => total + (call.durationMs ?? 0), 0);
  }

  get timeLabel(): string {
    if (this.isRunning) {
      const running = this.calls.find(
        (call) => call.state === 'running' || call.state === 'pending'
      );
      return running?.startedAt
        ? Clock.Class.label(this.props.chat.clock.elapsed(running.startedAt, null), true)
        : '';
    }
    return this.totalMs ? Clock.Class.label(this.totalMs) : '';
  }

  get batchClass(): Record<string, boolean> {
    return {
      'ac-batch-open': this.isExpanded,
      'ac-batch-failed': this.hasFailure,
      'ac-batch-running': this.isRunning
    };
  }

  /** one chevron; the batch's open class turns it */
  get chevronIcon(): string {
    return Icons.$Class.PATHS.chevron;
  }

  toggle() {
    this.props.chat.toggle(this.id);
  }

  /** a call as the single-call part reads it, so a batch renders through the same seam */
  partFor(call: SessionLog.ToolCall): SessionLog.ToolCallPart {
    return { kind: 'tool_call', call };
  }
}

export namespace ToolBatchPart {
  export interface IconGroup {
    key: string;
    icon: string;
    name: string;
    count: number;
    isMany: boolean;
  }

  export const $Class = Static($ToolBatchPart);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
