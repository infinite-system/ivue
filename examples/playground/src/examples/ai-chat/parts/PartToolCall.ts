import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { CallToolModel } from '../tools/CallToolModel';
import CallGenericView from '../tools/CallGeneric.vue';
import { CallBash } from '../tools/CallBash';
import CallBashView from '../tools/CallBash.vue';
import { CallEdit } from '../tools/CallEdit';
import CallEditView from '../tools/CallEdit.vue';
import { CallRead } from '../tools/CallRead';
import CallReadView from '../tools/CallRead.vue';
import { CallWrite } from '../tools/CallWrite';
import CallWriteView from '../tools/CallWrite.vue';
import { CallAgent } from '../tools/CallAgent';
import CallAgentView from '../tools/CallAgent.vue';
import { CallSkill } from '../tools/CallSkill';
import CallSkillView from '../tools/CallSkill.vue';
import { CallWebFetch } from '../tools/CallWebFetch';
import CallWebFetchView from '../tools/CallWebFetch.vue';
import { CallArtifact } from '../tools/CallArtifact';
import CallArtifactView from '../tools/CallArtifact.vue';
import { CallTask } from '../tools/CallTask';
import CallTaskView from '../tools/CallTask.vue';
import { CallMcp } from '../tools/CallMcp';
import CallMcpView from '../tools/CallMcp.vue';

// One tool call: the part that picks the card. Its kit names a card per
// tool, two families by prefix, and the generic card for a name nobody
// mapped, so rendering never branches on a name — it looks the entry up.
// A batch renders each of its calls through this same part, so one
// override of a card here reaches single calls and batches alike.
class $PartToolCall {
  static get $kit() {
    return {
      Generic: { view: CallGenericView, namespace: CallToolModel },
      Mcp: { view: CallMcpView, namespace: CallMcp },
      Task: { view: CallTaskView, namespace: CallTask },
      Tools: {
        Bash: { view: CallBashView, namespace: CallBash },
        Edit: { view: CallEditView, namespace: CallEdit },
        NotebookEdit: { view: CallEditView, namespace: CallEdit },
        Read: { view: CallReadView, namespace: CallRead },
        Write: { view: CallWriteView, namespace: CallWrite },
        Agent: { view: CallAgentView, namespace: CallAgent },
        Skill: { view: CallSkillView, namespace: CallSkill },
        WebFetch: { view: CallWebFetchView, namespace: CallWebFetch },
        WebSearch: { view: CallWebFetchView, namespace: CallWebFetch },
        Artifact: { view: CallArtifactView, namespace: CallArtifact }
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

  constructor(public props: PartToolCall.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $PartToolCall;
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

export namespace PartToolCall {
  export const $Class = Static($PartToolCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = Part.Props<SessionLog.PartToolCall>;
}
