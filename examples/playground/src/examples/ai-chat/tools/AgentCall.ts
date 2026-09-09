import { Reactive } from '../../../ivue';
import type { SessionLog } from '../SessionLog';
import { ToolCallModel } from './ToolCallModel';

// A subagent: its description and prompt, its report, and the thread it
// ran folded under it, rendered by the same parts as the main thread.
class $AgentCall extends ToolCallModel.$Class {
  get description(): string {
    return String(this.input.description ?? '');
  }

  get prompt(): string {
    return String(this.input.prompt ?? '');
  }

  get agentType(): string {
    return String(this.input.subagent_type ?? 'general');
  }

  get thread(): SessionLog.Message[] {
    return this.call.children ?? [];
  }

  get hasThread(): boolean {
    return this.thread.length > 0;
  }

  get threadId(): string {
    return `${this.call.id}:thread`;
  }

  get isThreadOpen(): boolean {
    return this.chat.isExpanded(this.threadId);
  }

  get threadLabel(): string {
    const count = this.thread.length;
    return `${this.isThreadOpen ? 'hide' : 'show'} the subagent's thread · ${count.toLocaleString('en-US')} message${count === 1 ? '' : 's'}`;
  }

  get modelLabel(): string {
    const structured = this.structured;
    return typeof structured.resolvedModel === 'string' ? structured.resolvedModel : '';
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [];
    if (this.prompt) sections.push({ title: 'prompt', code: this.prompt, lang: 'markdown' });
    if (this.resultText) sections.push({ title: 'report', code: this.resultText, lang: 'markdown', tone: this.isFailed ? 'error' : 'plain' });
    return sections;
  }

  toggleThread() {
    this.chat.toggle(this.threadId);
  }
}

export namespace AgentCall {
  export const $Class = $AgentCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
