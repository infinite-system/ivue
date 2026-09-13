import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { Kit } from '../../../../../kit/Kit';
import { KitContainer } from '../../../../../kit/KitContainer';
import { ChatMessage } from '../../ChatMessage';
import ChatMessageView from '../../ChatMessage.vue';
import type { Chat } from '../../../Chat';
import type { SessionLog } from '../../../SessionLog';

// A nested thread (a subagent's run) inside a card: the messages as
// rows the message component understands, rendered in flow — a nested
// thread is short, so it is not virtualized.
class $ToolCallSubThread extends KitContainer.$Class<ToolCallSubThread.Roles, Chat.Row> {
  /** the one role a thread composes: a row per message, the same row the top thread renders */
  static override get $kit(): ToolCallSubThread.Roles {
    return {
      Message: { view: ChatMessageView, namespace: ChatMessage, bind: this.bindRow }
    };
  }

  /** what a row receives from the thread: itself and the chat */
  static bindRow({ model, item }: Kit.Seam<$ToolCallSubThread, Chat.Row>): ChatMessage.Props {
    return { row: item, chat: model.props.chat };
  }

  constructor(public props: ToolCallSubThread.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ToolCallSubThread;
  }

  get rows(): Chat.Row[] {
    return this.props.messages.map((message, at) => ({
      id: message.id,
      body: '',
      position: String(at + 1),
      index: at,
      page: -1,
      speaker: message.speaker,
      preview: '',
      calls: message.parts.filter((part) => part.kind === 'tool_call' || part.kind === 'tool_batch')
        .length,
      at: message.timestamp,
      message
    }));
  }

  get countLabel(): string {
    const count = this.rows.length;
    return `${count.toLocaleString('en-US')} message${count === 1 ? '' : 's'}`;
  }

  override keyOf(row: Chat.Row): string {
    return row.id;
  }
}

export namespace ToolCallSubThread {
  export type Roles = Kit.Roles<'Message', $ToolCallSubThread, Chat.Row>;

  export const $Class = Static($ToolCallSubThread);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    messages: SessionLog.Message[];
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}
