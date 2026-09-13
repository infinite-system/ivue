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
// the message; the entries say which kind each takes, the list says what identifies one.
class $MessagePartList extends KitContainer.$Class<MessagePartList.Roles, SessionLog.Part> {
  /** a role per part kind, each saying which kind it takes; Text takes none and so takes the rest —
   *  built once per class by Static(); a layer adds a kind by adding an entry */
  static override get $kit(): MessagePartList.Roles {
    return {
      Text: this.entry(MessagePartTextView, MessagePartText),
      Thinking: this.entry(MessagePartThinkingView, MessagePartThinking, {
        takes: this.kind('thinking')
      }),
      Attachment: this.entry(MessagePartAttachmentView, MessagePartAttachment, {
        takes: this.kind('attachment')
      }),
      System: this.entry(MessagePartSystemView, MessagePartSystem, { takes: this.kind('system') }),
      ToolCall: this.entry(MessagePartToolCallView, MessagePartToolCall, {
        takes: this.kind('tool_call')
      }),
      ToolBatch: this.entry(MessagePartToolBatchView, MessagePartToolBatch, {
        takes: this.kind('tool_batch')
      })
    };
  }

  /** the predicate for one part kind */
  static kind(kind: SessionLog.Part['kind']) {
    return (part: SessionLog.Part) => part.kind === kind;
  }

  /** what every part receives from the list: its part, the chat, the message — the seam's item is the part */
  static override bindEntry({
    model,
    item
  }: Kit.Seam<$MessagePartList, SessionLog.Part>): MessagePart.Props {
    return { part: item, chat: model.chat, message: model.message };
  }

  constructor(public props: MessagePartList.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $MessagePartList;
  }

  /** the parts grow in place while a reply streams, so the list re-reads the chat's revision — the
   *  array is the same object; the revision is what says it changed */
  get parts(): SessionLog.Part[] {
    void this.chat.revision.value;
    return this.props.parts;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get message(): SessionLog.Message | null {
    return this.props.message;
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
