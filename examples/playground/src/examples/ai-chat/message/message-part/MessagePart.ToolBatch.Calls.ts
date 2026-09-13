import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import { MessagePartToolCall } from './MessagePart.ToolCall';
import MessagePartToolCallView from './MessagePart.ToolCall.vue';
import type { Chat } from '../../Chat';
import type { MessagePart } from './MessagePart';
import type { SessionLog } from '../../SessionLog';

// The calls of a batch as a list: every call renders through the one Call
// role — the same part a single call renders through — fed the call as a
// part, the chat and the message. The batch hands the list its calls and
// whether it is open; the list owns what identifies a call.
class $MessagePartToolBatchCalls extends KitContainer.$Class<
  MessagePartToolBatchCalls.Roles,
  SessionLog.ToolCall
> {
  static override get $kit(): MessagePartToolBatchCalls.Roles {
    return {
      Call: { view: MessagePartToolCallView, namespace: MessagePartToolCall, bind: this.bindCall }
    };
  }

  /** what a call's card receives: the call as a part, the chat, the message */
  static bindCall({
    model,
    item
  }: Kit.Seam<
    $MessagePartToolBatchCalls,
    SessionLog.ToolCall
  >): MessagePart.Props<SessionLog.ToolCallPart> {
    return { part: model.partFor(item), chat: model.chat, message: model.message };
  }

  constructor(public props: MessagePartToolBatchCalls.Props) {
    super();
  }

  protected override get self() {
    return this.constructor as typeof $MessagePartToolBatchCalls;
  }

  get calls(): SessionLog.ToolCall[] {
    return this.props.calls;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get message(): SessionLog.Message | null {
    return this.props.message;
  }

  get isExpanded(): boolean {
    return this.props.expanded;
  }

  /** a call as the single-call part reads it, so a batch renders through the same seam */
  partFor(call: SessionLog.ToolCall): SessionLog.ToolCallPart {
    return { kind: 'tool_call', call };
  }

  override keyOf(call: SessionLog.ToolCall): string {
    return call.id;
  }
}

export namespace MessagePartToolBatchCalls {
  export const $Class = Static($MessagePartToolBatchCalls);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    calls: SessionLog.ToolCall[];
    chat: Chat.Model;
    message: SessionLog.Message | null;
    expanded: boolean;
    kit?: Kit.Entry;
  }

  export type Roles = Kit.Roles<'Call', $MessagePartToolBatchCalls, SessionLog.ToolCall>;
}
