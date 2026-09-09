import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { ToolCallModel } from './ToolCallModel';

// A read: the file with line numbers, highlighted by its extension,
// starting at the line the tool was asked for. The tool's listing is
// `number<tab>line`; the numbers come off for colour and go back on as
// a counter, so a listing that began at line 400 says 400.
class $ReadCall extends ToolCallModel.$Class {
  static readonly NUMBERED = /^\s*(\d+)\t/;

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ReadCall;
  }

  get filePath(): string {
    return this.pathLabel(this.input.file_path);
  }

  get language(): string {
    return this.languageFor(this.input.file_path);
  }

  get isImage(): boolean {
    return this.hasImages || /\.(png|jpe?g|gif|webp|avif)$/i.test(String(this.input.file_path ?? ''));
  }

  get rangeLabel(): string {
    const offset = this.input.offset;
    const limit = this.input.limit;
    if (offset === undefined && limit === undefined) return 'whole file';
    return `from line ${Number(offset ?? 1).toLocaleString('en-US')}${limit !== undefined ? `, ${Number(limit).toLocaleString('en-US')} lines` : ''}`;
  }

  /** the listing's first line number */
  get startLine(): number {
    const first = this.resultText.split('\n')[0] ?? '';
    const match = this.self.NUMBERED.exec(first);
    return match ? Number(match[1]) : Number(this.input.offset ?? 1);
  }

  /** the listing without its number column */
  get code(): string {
    return this.resultText
      .split('\n')
      .map((line) => line.replace(this.self.NUMBERED, ''))
      .join('\n');
  }

  get lineCountLabel(): string {
    const file = this.structured.file as { numLines?: number; totalLines?: number } | undefined;
    if (!file?.numLines) return '';
    return file.totalLines && file.totalLines !== file.numLines ? `${file.numLines} of ${file.totalLines} lines` : `${file.numLines} lines`;
  }

  get showsCode(): boolean {
    return this.resultText.length > 0 && !this.isImage;
  }

  get showsEmpty(): boolean {
    return !this.hasImages;
  }

  get emptyLabel(): string {
    return this.isRunning ? 'reading…' : 'no content recorded';
  }

  override get sections(): ToolCallModel.Section[] {
    if (!this.resultText) return [];
    return [{ title: this.filePath, code: this.code, lang: this.language, startLine: this.startLine }];
  }
}

export namespace ReadCall {
  export const $Class = Static($ReadCall);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
