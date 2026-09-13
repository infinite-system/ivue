import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { ToolCall } from './ToolCall';
import ToolCallCaptionWebFetchView from './ToolCall.Caption.WebFetch.vue';

// A fetch or a search: the URL or the query, the status and bytes the
// tool recorded, and what came back.
class $ToolCallWebFetch extends ToolCall.$Class {
  /** this card's caption has its own line; every other role is the base's */
  static override get $kit(): ToolCall.Roles {
    return { ...super.$kit, Caption: { view: ToolCallCaptionWebFetchView } };
  }

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
    if (typeof structured.bytes === 'number')
      pieces.push(`${(structured.bytes / 1024).toFixed(0)} KB`);
    if (typeof structured.durationMs === 'number') pieces.push(`${structured.durationMs} ms`);
    return pieces.join(' · ');
  }

  override get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [];
    if (this.prompt) sections.push({ title: 'asked', code: this.prompt, lang: 'text' });
    if (this.resultText)
      sections.push({
        title: this.isSearch ? 'results' : 'answer',
        code: this.resultText,
        lang: 'markdown',
        tone: this.isFailed ? 'error' : 'plain'
      });
    return sections;
  }
}

export namespace ToolCallWebFetch {
  export const $Class = Static($ToolCallWebFetch);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
