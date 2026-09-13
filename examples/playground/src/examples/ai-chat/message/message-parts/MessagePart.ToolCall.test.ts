/*
=== GENERATOR ===
Goal: Prove rendering never branches on a tool name: every mapped name resolves to its card's entry, an MCP name and a task name resolve by family, a name nobody mapped resolves to the generic card, and a batch renders its calls through this same part — so one override of a card, as a subclass of this part, reaches single calls and batches alike.
[Rendering is a kit](../../ai-chat.invariants.md#rendering-is-a-kit)
// domain-invariant: $MessagePartToolCall — If a tool name is not mapped, then the generic card's entry renders it; an MCP name and a task name map by family; the lookup reads the part's own kit, so a subclass swaps a card by naming another entry
Impossible if true: a tool name reaches a renderer that branches on it

=== GENERATOR-DESCRIBED ===
$MessagePartToolCall is the part that picks a card: its kit is the map from a tool name to a card's entry, with two families by prefix and the generic fallback; a batch renders each call through it.
*/
import { describe, expect, it } from 'vitest';
import { Kit } from '../../../../kit/Kit';
import type { SessionLog } from '../../SessionLog';
import { MessagePartToolCall } from './MessagePart.ToolCall';
import { MessagePartToolBatch } from './MessagePart.ToolBatch';
import { ToolCallBash } from './tool-calls/ToolCall.Bash';
import ToolCallBashView from './tool-calls/ToolCall.Bash.vue';
import { ToolCallMcp } from './tool-calls/ToolCall.Mcp';
import { ToolCallTask } from './tool-calls/ToolCall.Task';
import { ToolCall } from './tool-calls/ToolCall';
import ToolCallGenericView from './tool-calls/ToolCall.Generic.vue';

describe('PartToolCall', () => {
  // invariant: Rendering is a kit (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  // domain-invariant: $MessagePartToolCall — If a tool name is not mapped, then the generic card's entry renders it; an MCP name and a task name map by family; the lookup reads the part's own kit, so a subclass swaps a card by naming another entry
  // impossible-if-true: $MessagePartToolCall — a tool name reaches a renderer that branches on it
  it("maps every known name, MCP and task names by family, and falls back to the generic card — through the part's own kit", () => {
    expect(MessagePartToolCall.Class.toolFor('Bash')).toMatchObject({
      view: ToolCallBashView,
      namespace: ToolCallBash
    });
    expect(MessagePartToolCall.Class.toolFor('mcp__playwright__browser_snapshot').namespace).toBe(
      ToolCallMcp
    );
    expect(MessagePartToolCall.Class.toolFor('TaskUpdate').namespace).toBe(ToolCallTask);
    expect(MessagePartToolCall.Class.toolFor('NeverHeardOfIt')).toMatchObject({
      view: ToolCallGenericView,
      namespace: ToolCall
    });
    expect(MessagePartToolCall.Class.isMapped('Edit')).toBe(true);
    expect(MessagePartToolCall.Class.isMapped('mcp__x__y')).toBe(true);
    expect(MessagePartToolCall.Class.isMapped('NeverHeardOfIt')).toBe(false);
    // a layer swaps one card's view and class; what the card takes is the base entry's and survives
    const QuietPart = Kit.Class.derive(MessagePartToolCall, {
      Bash: { view: ToolCallGenericView, namespace: ToolCall }
    }).$Class;
    expect(QuietPart.toolFor('Bash').namespace).toBe(ToolCall);
    expect(QuietPart.isMapped('Bash')).toBe(true);
    expect(MessagePartToolCall.Class.toolFor('Bash').namespace).toBe(ToolCallBash);
    // a batch renders its calls through this part, so the swap reaches batches too
    expect(MessagePartToolBatch.Class.$kit.Call.namespace).toBe(MessagePartToolCall);
    // a layer adds a card by data: an entry that says which name it takes
    const WithGrep = Kit.Class.derive(MessagePartToolCall, {
      Grep: { view: 'pre', takes: (call: SessionLog.ToolCall) => call.name === 'Grep' }
    });
    expect(WithGrep.$Class.toolFor('Grep').view).toBe('pre');
    expect(WithGrep.$Class.isMapped('Grep')).toBe(true);
    expect(MessagePartToolCall.Class.isMapped('Grep')).toBe(false);
  });
});
