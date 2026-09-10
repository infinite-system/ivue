import type { Kit } from '../../../kit/Kit';
import type { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';

// What every part view receives: the part, the chat, the message it
// belongs to, and the entry the row's kit rendered it through. Types
// only, in a file of their own, so the SFC compiler resolves them
// without walking the row model's imports.
export namespace Part {
  export interface Props<Part extends SessionLog.Part = SessionLog.Part> {
    part: Part;
    chat: Chat.Model;
    message: SessionLog.Message | null;
    kit?: Kit.Entry;
  }
}
