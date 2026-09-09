import type { Component } from 'vue';
import { Static } from '../../../Static';
import type { SessionLog } from '../SessionLog';
import TextPart from './TextPart.vue';
import ThinkingPart from './ThinkingPart.vue';
import ToolCallPart from './ToolCallPart.vue';
import ToolBatchPart from './ToolBatchPart.vue';
import AttachmentPart from './AttachmentPart.vue';
import SystemPart from './SystemPart.vue';

// The registry: a part kind names its component. Rendering never
// branches on a kind — it looks the kind up — so a new kind is a new
// file and one line here. A kind the map does not know renders as text.
class $Parts {
  static readonly MAP: Record<SessionLog.Part['kind'], Component> = {
    text: TextPart,
    thinking: ThinkingPart,
    tool_call: ToolCallPart,
    tool_batch: ToolBatchPart,
    attachment: AttachmentPart,
    system: SystemPart,
  };

  static componentFor(kind: string): Component {
    return this.MAP[kind as SessionLog.Part['kind']] ?? TextPart;
  }
}

export namespace Parts {
  export const $Class = Static($Parts);
  export let Class = $Class;

  /** every part component takes the part, the chat, and the message it belongs to */
  export interface Props<Part extends SessionLog.Part = SessionLog.Part> {
    part: Part;
    chat: import('../Chat').Chat.Model;
    message: SessionLog.Message | null;
  }
}
