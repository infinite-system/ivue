import { Reactive } from '../../../../../ivue';
import { ToolCall } from './ToolCall';

// A skill invocation: the skill's name and its arguments; the result is
// the skill's instructions, folded as markdown.
class $ToolCallSkill extends ToolCall.$Class {
  get skill(): string {
    return String(this.input.skill ?? this.input.name ?? '');
  }

  get args(): string {
    return String(this.input.args ?? '');
  }

  get succeeded(): boolean {
    return this.structured.success !== false && !this.isFailed;
  }

  get statusLabel(): string {
    return this.succeeded ? 'loaded' : 'failed';
  }

  get statusClass(): Record<string, boolean> {
    return { 'ac-state-failed': !this.succeeded };
  }

  override get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [];
    if (this.args) sections.push({ title: 'arguments', code: this.args, lang: 'text' });
    if (this.resultText)
      sections.push({
        title: 'loaded',
        code: this.resultText,
        lang: 'markdown',
        tone: this.isFailed ? 'error' : 'plain'
      });
    return sections;
  }
}

export namespace ToolCallSkill {
  export const $Class = $ToolCallSkill;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
