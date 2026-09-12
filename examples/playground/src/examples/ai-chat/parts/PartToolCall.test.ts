/*
=== GENERATOR ===
Goal: Prove rendering never branches on a tool name: every mapped name resolves to its card's entry, an MCP name and a task name resolve by family, a name nobody mapped resolves to the generic card, and a batch renders its calls through this same part — so one override of a card, as a subclass of this part, reaches single calls and batches alike.
[Rendering is a kit](../ai-chat.invariants.md#rendering-is-a-kit)
// domain-invariant: $PartToolCall — If a tool name is not mapped, then the generic card's entry renders it; an MCP name and a task name map by family; the lookup reads the part's own kit, so a subclass swaps a card by naming another entry
Impossible if true: a tool name reaches a renderer that branches on it

=== GENERATOR-DESCRIBED ===
$PartToolCall is the part that picks a card: its kit is the map from a tool name to a card's entry, with two families by prefix and the generic fallback; a batch renders each call through it.
*/
import { describe, expect, it } from 'vitest';
import { Static } from '../../../Static';
import { PartToolCall } from './PartToolCall';
import { PartToolBatch } from './PartToolBatch';
import { CallBash } from '../tools/CallBash';
import CallBashView from '../tools/CallBash.vue';
import { CallMcp } from '../tools/CallMcp';
import { CallTask } from '../tools/CallTask';
import { CallToolModel } from '../tools/CallToolModel';
import CallGenericView from '../tools/CallGeneric.vue';

describe('PartToolCall', () => {
  // invariant: Rendering is a kit (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  // domain-invariant: $PartToolCall — If a tool name is not mapped, then the generic card's entry renders it; an MCP name and a task name map by family; the lookup reads the part's own kit, so a subclass swaps a card by naming another entry
  // impossible-if-true: $PartToolCall — a tool name reaches a renderer that branches on it
  it("maps every known name, MCP and task names by family, and falls back to the generic card — through the part's own kit", () => {
    expect(PartToolCall.Class.toolFor('Bash')).toEqual({ view: CallBashView, namespace: CallBash });
    expect(PartToolCall.Class.toolFor('mcp__playwright__browser_snapshot').namespace).toBe(CallMcp);
    expect(PartToolCall.Class.toolFor('TaskUpdate').namespace).toBe(CallTask);
    expect(PartToolCall.Class.toolFor('NeverHeardOfIt')).toEqual({
      view: CallGenericView,
      namespace: CallToolModel
    });
    expect(PartToolCall.Class.isMapped('Edit')).toBe(true);
    expect(PartToolCall.Class.isMapped('mcp__x__y')).toBe(true);
    expect(PartToolCall.Class.isMapped('NeverHeardOfIt')).toBe(false);
    // a subclass swaps one card by naming another entry; the base map is untouched
    class $QuietPart extends PartToolCall.$Class {
      static override get $kit() {
        return { ...super.$kit, Tools: { ...super.$kit.Tools, Bash: super.$kit.Generic } };
      }
    }
    const QuietPart = Static($QuietPart);
    expect(QuietPart.toolFor('Bash').namespace).toBe(CallToolModel);
    expect(PartToolCall.Class.toolFor('Bash').namespace).toBe(CallBash);
    // a batch renders its calls through this part, so the swap reaches batches too
    expect(PartToolBatch.Class.$kit.Call.namespace).toBe(PartToolCall);
  });
});
