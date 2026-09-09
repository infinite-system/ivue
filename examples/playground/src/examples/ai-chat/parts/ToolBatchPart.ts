import { Reactive } from '../../../ivue';
import { Clock } from '../Clock';
import type { SessionLog } from '../SessionLog';
import { ToolCallModel } from '../tools/ToolCallModel';
import type { Parts } from './Parts';

// A run of tool calls as one row: the count, the tools' icons in order,
// the combined time, a mark if any failed. It opens to its calls, each
// collapsed and each with its own state, so the batch and a call never
// reset each other.
class $ToolBatchPart {
  constructor(public props: Parts.Props<SessionLog.ToolBatchPart>) {}

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

  get icons(): { key: string; icon: string; name: string }[] {
    return this.calls.map((call) => ({ key: call.id, icon: ToolCallModel.Class.ICONS[call.name] ?? (call.name.startsWith('mcp__') ? '⌘' : '⚙'), name: call.name }));
  }

  get namesLabel(): string {
    const counts = new Map<string, number>();
    for (const call of this.calls) counts.set(call.name, (counts.get(call.name) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name)).join(', ');
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
      const running = this.calls.find((call) => call.state === 'running' || call.state === 'pending');
      return running?.startedAt ? Clock.Class.label(this.props.chat.clock.elapsed(running.startedAt, null), true) : '';
    }
    return this.totalMs ? Clock.Class.label(this.totalMs) : '';
  }

  get batchClass(): Record<string, boolean> {
    return { 'ac-batch-open': this.isExpanded, 'ac-batch-failed': this.hasFailure, 'ac-batch-running': this.isRunning };
  }

  get toggleLabel(): string {
    return this.isExpanded ? '▾' : '▸';
  }

  toggle() {
    this.props.chat.toggle(this.id);
  }
}

export namespace ToolBatchPart {
  export const $Class = $ToolBatchPart;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
