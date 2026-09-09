import { Reactive } from '../../../ivue';
import { ToolCallModel } from './ToolCallModel';

// The task tools: a subject, a status, and the note that went with it.
class $TaskCall extends ToolCallModel.$Class {
  get verb(): string {
    return this.name.replace(/^Task/, '').toLowerCase() || 'task';
  }

  get subject(): string {
    const task = this.structured.task as { subject?: string } | undefined;
    return String(this.input.subject ?? task?.subject ?? this.input.taskId ?? '');
  }

  get status(): string {
    return String(this.input.status ?? '');
  }

  get description(): string {
    return String(this.input.description ?? '');
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [];
    if (this.description) sections.push({ title: 'description', code: this.description, lang: 'markdown' });
    if (this.resultText) sections.push({ title: 'result', code: this.resultText, lang: 'text', tone: this.isFailed ? 'error' : 'plain' });
    return sections;
  }
}

export namespace TaskCall {
  export const $Class = $TaskCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
