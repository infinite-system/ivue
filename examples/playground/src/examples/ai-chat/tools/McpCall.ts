import { Reactive } from '../../../ivue';
import { ToolCallModel } from './ToolCallModel';

// An MCP tool: the server and the tool from the name, input and result
// as JSON, and a screenshot when the result carried one.
class $McpCall extends ToolCallModel.$Class {
  get server(): string {
    return this.name.split('__')[1] ?? '';
  }

  get tool(): string {
    return this.name.split('__').slice(2).join('__') || this.name;
  }

  get code(): string {
    return String(this.input.code ?? '');
  }

  /** the result, pretty when it is JSON */
  get resultPretty(): string {
    const text = this.resultText.trim();
    if (!text.startsWith('{') && !text.startsWith('[')) return text;
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  override get sections(): ToolCallModel.Section[] {
    const sections: ToolCallModel.Section[] = [];
    if (this.code) sections.push({ title: 'code', code: this.code, lang: 'javascript' });
    else sections.push({ title: 'input', code: this.inputJson, lang: 'json' });
    if (this.resultText) sections.push({ title: 'result', code: this.resultPretty, lang: this.resultPretty.startsWith('{') || this.resultPretty.startsWith('[') ? 'json' : 'text', tone: this.isFailed ? 'error' : 'plain' });
    return sections;
  }
}

export namespace McpCall {
  export const $Class = $McpCall;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
