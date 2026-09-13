import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import type { Component } from 'vue';
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
  /** the cards: a family role per shape of call, and a map of a card per tool name */
  static override get $kit(): MessagePartToolCall.Roles {
    return {
      Generic: this.card(ToolCallGenericView, ToolCall),
      Mcp: this.card(ToolCallMcpView, ToolCallMcp),
      Task: this.card(ToolCallTaskView, ToolCallTask),
      Tools: {
        Bash: this.card(ToolCallBashView, ToolCallBash),
        Edit: this.card(ToolCallEditView, ToolCallEdit),
        NotebookEdit: this.card(ToolCallEditView, ToolCallEdit),
        Read: this.card(ToolCallReadView, ToolCallRead),
        Write: this.card(ToolCallWriteView, ToolCallWrite),
        Agent: this.card(ToolCallAgentView, ToolCallAgent),
        Skill: this.card(ToolCallSkillView, ToolCallSkill),
        WebFetch: this.card(ToolCallWebFetchView, ToolCallWebFetch),
        WebSearch: this.card(ToolCallWebFetchView, ToolCallWebFetch),
        Artifact: this.card(ToolCallArtifactView, ToolCallArtifact)
      }
    };
  }

  /** a card: the view, the class it constructs, and what every card receives */
  static card(view: Component, namespace: Kit.Namespace): Kit.Entry<$MessagePartToolCall> {
    return { view, namespace, bind: this.bindCall };
  }

  /** what a card receives from the part: the call, the chat, the message */
  static bindCall({ model }: Kit.Seam<$MessagePartToolCall>): ToolCall.Props {
    return { call: model.call, chat: model.props.chat, message: model.props.message };
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

  /** the card that renders a call: by name, family, or the generic — a dispatch, so the entry is the fact */
  override entryOf(call: SessionLog.ToolCall): Kit.Entry {
    return this.self.toolFor(call.name);
  }
}

export namespace MessagePartToolCall {
  export type Roles = Kit.Roles<'Generic' | 'Mcp' | 'Task', $MessagePartToolCall> & {
    Tools: Record<string, Kit.Entry<$MessagePartToolCall>>;
  };

  export const $Class = Static($MessagePartToolCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = MessagePart.Props<SessionLog.ToolCallPart>;
}
