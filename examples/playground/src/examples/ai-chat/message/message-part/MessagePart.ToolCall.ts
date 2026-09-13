import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { ToolCall } from './tool-call/ToolCall';
import ToolCallView from './tool-call/ToolCall.vue';
import { ToolCallBash } from './tool-call/ToolCall.Bash';
import { ToolCallEdit } from './tool-call/ToolCall.Edit';
import { ToolCallRead } from './tool-call/ToolCall.Read';
import { ToolCallWrite } from './tool-call/ToolCall.Write';
import { ToolCallAgent } from './tool-call/ToolCall.Agent';
import { ToolCallSkill } from './tool-call/ToolCall.Skill';
import { ToolCallWebFetch } from './tool-call/ToolCall.WebFetch';
import { ToolCallArtifact } from './tool-call/ToolCall.Artifact';
import { ToolCallTask } from './tool-call/ToolCall.Task';
import { ToolCallMcp } from './tool-call/ToolCall.Mcp';

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
      Generic: { view: ToolCallView, namespace: ToolCall, bind: this.bindCard },
      Mcp: { view: ToolCallView, namespace: ToolCallMcp, bind: this.bindCard },
      Task: { view: ToolCallView, namespace: ToolCallTask, bind: this.bindCard },
      Bash: { view: ToolCallView, namespace: ToolCallBash, bind: this.bindCard },
      Edit: { view: ToolCallView, namespace: ToolCallEdit, bind: this.bindCard },
      NotebookEdit: { view: ToolCallView, namespace: ToolCallEdit, bind: this.bindCard },
      Read: { view: ToolCallView, namespace: ToolCallRead, bind: this.bindCard },
      Write: { view: ToolCallView, namespace: ToolCallWrite, bind: this.bindCard },
      Agent: { view: ToolCallView, namespace: ToolCallAgent, bind: this.bindCard },
      Skill: { view: ToolCallView, namespace: ToolCallSkill, bind: this.bindCard },
      WebFetch: { view: ToolCallView, namespace: ToolCallWebFetch, bind: this.bindCard },
      WebSearch: { view: ToolCallView, namespace: ToolCallWebFetch, bind: this.bindCard },
      Artifact: { view: ToolCallView, namespace: ToolCallArtifact, bind: this.bindCard }
    };
  }

  /** what every card receives from the part: the call, the chat, the message */
  static bindCard({ model }: Kit.Seam<$MessagePartToolCall>): ToolCall.Props {
    return { call: model.call, chat: model.props.chat, message: model.props.message };
  }

  static readonly TASK_TOOLS = /^Task(Create|Update|List|Get|Stop|Output)$/;

  /** the role for a tool name: its own card, then a family by prefix, then the generic card */
  static roleFor(name: string): MessagePartToolCall.Role {
    if (Object.hasOwn(this.$kit, name)) return name as MessagePartToolCall.Role;
    if (name.startsWith('mcp__')) return 'Mcp';
    if (this.TASK_TOOLS.test(name)) return 'Task';
    return 'Generic';
  }

  /** the card for a tool name */
  static toolFor(name: string): Kit.Entry {
    return this.$kit[this.roleFor(name)];
  }

  /** whether a name has a card of its own or a family's */
  static isMapped(name: string): boolean {
    return Object.hasOwn(this.$kit, name) || name.startsWith('mcp__') || this.TASK_TOOLS.test(name);
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

  /** the role a call takes: its tool's card, a family's, or the generic — the one fact of a dispatch */
  override roleOf(call: SessionLog.ToolCall): MessagePartToolCall.Role {
    return this.self.roleFor(call.name);
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
  export type Roles = Kit.Roles<Role, $MessagePartToolCall>;

  export const $Class = Static($MessagePartToolCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = MessagePart.Props<SessionLog.ToolCallPart>;
}
