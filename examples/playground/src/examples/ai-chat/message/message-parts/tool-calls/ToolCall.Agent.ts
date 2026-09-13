import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import type { SessionLog } from '../../../SessionLog';
import { ToolCall } from './ToolCall';
import ToolCallCaptionAgentView from './ToolCall.Caption.Agent.vue';

// A subagent: its description and prompt, its report, and the thread it
// ran folded under it, rendered by the same parts as the main thread.
class $ToolCallAgent extends ToolCall.$Class {
  /** this card's caption has its own line; every other role is the base's */
  static override get $kit(): ToolCall.Roles {
    return { ...super.$kit, Caption: { view: ToolCallCaptionAgentView } };
  }

  get description(): string {
    return String(this.input.description ?? '');
  }

  get prompt(): string {
    return String(this.input.prompt ?? '');
  }

  get agentType(): string {
    return String(this.input.subagent_type ?? 'general');
  }

  get modelLabel(): string {
    const structured = this.structured;
    return typeof structured.resolvedModel === 'string' ? structured.resolvedModel : '';
  }

  override get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [];
    if (this.prompt) sections.push({ title: 'prompt', code: this.prompt, lang: 'markdown' });
    if (this.resultText)
      sections.push({
        title: 'report',
        code: this.resultText,
        lang: 'markdown',
        tone: this.isFailed ? 'error' : 'plain'
      });
    return sections;
  }
}

export namespace ToolCallAgent {
  export const $Class = Static($ToolCallAgent);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
