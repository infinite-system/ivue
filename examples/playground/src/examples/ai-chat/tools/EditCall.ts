import { Reactive } from '../../../ivue';
import { ToolCallModel } from './ToolCallModel';

// An edit: a unified diff of old against new with the file path as its
// header. The structured patch the tool recorded is the source when it
// exists; the call's own old and new strings otherwise.
class $EditCall extends ToolCallModel.$Class {
  get filePath(): string {
    return this.pathLabel(this.input.file_path ?? this.input.notebook_path);
  }

  get language(): string {
    return this.languageFor(this.input.file_path ?? this.input.notebook_path);
  }

  get replacesAll(): boolean {
    return Boolean(this.input.replace_all);
  }

  get hunks(): EditCall.Hunk[] {
    const patch = this.structured.structuredPatch;
    return Array.isArray(patch)
      ? (patch as EditCall.Hunk[]).filter((hunk) => Array.isArray(hunk.lines))
      : [];
  }

  /** the unified diff: hunks from the record, or a plain remove-then-add from the strings */
  get diff(): string {
    if (this.hunks.length)
      return this.hunks
        .map(
          (hunk) =>
            `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${hunk.lines.join('\n')}`
        )
        .join('\n');
    const oldText = String(this.input.old_string ?? this.input.old_source ?? '');
    const newText = String(this.input.new_string ?? this.input.new_source ?? '');
    const removed = oldText ? oldText.split('\n').map((line) => `-${line}`) : [];
    const added = newText ? newText.split('\n').map((line) => `+${line}`) : [];
    return [...removed, ...added].join('\n');
  }

  get changeLabel(): string {
    const lines = this.diff.split('\n');
    const added = lines.filter((line) => line.startsWith('+')).length;
    const removed = lines.filter((line) => line.startsWith('-')).length;
    return `+${added} −${removed}`;
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [
      { title: this.filePath, code: this.diff, lang: 'diff' }
    ];
    if (this.isFailed && this.resultText)
      sections.push({ title: 'error', code: this.resultText, lang: 'text', tone: 'error' });
    return sections;
  }
}

export namespace EditCall {
  export const $Class = $EditCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Hunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }
}
