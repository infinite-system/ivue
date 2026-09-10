import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Highlighter } from '../Highlighter';
import { Markdown } from '../Markdown';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';

// Prose: the markdown subset rendered to HTML, with every fenced block
// coloured after the paint — shiki runs once per block, cached, and the
// plain escaped block is what the row shows until then, so a row never
// waits on colour. A streaming text part re-renders as it grows, and the
// word that just arrived is wrapped so the page can fade it in: every
// render is fresh nodes, so each word animates exactly once.
class $TextPart {
  /** private-use marks around the newest word; markdown leaves them alone and the render swaps them for a span */
  static readonly TOKEN_OPEN = '\uE000';
  static readonly TOKEN_CLOSE = '\uE001';

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

  /** the part's text — read through the chat's revision, which bumps on every streamed token; the part itself is a plain object the stream appends to in place */
  get text(): string {
    void this.props.chat.revision.value;
    return this.props.part.text;
  }

  get html(): string {
    if (!this.isStreamingTail) return Markdown.Class.render(this.text);
    const self = this.self;
    const marked = this.text.replace(/(\S+)(\s*)$/, `${self.TOKEN_OPEN}$1${self.TOKEN_CLOSE}$2`);
    return Markdown.Class.render(marked).replace(self.TOKEN_OPEN, '<span class="ac-tok">').replace(self.TOKEN_CLOSE, '</span>');
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $TextPart;
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
  export const $Class = Static($TextPart);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
