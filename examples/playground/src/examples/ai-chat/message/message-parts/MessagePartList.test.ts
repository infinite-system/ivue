/*
=== GENERATOR ===
Goal: Prove the parts of a message are a compositor of their own: every part renders through the entry the list's kit names for its kind, a kind nobody mapped renders through Text, the seam hands a part its entry beside `{ part, chat, message }` from the list's one bind, and a part's key survives streaming — a call by its id, a batch by its first call, anything else by kind and place.
[The seam is built by one method that never names a role](../../ai-chat.invariants.md#the-seam-is-built-by-one-method-that-never-names-a-role)
// domain-invariant: $MessagePartList — If a part is rendered, then its role is its kind's or Text, its entry is that role's, and its props are the list's bind over the seam with the part as the item
Impossible if true: the list's template names a part kind, or the row knows which role a part takes

=== GENERATOR-DESCRIBED ===
$MessagePartList extends KitContainer: `roleOf` and `keyOf` are the two facts it
supplies, `entryOf`, `viewOf` and `propsOf` fall out, and `bindEntry` is the one
bind every entry built by `entry()` carries. No thread is needed: the props are
the parts, the chat and the message, and every getter reads them.
*/
import { describe, expect, it } from 'vitest';
import { MessagePartList } from './MessagePartList';
import { MessagePartText } from './MessagePart.Text';
import type { Chat } from '../../Chat';
import type { SessionLog } from '../../SessionLog';

const textPart: SessionLog.Part = { kind: 'text', text: 'hello' };
const callPart = {
  kind: 'tool_call',
  call: { id: 'call-7', name: 'Bash' }
} as unknown as SessionLog.Part;
const batchPart = { kind: 'tool_batch', calls: [{ id: 'call-8' }] } as unknown as SessionLog.Part;
const message = { id: 'm1', parts: [textPart, callPart] } as unknown as SessionLog.Message;
const chat = {} as Chat.Model;

describe('the parts of a message are a compositor of their own', () => {
  // domain-invariant: $MessagePartList — If a part is rendered, then its role is its kind's or Text, its entry is that role's, and its props are the list's bind over the seam with the part as the item
  // impossible-if-true: $MessagePartList — the list's template names a part kind, or the row knows which role a part takes
  // invariant: The seam is built by one method that never names a role (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('roleOf, entryOf, viewOf and propsOf follow the kit by kind, and an unmapped kind renders through Text', () => {
    const list = new MessagePartList.Class({ parts: message.parts, chat, message });
    expect(list.roleOf(textPart)).toBe('Text');
    expect(list.roleOf(callPart)).toBe('ToolCall');
    expect(list.entryOf(textPart)).toBe(list.kit.Text);
    expect(list.entryOf(textPart).namespace).toBe(MessagePartText);
    expect(list.viewOf(textPart)).toBe(list.kit.Text.view);
    expect(list.propsOf(textPart, 0)).toEqual({
      kit: list.kit.Text,
      part: textPart,
      chat,
      message
    });
    const unknown = { kind: 'hologram', text: 'x' } as unknown as SessionLog.Part;
    expect(list.roleOf(unknown)).toBe('Text');
    expect(list.entryOf(unknown)).toBe(list.kit.Text);
  });

  it("a key is a call id, a batch's first call, or the kind and place", () => {
    const list = new MessagePartList.Class({ parts: message.parts, chat, message });
    expect(list.keyOf(callPart, 0)).toBe('call-7');
    expect(list.keyOf(batchPart, 4)).toBe('batch-call-8');
    expect(list.keyOf(textPart, 3)).toBe('text-3');
  });
});
