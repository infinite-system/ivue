import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Reactive } from '../../../ivue';
import { Highlighter } from '../Highlighter';
import { Markdown } from '../Markdown';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';

// Prose: the markdown subset rendered to HTML, with every fenced block
// coloured after the paint — shiki runs once per block, cached, and the
// plain escaped block is what the row shows until then, so a row never
// waits on colour. A streaming text part re-renders as it grows.
class $TextPart {
  constructor(public props: Part.Props<SessionLog.TextPart>) {
    onMounted(() => this.colour());
    onBeforeUnmount(() => this.cancel());
    watch(
      () => this.html,
      () => this.colour(),
      { flush: 'post' },
    );
  }

  // TEMPLATE-REF TARGET — the rendered prose, whose fences get coloured in place
  get element() {
    return ref<HTMLElement | null>(null);
  }

  get generation() {
    return ref(0);
  }

  get text(): string {
    return this.props.part.text;
  }

  get html(): string {
    return Markdown.Class.render(this.text);
  }

  get isStreamingTail(): boolean {
    const streaming = this.props.chat.streaming.value;
    if (!streaming || streaming.message !== this.props.message) return false;
    const parts = streaming.message.parts;
    return parts[parts.length - 1] === this.props.part;
  }

  /** colour every fenced block in the rendered prose; a later render cancels this one */
  async colour() {
    const element = this.element.value;
    if (!element) return;
    const generation = ++this.generation.value;
    const blocks = Array.from(element.querySelectorAll<HTMLPreElement>('pre.chat-code[data-lang]'));
    for (const block of blocks) {
      const code = block.textContent ?? '';
      const html = await Highlighter.Class.highlight(code, block.dataset.lang ?? '');
      if (generation !== this.generation.value || !block.isConnected) return;
      if (html.startsWith('<pre class="chat-code shiki')) block.outerHTML = html;
    }
  }

  cancel() {
    this.generation.value++;
  }
}

export namespace TextPart {
  export const $Class = $TextPart;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
