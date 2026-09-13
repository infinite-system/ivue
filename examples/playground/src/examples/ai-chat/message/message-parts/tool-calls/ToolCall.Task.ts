import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { ToolCall } from './ToolCall';
import ToolCallCaptionTaskView from './ToolCall.Caption.Task.vue';

// The task tools: a subject, a status, and the note that went with it.
class $ToolCallTask extends ToolCall.$Class {
  /** this card's caption has its own line; every other role is the base's */
  static override get $kit(): ToolCall.Roles {
    return { ...super.$kit, Caption: { view: ToolCallCaptionTaskView } };
  }

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

  override get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [];
    if (this.description)
      sections.push({ title: 'description', code: this.description, lang: 'markdown' });
    if (this.resultText)
      sections.push({
        title: 'result',
        code: this.resultText,
        lang: 'text',
        tone: this.isFailed ? 'error' : 'plain'
      });
    return sections;
  }
}

export namespace ToolCallTask {
  export const $Class = Static($ToolCallTask);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
