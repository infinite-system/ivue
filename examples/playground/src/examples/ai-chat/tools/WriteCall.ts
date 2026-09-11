import { Reactive } from '../../../ivue';
import { ToolCallModel } from './ToolCallModel';

// A write: the whole file as written, highlighted by its extension,
// with line numbers from one.
class $WriteCall extends ToolCallModel.$Class {
  get filePath(): string {
    return this.pathLabel(this.input.file_path);
  }

  get language(): string {
    return this.languageFor(this.input.file_path);
  }

  get content(): string {
    return String(this.input.content ?? '');
  }

  get lineCountLabel(): string {
    const lines = this.content ? this.content.split('\n').length : 0;
    return `${lines.toLocaleString('en-US')} lines`;
  }

  get wasOverwrite(): boolean {
    const patch = this.structured.structuredPatch;
    return Array.isArray(patch) && patch.length > 0;
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [
      { title: this.filePath, code: this.content, lang: this.language, startLine: 1 }
    ];
    if (this.isFailed && this.resultText)
      sections.push({ title: 'error', code: this.resultText, lang: 'text', tone: 'error' });
    return sections;
  }
}

export namespace WriteCall {
  export const $Class = $WriteCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
