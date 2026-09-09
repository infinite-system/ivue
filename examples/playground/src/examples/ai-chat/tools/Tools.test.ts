/*
=== GENERATOR ===
Goal: Prove rendering never branches on a tool name: every mapped name resolves to its card, an MCP name and a task name resolve by prefix, and a name nobody mapped resolves to the generic card rather than failing.
[Rendering is a registry](../ai-chat.invariants.md#rendering-is-a-registry)
// domain-invariant: $Tools — If a tool name is not mapped, then the generic card renders it; an MCP name maps by prefix
Impossible if true: a tool name reaches a renderer that branches on it

=== GENERATOR-DESCRIBED ===
$Tools is the registry from a tool name to the card that renders it, with prefix families and a generic fallback.
*/
import { describe, expect, it } from 'vitest';
import { Tools } from './Tools';
import BashCall from './BashCall.vue';
import McpCall from './McpCall.vue';
import TaskCall from './TaskCall.vue';
import GenericCall from './GenericCall.vue';

describe('Tools', () => {
  // invariant: Rendering is a registry (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  // domain-invariant: $Tools — If a tool name is not mapped, then the generic card renders it; an MCP name maps by prefix
  // impossible-if-true: $Tools — a tool name reaches a renderer that branches on it
  it('maps every known name, MCP and task names by prefix, and falls back to the generic card', () => {
    expect(Tools.Class.componentFor('Bash')).toBe(BashCall);
    expect(Tools.Class.componentFor('mcp__playwright__browser_snapshot')).toBe(McpCall);
    expect(Tools.Class.componentFor('TaskUpdate')).toBe(TaskCall);
    expect(Tools.Class.componentFor('NeverHeardOfIt')).toBe(GenericCall);
    expect(Tools.Class.isMapped('Edit')).toBe(true);
    expect(Tools.Class.isMapped('mcp__x__y')).toBe(true);
    expect(Tools.Class.isMapped('NeverHeardOfIt')).toBe(false);
  });
});
