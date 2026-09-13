import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import { Icons } from '../../Icons';
import { MessagePartToolBatchCalls } from './MessagePart.ToolBatch.Calls';
import MessagePartToolBatchCallsView from './MessagePart.ToolBatch.Calls.vue';
import MessagePartToolBatchHeadView from './MessagePart.ToolBatch.Head.vue';
import { Clock } from '../../Clock';
import type { SessionLog } from '../../SessionLog';
import { ToolCall } from './tool-calls/ToolCall';
import type { MessagePart } from './MessagePart';

// A run of tool calls as one row: the count, the tools' icons in order,
// the combined time, a mark if any failed. It opens to its calls, each
// collapsed and each with its own state, so the batch and a call never
// reset each other.
class $MessagePartToolBatch extends KitContainer.$Class<MessagePartToolBatch.Roles> {
  /** the batch in its order: its one row, then its calls as a list of their own */
  static override get $kit(): MessagePartToolBatch.Roles {
    return {
      Head: { view: MessagePartToolBatchHeadView },
      Calls: {
        view: MessagePartToolBatchCallsView,
        namespace: MessagePartToolBatchCalls,
        bind: this.bindCalls
      },
      order: ['Head', 'Calls']
    };
  }

  /** what the calls list receives from the batch: the calls, the chat, the message, and whether it is open */
  static bindCalls({ model }: Kit.Seam<$MessagePartToolBatch>): MessagePartToolBatchCalls.Props {
    return {
      calls: model.calls,
      chat: model.props.chat,
      message: model.props.message,
      expanded: model.isExpanded
    };
  }

  constructor(public props: MessagePart.Props<SessionLog.ToolBatchPart>) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $MessagePartToolBatch;
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
  get icons(): MessagePartToolBatch.IconGroup[] {
    const groups = new Map<string, MessagePartToolBatch.IconGroup>();
    for (const call of this.calls) {
      const icon =
        ToolCall.Class.ICONS[call.name] ??
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
    return Icons.Class.PATHS.chevron;
  }

  get timeClass(): Record<string, boolean> {
    return { 'ac-state-failed': this.hasFailure };
  }

  toggle() {
    this.props.chat.toggle(this.id);
  }
}

export namespace MessagePartToolBatch {
  export type Role = 'Head' | 'Calls';
  export type Roles = Kit.Roles<'Head', $MessagePartToolBatch> & {
    Calls: Kit.Entry<$MessagePartToolBatch, undefined, typeof MessagePartToolBatchCalls>;
    order: readonly Role[];
  };

  /** what every leaf of the batch receives: its entry and the batch model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }

  export interface IconGroup {
    key: string;
    icon: string;
    name: string;
    count: number;
    isMany: boolean;
  }

  export const $Class = Static($MessagePartToolBatch);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
