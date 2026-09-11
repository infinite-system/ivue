import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { ToolCallModel } from '../tools/ToolCallModel';
import GenericCallView from '../tools/GenericCall.vue';
import { BashCall } from '../tools/BashCall';
import BashCallView from '../tools/BashCall.vue';
import { EditCall } from '../tools/EditCall';
import EditCallView from '../tools/EditCall.vue';
import { ReadCall } from '../tools/ReadCall';
import ReadCallView from '../tools/ReadCall.vue';
import { WriteCall } from '../tools/WriteCall';
import WriteCallView from '../tools/WriteCall.vue';
import { AgentCall } from '../tools/AgentCall';
import AgentCallView from '../tools/AgentCall.vue';
import { SkillCall } from '../tools/SkillCall';
import SkillCallView from '../tools/SkillCall.vue';
import { WebFetchCall } from '../tools/WebFetchCall';
import WebFetchCallView from '../tools/WebFetchCall.vue';
import { ArtifactCall } from '../tools/ArtifactCall';
import ArtifactCallView from '../tools/ArtifactCall.vue';
import { TaskCall } from '../tools/TaskCall';
import TaskCallView from '../tools/TaskCall.vue';
import { McpCall } from '../tools/McpCall';
import McpCallView from '../tools/McpCall.vue';

// One tool call: the part that picks the card. Its kit names a card per
// tool, two families by prefix, and the generic card for a name nobody
// mapped, so rendering never branches on a name — it looks the entry up.
// A batch renders each of its calls through this same part, so one
// override of a card here reaches single calls and batches alike.
class $ToolCallPart {
  static get $kit() {
    return {
      Generic: { namespace: ToolCallModel, view: GenericCallView },
      Mcp: { namespace: McpCall, view: McpCallView },
      Task: { namespace: TaskCall, view: TaskCallView },
      Tools: {
        Bash: { namespace: BashCall, view: BashCallView },
        Edit: { namespace: EditCall, view: EditCallView },
        NotebookEdit: { namespace: EditCall, view: EditCallView },
        Read: { namespace: ReadCall, view: ReadCallView },
        Write: { namespace: WriteCall, view: WriteCallView },
        Agent: { namespace: AgentCall, view: AgentCallView },
        Skill: { namespace: SkillCall, view: SkillCallView },
        WebFetch: { namespace: WebFetchCall, view: WebFetchCallView },
        WebSearch: { namespace: WebFetchCall, view: WebFetchCallView },
        Artifact: { namespace: ArtifactCall, view: ArtifactCallView }
      } as Record<string, Kit.Entry>
    };
  }

  static readonly TASK_TOOLS = /^Task(Create|Update|List|Get|Stop|Output)$/;

  /** the card for a tool name: exact, then family by prefix, then the generic card */
  static toolFor(name: string): Kit.Entry {
    const kit = this.$kit;
    const exact = kit.Tools[name];
    if (exact) return exact;
    if (name.startsWith('mcp__')) return kit.Mcp;
    if (this.TASK_TOOLS.test(name)) return kit.Task;
    return kit.Generic;
  }

  /** whether a name has a card of its own or a family's */
  static isMapped(name: string): boolean {
    return name in this.$kit.Tools || name.startsWith('mcp__') || this.TASK_TOOLS.test(name);
  }

  constructor(public props: ToolCallPart.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ToolCallPart;
  }

  get kit() {
    return this.self.$kit;
  }

  get call(): SessionLog.ToolCall {
    return this.props.part.call;
  }

  /** the entry that renders this call */
  get card(): Kit.Entry {
    return this.self.toolFor(this.call.name);
  }
}

export namespace ToolCallPart {
  export const $Class = Static($ToolCallPart);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = Part.Props<SessionLog.ToolCallPart>;
}
