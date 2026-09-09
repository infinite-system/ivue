import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';

// A system record, by subtype: a compaction is a divider with the
// summary folded under it, a turn duration a quiet timestamp line, a
// hook summary a small card, a folded subagent thread a note.
class $SystemPart {
  static readonly ICONS: Record<string, string> = { compaction: '⟲', turn_duration: '◷', stop_hook_summary: '⚙', subagent: '⑂' };

  constructor(public props: Parts.Props<SessionLog.SystemPart>) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $SystemPart;
  }

  get part(): SessionLog.SystemPart {
    return this.props.part;
  }

  get id(): string {
    return `system-${this.props.message?.id ?? 'x'}`;
  }

  get icon(): string {
    return this.self.ICONS[this.part.subtype] ?? '·';
  }

  get subtypeClass(): string {
    return `ac-system-${this.part.subtype.replace(/[^a-z0-9]+/gi, '-')}`;
  }

  get hasDetail(): boolean {
    return this.part.detail.trim().length > 0 || Boolean(this.props.message?.children?.length);
  }

  get isExpanded(): boolean {
    return this.props.chat.isExpanded(this.id);
  }

  get toggleLabel(): string {
    return this.isExpanded ? 'hide' : 'show';
  }

  get childCount(): number {
    return this.props.message?.children?.length ?? 0;
  }

  get showsDetail(): boolean {
    return this.isExpanded && this.part.detail.trim().length > 0;
  }

  get children(): SessionLog.Message[] {
    return this.props.message?.children ?? [];
  }

  get showsThread(): boolean {
    return this.isExpanded && this.childCount > 0;
  }

  toggle() {
    if (this.hasDetail) this.props.chat.toggle(this.id);
  }
}

export namespace SystemPart {
  export const $Class = Static($SystemPart);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
