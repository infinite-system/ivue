import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Reactive } from '../../../ivue';
import { Highlighter } from '../Highlighter';

// One block of code on a card: plain and escaped on the first paint,
// coloured when shiki answers (cached, so a remount is free), cut at
// the cap with a marker until the card shows everything. Line numbers
// start where the tool's read started.
class $CodeBlock {
  constructor(public props: CodeBlock.Props) {
    onMounted(() => this.colour());
    onBeforeUnmount(() => this.cancel());
    watch(
      () => this.visibleCode,
      () => this.colour(),
    );
  }

  get html() {
    return ref('');
  }

  get generation() {
    return ref(0);
  }

  get visibleCode(): string {
    const cap = this.props.cap ?? null;
    const code = this.props.code;
    if (cap === null || code.length <= cap) return code;
    return `${code.slice(0, cap)}\n… ${(code.length - cap).toLocaleString('en-US')} more characters — show everything to read them`;
  }

  get isCapped(): boolean {
    const cap = this.props.cap ?? null;
    return cap !== null && this.props.code.length > cap;
  }

  get lang(): string {
    return this.props.lang ?? 'text';
  }

  get blockClass(): Record<string, boolean> {
    return {
      'ac-code-numbered': Boolean(this.props.startLine),
      'ac-code-error': this.props.tone === 'error',
      'ac-code-muted': this.props.tone === 'muted',
      'ac-code-wrap': Boolean(this.props.wrap),
    };
  }

  get blockStyle(): Record<string, string> {
    return this.props.startLine ? { '--ac-line-start': String(this.props.startLine - 1) } : {};
  }

  get renderedHtml(): string {
    return this.html.value || Highlighter.Class.plain(this.visibleCode);
  }

  async colour() {
    const generation = ++this.generation.value;
    const code = this.visibleCode;
    const html = await Highlighter.Class.highlight(code, this.lang);
    if (generation !== this.generation.value) return;
    this.html.value = html;
  }

  cancel() {
    this.generation.value++;
  }
}

export namespace CodeBlock {
  export const $Class = $CodeBlock;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    code: string;
    lang?: string;
    cap?: number | null;
    startLine?: number;
    tone?: 'plain' | 'error' | 'muted';
    wrap?: boolean;
  }
}
