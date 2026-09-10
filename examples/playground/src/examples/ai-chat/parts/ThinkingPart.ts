import { Reactive } from '../../../ivue';
import { Clock } from '../Clock';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';

// Thinking: while it runs, a loader with the live counter; done, one
// folded line with the duration and the length that expands to the text.
// The counter is the chat's clock read through a getter — no timer here.
class $ThinkingPart {
  constructor(public props: Part.Props<SessionLog.ThinkingPart>) {}

  get part(): SessionLog.ThinkingPart {
    return this.props.part;
  }

  get id(): string {
    return `thinking-${this.props.message?.id ?? 'x'}-${this.props.message?.parts.indexOf(this.part) ?? 0}`;
  }

  get isLive(): boolean {
    return this.part.durationMs === null && this.part.startedAt !== undefined;
  }

  /** open by default: the chat's toggled set holds the thoughts a reader FOLDED */
  get isExpanded(): boolean {
    return !this.props.chat.isExpanded(this.id);
  }

  /** the thought without the trailing newline the log keeps — it would pad the block's bottom */
  get text(): string {
    return this.part.text.replace(/\s+$/, '');
  }

  get elapsedLabel(): string {
    if (this.isLive) return Clock.Class.label(this.props.chat.clock.elapsed(this.part.startedAt ?? Date.now(), null), true);
    return this.part.durationMs !== null ? Clock.Class.label(this.part.durationMs) : '';
  }

  get lengthLabel(): string {
    return `${this.part.text.length.toLocaleString('en-US')} chars`;
  }

  get headLabel(): string {
    if (this.isLive) return `thinking · ${this.elapsedLabel}`;
    return this.elapsedLabel ? `thought for ${this.elapsedLabel} · ${this.lengthLabel}` : `thinking · ${this.lengthLabel}`;
  }

  toggle() {
    this.props.chat.toggle(this.id);
  }
}

export namespace ThinkingPart {
  export const $Class = $ThinkingPart;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
