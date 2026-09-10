import type { ExtractPropTypes, PropType } from 'vue';
import { onMounted, ref, watch } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractEmitTypes, type ExtractPropDefaultTypes } from '../../../../../../lib/Reactive';
import { nestedProps } from '../../../../../../lib/nestedProps';
import { Static } from '../../../../../../lib/Static';
import type { Kit } from '@kit/Kit';
import { Shiki } from './Shiki';

// One block of code, coloured by an engine the class names as a static,
// so a subclass swaps the engine by overriding one getter. The class
// reads its own props and nothing else: it is closed to the kit. A
// setting is a getter, and opening one is a layer — see ConfiguredCode.
class $Code {
  /** what each theme paints the block with, so the sections around it can match */
  static readonly PALETTES: Record<Code.Theme, Code.Palette> = {
    'github-light': { background: '#ffffff', foreground: '#24292e', accent: '#0969da' },
    'one-dark-pro': { background: '#282c34', foreground: '#abb2bf', accent: '#61afef' },
    dracula: { background: '#282a36', foreground: '#f8f8f2', accent: '#bd93f9' },
    nord: { background: '#2e3440', foreground: '#d8dee9', accent: '#88c0d0' },
  };

  static get propsTypes() {
    return definePropTypes({
      code: { type: String as PropType<string>, required: true },
      lang: { type: String as PropType<string> },
      theme: { type: String as PropType<Code.Theme> },
      lineNumbers: { type: Boolean as PropType<boolean> },
      /** fold the block past this many lines; null shows everything */
      maxLines: { type: Number as PropType<number | null> },
      /** the entry this view was rendered through — the class's own prop, typed to its namespace */
      kit: { type: Object as PropType<Kit.Entry<typeof Code>> },
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Code.propsTypes> {
    return { lang: 'text', theme: 'github-light', lineNumbers: false, maxLines: null, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static get emits() {
    return {
      copy: (code: string) => typeof code === 'string',
    };
  }

  /** the colour engine — a live static, so a subclass overrides it with one getter */
  static get engine(): Code.Engine {
    return Shiki.Class;
  }

  constructor(
    public props: Code.Props,
    public emit: Code.Emits,
  ) {
    nestedProps(props, this.self.propsDefaults);
    onMounted(() => this.colour());
    watch(
      () => [this.visibleCode, this.theme, this.lang],
      () => this.colour(),
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Code;
  }

  /** the highlighted html once the engine answers; empty until then */
  get html() {
    return ref('');
  }

  get expanded() {
    return ref(false);
  }

  /** the request the html belongs to — a slower earlier colouring never overwrites a later one */
  get request() {
    return ref(0);
  }

  get code(): string {
    return this.props.code;
  }

  get lang(): string {
    return this.props.lang;
  }

  get theme(): Code.Theme {
    return this.props.theme;
  }

  get lineNumbers(): boolean {
    return this.props.lineNumbers;
  }

  get maxLines(): number | null {
    return this.props.maxLines;
  }

  get lines(): string[] {
    return this.code.split('\n');
  }

  get isFoldable(): boolean {
    return this.maxLines !== null && this.lines.length > this.maxLines;
  }

  get isFolded(): boolean {
    return this.isFoldable && !this.expanded.value;
  }

  get visibleLines(): string[] {
    return this.isFolded ? this.lines.slice(0, this.maxLines as number) : this.lines;
  }

  get visibleCode(): string {
    return this.visibleLines.join('\n');
  }

  get visibleLineCount(): number {
    return this.visibleLines.length;
  }

  get hiddenLineCount(): number {
    return this.lines.length - this.visibleLines.length;
  }

  get foldLabel(): string {
    return this.isFolded ? `▾ ${this.hiddenLineCount} more lines` : '▴ fold';
  }

  get palette(): Code.Palette {
    return this.self.PALETTES[this.theme];
  }

  get engineLabel(): string {
    return this.self.engine.label;
  }

  get blockStyle(): Record<string, string> {
    const palette = this.palette;
    return { '--code-bg': palette.background, '--code-fg': palette.foreground, '--code-accent': palette.accent };
  }

  get blockClass(): Record<string, boolean> {
    return { 'code-numbered': this.lineNumbers, 'code-folded': this.isFolded };
  }

  /** the engine's html, or the plain escaped code until the engine answers */
  get renderedHtml(): string {
    return this.html.value || Shiki.Class.plain(this.visibleCode);
  }

  toggleFold() {
    this.expanded.value = !this.expanded.value;
  }

  copy() {
    this.emit('copy', this.code);
  }

  async colour() {
    const request = ++this.request.value;
    const html = await this.self.engine.highlight(this.visibleCode, this.lang, this.theme);
    if (request === this.request.value) this.html.value = html;
  }
}

export namespace Code {
  export const $Class = Static($Code);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;

  export type Theme = Shiki.Theme;

  export interface Palette {
    background: string;
    foreground: string;
    accent: string;
  }

  /** what a colour engine is to a block: a label, and html for code in a language and a theme */
  export interface Engine {
    label: string;
    highlight(code: string, lang: string, theme: string): Promise<string>;
  }
}
