import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { ToolCall } from './tool-calls/ToolCall';
import ToolCallGenericView from './tool-calls/ToolCall.Generic.vue';
import { ToolCallBash } from './tool-calls/ToolCall.Bash';
import ToolCallBashView from './tool-calls/ToolCall.Bash.vue';
import { ToolCallEdit } from './tool-calls/ToolCall.Edit';
import ToolCallEditView from './tool-calls/ToolCall.Edit.vue';
import { ToolCallRead } from './tool-calls/ToolCall.Read';
import ToolCallReadView from './tool-calls/ToolCall.Read.vue';
import { ToolCallWrite } from './tool-calls/ToolCall.Write';
import ToolCallWriteView from './tool-calls/ToolCall.Write.vue';
import { ToolCallAgent } from './tool-calls/ToolCall.Agent';
import ToolCallAgentView from './tool-calls/ToolCall.Agent.vue';
import { ToolCallSkill } from './tool-calls/ToolCall.Skill';
import ToolCallSkillView from './tool-calls/ToolCall.Skill.vue';
import { ToolCallWebFetch } from './tool-calls/ToolCall.WebFetch';
import ToolCallWebFetchView from './tool-calls/ToolCall.WebFetch.vue';
import { ToolCallArtifact } from './tool-calls/ToolCall.Artifact';
import ToolCallArtifactView from './tool-calls/ToolCall.Artifact.vue';
import { ToolCallTask } from './tool-calls/ToolCall.Task';
import ToolCallTaskView from './tool-calls/ToolCall.Task.vue';
import { ToolCallMcp } from './tool-calls/ToolCall.Mcp';
import ToolCallMcpView from './tool-calls/ToolCall.Mcp.vue';

// One tool call: the part that picks the card. Its kit names a card per
// tool, two families by prefix, and the generic card for a name nobody
// mapped, so rendering never branches on a name — it looks the entry up.
// A batch renders each of its calls through this same part, so one
// override of a card here reaches single calls and batches alike.
class $MessagePartToolCall extends KitContainer.$Class<
  MessagePartToolCall.Roles,
  SessionLog.ToolCall
> {
  /** the cards: one per tool name, and three families — the generic card, MCP, and the task tools */
  static override get $kit(): MessagePartToolCall.Roles {
    return {
      Generic: this.entry(ToolCallGenericView, ToolCall),
      Mcp: this.entry(ToolCallMcpView, ToolCallMcp, {
        takes: (call) => call.name.startsWith('mcp__')
      }),
      Task: this.entry(ToolCallTaskView, ToolCallTask, {
        takes: (call) => this.TASK_TOOLS.test(call.name)
      }),
      Bash: this.entry(ToolCallBashView, ToolCallBash, { takes: this.named('Bash') }),
      Edit: this.entry(ToolCallEditView, ToolCallEdit, { takes: this.named('Edit') }),
      NotebookEdit: this.entry(ToolCallEditView, ToolCallEdit, {
        takes: this.named('NotebookEdit')
      }),
      Read: this.entry(ToolCallReadView, ToolCallRead, { takes: this.named('Read') }),
      Write: this.entry(ToolCallWriteView, ToolCallWrite, { takes: this.named('Write') }),
      Agent: this.entry(ToolCallAgentView, ToolCallAgent, { takes: this.named('Agent') }),
      Skill: this.entry(ToolCallSkillView, ToolCallSkill, { takes: this.named('Skill') }),
      WebFetch: this.entry(ToolCallWebFetchView, ToolCallWebFetch, {
        takes: this.named('WebFetch')
      }),
      WebSearch: this.entry(ToolCallWebFetchView, ToolCallWebFetch, {
        takes: this.named('WebSearch')
      }),
      Artifact: this.entry(ToolCallArtifactView, ToolCallArtifact, {
        takes: this.named('Artifact')
      })
    };
  }

  /** the predicate for one tool name */
  static named(name: string) {
    return (call: SessionLog.ToolCall) => call.name === name;
  }

  /** what every card receives from the part: the call, the chat, the message */
  static override bindEntry({ model }: Kit.Seam<$MessagePartToolCall>): ToolCall.Props {
    return { call: model.call, chat: model.props.chat, message: model.props.message };
  }

  static readonly TASK_TOOLS = /^Task(Create|Update|List|Get|Stop|Output)$/;

  /** the card for a tool name: the entry whose `takes` holds, else the generic card */
  static toolFor(name: string): Kit.Entry {
    return this.$kit[this.roleFor({ name } as SessionLog.ToolCall) as MessagePartToolCall.Role];
  }

  /** whether a name has a card of its own or a family's — anything but the fallback */
  static isMapped(name: string): boolean {
    return this.roleFor({ name } as SessionLog.ToolCall) !== 'Generic';
  }

  constructor(public props: MessagePartToolCall.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $MessagePartToolCall;
  }

  get call(): SessionLog.ToolCall {
    return this.props.part.call;
  }
}

export namespace MessagePartToolCall {
  export type Role =
    | 'Generic'
    | 'Mcp'
    | 'Task'
    | 'Bash'
    | 'Edit'
    | 'NotebookEdit'
    | 'Read'
    | 'Write'
    | 'Agent'
    | 'Skill'
    | 'WebFetch'
    | 'WebSearch'
    | 'Artifact';
  export type Roles = Kit.Roles<Role, $MessagePartToolCall, SessionLog.ToolCall>;

  export const $Class = Static($MessagePartToolCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = MessagePart.Props<SessionLog.ToolCallPart>;
}
