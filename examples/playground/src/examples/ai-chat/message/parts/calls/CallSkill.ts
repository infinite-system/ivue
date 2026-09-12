import { Reactive } from '../../../../../ivue';
import { CallToolModel } from './CallToolModel';

// A skill invocation: the skill's name and its arguments; the result is
// the skill's instructions, folded as markdown.
class $CallSkill extends CallToolModel.$Class {
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

  override get sections(): CallToolModel.Section[] {
    const sections: CallToolModel.Section[] = [];
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

export namespace CallSkill {
  export const $Class = $CallSkill;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
