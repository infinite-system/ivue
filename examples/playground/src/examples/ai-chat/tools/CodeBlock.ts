import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import type { Kit } from '../../../kit/Kit';
import { Highlighter } from '../Highlighter';
import { Icons } from '../Icons';

// One block of code on a card: plain and escaped on the first paint,
// coloured when shiki answers (cached, so a remount is free), cut at
// the cap with a marker until the card shows everything. Line numbers
// start where the tool's read started. One button copies the whole
// block — the code as given, not the capped view — and says so for a
// moment.
class $CodeBlock {
  /** how long the button says 'copied' */
  static readonly COPIED_MS = 1400;

  /**
   * Text to the clipboard on any origin: the async clipboard exists only
   * on a secure context, so a page opened over plain http on a LAN
   * address falls back to a selection and the legacy copy command.
   */
  static async writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the legacy path
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let done = false;
    try {
      done = document.execCommand('copy');
    } catch {
      done = false;
    }
    area.remove();
    return done;
  }

  constructor(public props: CodeBlock.Props) {
    onMounted(() => this.colour());
    onBeforeUnmount(() => this.cancel());
    watch(
      () => this.visibleCode,
      () => this.colour(),
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $CodeBlock;
  }

  get copied() {
    return ref(false);
  }

  get copiedTimer() {
    return shallowRef<ReturnType<typeof setTimeout> | null>(null);
  }

  get failed() {
    return ref(false);
  }

  get copyIcon(): string {
    return this.copied.value ? Icons.$Class.PATHS.check : Icons.$Class.PATHS.copy;
  }

  get copyLabel(): string {
    if (this.failed.value) return 'Copy failed';
    return this.copied.value ? 'Copied' : 'Copy';
  }

  get copyClass(): Record<string, boolean> {
    return { 'ac-copied': this.copied.value, 'ac-copy-failed': this.failed.value };
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

  /** the whole block to the clipboard; the button shows a check — or says it failed — for a moment */
  async copy() {
    const done = await this.self.writeClipboard(this.props.code);
    this.copied.value = done;
    this.failed.value = !done;
    if (this.copiedTimer.value) clearTimeout(this.copiedTimer.value);
    this.copiedTimer.value = setTimeout(() => this.settleCopy(), this.self.COPIED_MS);
  }

  settleCopy() {
    this.copied.value = false;
    this.failed.value = false;
    this.copiedTimer.value = null;
  }
}

export namespace CodeBlock {
  export const $Class = Static($CodeBlock);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    code: string;
    lang?: string;
    cap?: number | null;
    startLine?: number;
    tone?: 'plain' | 'error' | 'muted';
    wrap?: boolean;
    kit?: Kit.Entry;
  }
}
