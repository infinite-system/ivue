/*
=== GENERATOR ===
Goal: Prove the row is a container of roles: its sections render in the kit's `order`, presence is one named method per role, every seam is built by one method that reads the entry and never the role's name, a part travels as the seam's item through the entry's bind, and the tree variants a reader picks are patches over that order — a dropped gutter is `without`, a rule is a tag role inserted `after`, a receipt above the parts is a `move` — never a copied template.
[Rendering is a kit](../ai-chat.invariants.md#rendering-is-a-kit)
[The seam is built by one method that never names a role](../ai-chat.invariants.md#the-seam-is-built-by-one-method-that-never-names-a-role)
[A tree variant is a patch over the row's order](../ai-chat.invariants.md#a-tree-variant-is-a-patch-over-the-rows-order)
// domain-invariant: $ChatMessage — If a section role is asked whether it shows, then the stub and the parts are the two states of one row, the await line shows only while the reply has nothing, the foot only with a receipt, and every other role always
// domain-invariant: $ChatMessage — If a seam is built for a role, then a section receives `{ model, kit }` and the parts list receives the message's parts, the chat and the message from the row's one bind
// domain-invariant: $ChatMessage — If a chat patch carries a subkit for the row and the row's subkit one for the parts list, then the part it names renders through the swapped view with the list's own bind, and every shipped kit on the path is untouched
Impossible if true: a row's template names a section, or seam() branches on a role

=== GENERATOR-DESCRIBED ===
$ChatMessage reads the chat through a stub here — a revision, a streaming
slot, the focus and page probes — because the row's own decisions never
need a thread: `shows` and `seam` are plain methods over the props.
The variants are read through ChatVariants, the file that derives them, so
the spec proves the shipped catalog and not a copy of its patches.
*/
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { Kit } from '../../../kit/Kit';
import { KitInspect } from '../../../kit/KitInspect';
import { Chat } from '../Chat';
import { MessagePartList } from './message-parts/MessagePartList';
import { ChatMessage } from './ChatMessage';
import type { SessionLog } from '../SessionLog';
import { ChatVariants } from '../variants/ChatVariants';

/** The chat as the row reads it: a revision to subscribe to, a streaming slot, and the probes. */
function stubChat(streaming: Chat.Streaming | null = null): Chat.Model {
  return {
    revision: ref(0),
    streaming: ref(streaming),
    scroller: ref(null),
    clock: { elapsed: () => 0 },
    isFocused: () => false,
    isPagePending: () => false,
    pageStartedAt: () => 0
  } as unknown as Chat.Model;
}

function row(message: SessionLog.Message | null): Chat.Row {
  return {
    id: 'm1',
    body: '',
    position: '1',
    index: 0,
    page: 0,
    speaker: 'assistant',
    preview: 'a preview',
    calls: 0,
    at: 1_000,
    message
  } as Chat.Row;
}

const textPart: SessionLog.TextPart = { kind: 'text', text: 'hello' };
const reply: SessionLog.Message = {
  id: 'm1',
  index: 0,
  speaker: 'assistant',
  timestamp: 1_000,
  parts: [textPart],
  sidechain: false,
  usage: { input_tokens: 1, output_tokens: 42 },
  durationMs: 1_200
} as SessionLog.Message;

/** The row's resolved kit inside a variant: the Message entry's namespace, its `$kit`. */
function messageKit(tree: string) {
  const chat = ChatVariants.Class.tree(tree).namespace.$Class.$kit!;
  const entry = chat.Message as Kit.Entry;
  return entry.namespace!.$Class.$kit as Record<string, Kit.Entry> & { order: readonly string[] };
}

