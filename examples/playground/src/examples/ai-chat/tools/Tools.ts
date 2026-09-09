import type { Component } from 'vue';
import { Static } from '../../../Static';
import BashCall from './BashCall.vue';
import EditCall from './EditCall.vue';
import ReadCall from './ReadCall.vue';
import WriteCall from './WriteCall.vue';
import AgentCall from './AgentCall.vue';
import SkillCall from './SkillCall.vue';
import WebFetchCall from './WebFetchCall.vue';
import ArtifactCall from './ArtifactCall.vue';
import TaskCall from './TaskCall.vue';
import McpCall from './McpCall.vue';
import GenericCall from './GenericCall.vue';

// The registry: a tool name names its component. Rendering never
// branches on a name — it looks the name up. An MCP tool (any
// `mcp__server__tool`) and the task tools share a component by prefix;
// a name nobody mapped gets the generic card, so a new tool in a file
// never breaks the page.
class $Tools {
  static readonly MAP: Record<string, Component> = {
    Bash: BashCall,
    Edit: EditCall,
    NotebookEdit: EditCall,
    Read: ReadCall,
    Write: WriteCall,
    Agent: AgentCall,
    Skill: SkillCall,
    WebFetch: WebFetchCall,
    WebSearch: WebFetchCall,
    Artifact: ArtifactCall,
  };

  static componentFor(name: string): Component {
    const exact = this.MAP[name];
    if (exact) return exact;
    if (name.startsWith('mcp__')) return McpCall;
    if (/^Task(Create|Update|List|Get|Stop|Output)$/.test(name)) return TaskCall;
    return GenericCall;
  }

  /** the name a card shows for a mapped tool, or the name as written */
  static isMapped(name: string): boolean {
    return name in this.MAP || name.startsWith('mcp__') || /^Task/.test(name);
  }
}

export namespace Tools {
  export const $Class = Static($Tools);
  export let Class = $Class;
}
