import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import { MessagePartText } from './MessagePart.Text';
import MessagePartTextView from './MessagePart.Text.vue';
import { MessagePartThinking } from './MessagePart.Thinking';
import MessagePartThinkingView from './MessagePart.Thinking.vue';
import { MessagePartAttachment } from './MessagePart.Attachment';
import MessagePartAttachmentView from './MessagePart.Attachment.vue';
import { MessagePartSystem } from './MessagePart.System';
import MessagePartSystemView from './MessagePart.System.vue';
import { MessagePartToolCall } from './MessagePart.ToolCall';
import MessagePartToolCallView from './MessagePart.ToolCall.vue';
import { MessagePartToolBatch } from './MessagePart.ToolBatch';
import MessagePartToolBatchView from './MessagePart.ToolBatch.vue';
import type { Chat } from '../../Chat';
import type { MessagePart } from './MessagePart';
import type { SessionLog } from '../../SessionLog';

// The parts of one message as a list: every part renders through the entry
// this kit names for its kind, fed the part as the seam's item and a key
// that survives streaming. The row hands the list its parts, the chat and
// the message; the list owns which role a part takes and what identifies it.
class $MessagePartList extends KitContainer.$Class<MessagePartList.Roles, SessionLog.Part> {
  /** a role per part kind — built once per class by Static(); a subclass with its own swaps the leaves */
  static override get $kit(): MessagePartList.Roles {
    return {
      Text: this.entry(MessagePartTextView, MessagePartText),
      Thinking: this.entry(MessagePartThinkingView, MessagePartThinking),
      Attachment: this.entry(MessagePartAttachmentView, MessagePartAttachment),
      System: this.entry(MessagePartSystemView, MessagePartSystem),
      ToolCall: this.entry(MessagePartToolCallView, MessagePartToolCall),
      ToolBatch: this.entry(MessagePartToolBatchView, MessagePartToolBatch)
    };
  }

  /** what every part receives from the list: its part, the chat, the message — the seam's item is the part */
  static override bindEntry({
    model,
    item
  }: Kit.Seam<$MessagePartList, SessionLog.Part>): MessagePart.Props {
    return { part: item, chat: model.chat, message: model.message };
  }

  /** a part kind (the log's snake_case) names its role (the kit's PascalCase) */
  static readonly PART_ROLES: Record<SessionLog.Part['kind'], MessagePartList.Role> = {
    text: 'Text',
    thinking: 'Thinking',
    attachment: 'Attachment',
    system: 'System',
    tool_call: 'ToolCall',
    tool_batch: 'ToolBatch'
  };

  constructor(public props: MessagePartList.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $MessagePartList;
  }

  get parts(): SessionLog.Part[] {
    return this.props.parts;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get message(): SessionLog.Message | null {
    return this.props.message;
  }

  /** the role a part takes: its kind's, or Text for a kind nobody mapped */
  override roleOf(part: SessionLog.Part): MessagePartList.Role {
    const role = this.self.PART_ROLES[part.kind];
    return role && role in this.kit ? role : 'Text';
  }

  /** what identifies a part in the list: a call's id, a batch's first call, else its kind and place */
  override keyOf(part: SessionLog.Part, at: number): string {
    if (part.kind === 'tool_call') return part.call.id;
    if (part.kind === 'tool_batch') return `batch-${part.calls[0]?.id ?? at}`;
    return `${part.kind}-${at}`;
  }
}

export namespace MessagePartList {
  export const $Class = Static($MessagePartList);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    parts: SessionLog.Part[];
    chat: Chat.Model;
    message: SessionLog.Message | null;
    /** the entry this view was rendered through: the class it constructs */
    kit?: Kit.Entry;
  }

  export type Role = 'Text' | 'Thinking' | 'Attachment' | 'System' | 'ToolCall' | 'ToolBatch';
  export type Roles = Kit.Roles<Role, $MessagePartList, SessionLog.Part>;
}