describe('the row is a container of roles', () => {
  // domain-invariant: $ChatMessage — If a section role is asked whether it shows, then the stub and the parts are the two states of one row, the await line shows only while the reply has nothing, the foot only with a receipt, and every other role always
  // invariant: Rendering is a kit (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('shows() names presence per role: stub or parts, the await line while empty, the foot with a receipt', () => {
    const stub = new ChatMessage.Class({ row: row(null), chat: stubChat() });
    expect(ChatMessage.Class.$kit.order).toEqual([
      'Gutter',
      'Header',
      'Stub',
      'MessagePartList',
      'Await',
      'Footer'
    ]);
    expect(stub.kit.order.map((role) => stub.shows(role))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false
    ]);
    const loaded = new ChatMessage.Class({ row: row(reply), chat: stubChat() });
    expect(loaded.kit.order.map((role) => loaded.shows(role))).toEqual([
      true,
      true,
      false,
      true,
      false,
      true
    ]);
    expect(loaded.receiptLabel).toBe('42 tokens · 1.2s');
    const empty = {
      ...reply,
      parts: [],
      usage: undefined,
      durationMs: undefined
    } as SessionLog.Message;
    const awaiting = new ChatMessage.Class({
      row: row(empty),
      chat: stubChat({
        row: row(empty),
        message: empty,
        firstTokenAt: null,
        thinking: null,
        startedAt: 0
      } as Chat.Streaming)
    });
    expect(awaiting.shows('Await')).toBe(true);
    expect(awaiting.shows('Footer')).toBe(false);
  });

  // domain-invariant: $ChatMessage — If a seam is built for a role, then a section receives `{ model, kit }` and the parts list receives the message's parts, the chat and the message from the row's one bind
  // impossible-if-true: $ChatMessage — a row's template names a section, or seam() branches on a role
  // invariant: The seam is built by one method that never names a role (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('seam() hands a section the model and its entry, and the parts list what it renders — one method, no role named', () => {
    const chat = stubChat();
    const model = new ChatMessage.Class({ row: row(reply), chat });
    for (const role of model.kit.order.filter((role) => role !== 'MessagePartList')) {
      const seam = model.seam(role);
      expect(seam).toEqual({ model, kit: model.kit[role] });
      expect(seam.kit).toBe(model.kit[role]);
    }
    // the parts are a compositor of their own: the row's one bind hands the list what it renders
    expect(model.seam('MessagePartList')).toEqual({
      kit: model.kit.MessagePartList,
      parts: [textPart],
      chat,
      message: reply
    });
    // the method is the kit's: a tag role added by a layer receives only its bind, through the same call
    const Ruled = Kit.Class.derive(ChatMessage, {
      order: { after: { Header: ['Rule'] } },
      Rule: { view: 'hr', bind: () => ({ class: 'ac-rule' }) }
    });
    const ruled = new (Ruled.Class as typeof ChatMessage.Class)({ row: row(reply), chat });
    expect(ruled.seam('Rule' as ChatMessage.Role)).toEqual({ class: 'ac-rule' });
    expect(ruled.kit.order).toEqual([
      'Gutter',
      'Header',
      'Rule',
      'Stub',
      'MessagePartList',
      'Await',
      'Footer'
    ]);
  });

  // invariant: A tree variant is a patch over the row's order (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('bubbles, minimal and compact are patches over the order — nothing copied, the shipped row untouched', () => {
    expect(messageKit('shipped').order).toEqual([
      'Gutter',
      'Header',
      'Stub',
      'MessagePartList',
      'Await',
      'Footer'
    ]);
    expect(messageKit('bubbles').order).toEqual([
      'Header',
      'Stub',
      'MessagePartList',
      'Await',
      'Footer'
    ]);
    expect(messageKit('bubbles').Header.view).not.toBe(messageKit('shipped').Header.view);
    expect(messageKit('minimal').order).toEqual(['Header', 'Stub', 'MessagePartList', 'Await']);
    const compact = messageKit('compact');
    expect(compact.order).toEqual(['Header', 'Rule', 'Stub', 'Footer', 'MessagePartList', 'Await']);
    expect(compact.Rule.view).toBe('hr');
    expect(compact.Rule.namespace).toBeUndefined();
    expect(compact.Header.view).toBe(messageKit('shipped').Header.view); // untouched, the shipped head
    const model = new ChatMessage.Class({ row: row(reply), chat: stubChat() });
    expect(Kit.Class.seam(model, compact.Rule)).toEqual({ class: 'ac-rule' });
    expect(Kit.Class.seam(model, compact.Footer)).toEqual({
      model,
      kit: compact.Footer,
      class: 'ac-foot-lead'
    });
    expect(ChatMessage.Class.$kit.order).toEqual([
      'Gutter',
      'Header',
      'Stub',
      'MessagePartList',
      'Await',
      'Footer'
    ]);
    expect(ChatVariants.Class.tree('compact').namespace.layer).toBe('compact');
    expect(KitInspect.Class.tree(ChatVariants.Class.tree('compact').namespace)).toContain(
      '1 Rule: view <hr> · class - · bind yes · view←compact, bind←compact, position←compact'
    );
  });

  // domain-invariant: $ChatMessage — If a chat patch carries a subkit for the row and the row's subkit one for the parts list, then the part it names renders through the swapped view with the list's own bind, and every shipped kit on the path is untouched
  // invariant: A tree variant is a patch over the row's order (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('a subkit reaches two levels down — chat, row, parts list — and swaps one part view over the same bind', () => {
    const Themed = Kit.Class.derive(
      Chat,
      { Message: { subkit: { MessagePartList: { subkit: { Text: { view: 'pre' } } } } } },
      'themed'
    );
    const rowEntry = Themed.$Class.$kit.Message as Kit.Entry;
    const listEntry = (rowEntry.namespace!.$Class.$kit as Record<string, Kit.Entry>)
      .MessagePartList;
    const parts = listEntry.namespace!.$Class.$kit as Record<string, Kit.Entry>;
    expect(parts.Text.view).toBe('pre');
    expect(parts.Text.namespace).toBe(MessagePartList.$Class.$kit.Text.namespace);
    expect(parts.Text.bind).toBe(MessagePartList.$Class.$kit.Text.bind);
    expect(parts.Thinking).toBe(MessagePartList.$Class.$kit.Thinking);
    expect(MessagePartList.$Class.$kit.Text.view).not.toBe('pre');
    expect(ChatMessage.$Class.$kit.MessagePartList.namespace).toBe(MessagePartList);
    const DerivedList = listEntry.namespace!.Class as typeof MessagePartList.Class;
    const list = new DerivedList({ parts: [textPart], chat: stubChat(), message: null });
    expect(list.viewOf(textPart)).toBe('pre');
    expect(list.propsOf(textPart, 0)).toMatchObject({ part: textPart, message: null });
    expect(KitInspect.Class.tree(Themed)).toMatch(/Text: view <pre> .* view←themed/);
  });
});
