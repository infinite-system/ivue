import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import { ToolCallSubThread } from './tool-calls/ToolCall.SubThread';
import ToolCallSubThreadView from './tool-calls/ToolCall.SubThread.vue';
import MessagePartSystemLineView from './MessagePart.System.Line.vue';
import MessagePartSystemDetailView from './MessagePart.System.Detail.vue';
import MessagePartSystemThreadView from './MessagePart.System.Thread.vue';
import { Markdown } from '../../Markdown';
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';

// A system record, by subtype: a compaction is a divider with the
// summary folded under it, a turn duration a quiet timestamp line, a
// hook summary a small card, a folded subagent thread a note.
class $MessagePartSystem extends KitContainer.$Class<MessagePartSystem.Roles> {
  /** the line in its order — the clickable line, the detail it folds, the thread its children form —
   *  and the nested thread's own role, which the Thread leaf hosts */
  static override get $kit(): MessagePartSystem.Roles {
    return {
      Line: { view: MessagePartSystemLineView },
      Detail: { view: MessagePartSystemDetailView },
      Thread: { view: MessagePartSystemThreadView },
      SubThread: {
        view: ToolCallSubThreadView,
        namespace: ToolCallSubThread,
        bind: this.bindThread
      },
      order: ['Line', 'Detail', 'Thread']
    };
  }

  static readonly ICONS: Record<string, string> = {
    compaction: '⟲',
    turn_duration: '◷',
    stop_hook_summary: '⚙',
    subagent: '⑂'
  };

  /** what the folded thread receives: the children a system line carried, and the chat */
  static bindThread({
    model
  }: Kit.Seam<$MessagePartSystem, undefined, typeof ToolCallSubThread>): ToolCallSubThread.Props {
    return { messages: model.children, chat: model.props.chat };
  }

  constructor(public props: MessagePart.Props<SessionLog.SystemPart>) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $MessagePartSystem;
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

  /** the detail — a compaction summary is markdown — rendered like any prose */
  get detailHtml(): string {
    return Markdown.Class.render(this.part.detail);
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

export namespace MessagePartSystem {
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Role = 'Line' | 'Detail' | 'Thread';
  export type Roles = Kit.Roles<Role, $MessagePartSystem> & {
    SubThread: Kit.Entry<$MessagePartSystem, undefined, typeof ToolCallSubThread>;
    order: readonly Role[];
  };

  /** what every leaf of the line receives: its entry and the line model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }
  export const $Class = Static($MessagePartSystem);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
