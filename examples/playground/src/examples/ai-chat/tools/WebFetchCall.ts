import { Reactive } from '../../../ivue';
import { ToolCallModel } from './ToolCallModel';

// A fetch or a search: the URL or the query, the status and bytes the
// tool recorded, and what came back.
class $WebFetchCall extends ToolCallModel.$Class {
  get url(): string {
    return String(this.input.url ?? '');
  }

  get query(): string {
    return String(this.input.query ?? '');
  }

  get prompt(): string {
    return String(this.input.prompt ?? '');
  }

  get isSearch(): boolean {
    return this.name === 'WebSearch';
  }

  get statusLabel(): string {
    const structured = this.structured;
    const pieces: string[] = [];
    if (typeof structured.code === 'number') pieces.push(`HTTP ${structured.code}`);
    if (typeof structured.bytes === 'number') pieces.push(`${(structured.bytes / 1024).toFixed(0)} KB`);
    if (typeof structured.durationMs === 'number') pieces.push(`${structured.durationMs} ms`);
    return pieces.join(' · ');
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [];
    if (this.prompt) sections.push({ title: 'asked', code: this.prompt, lang: 'text' });
    if (this.resultText) sections.push({ title: this.isSearch ? 'results' : 'answer', code: this.resultText, lang: 'markdown', tone: this.isFailed ? 'error' : 'plain' });
    return sections;
  }
}

export namespace WebFetchCall {
  export const $Class = $WebFetchCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
