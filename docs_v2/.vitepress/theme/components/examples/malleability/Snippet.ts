import type { ExtractPropTypes, PropType } from 'vue';
import { ref } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractPropDefaultTypes } from '../../../../../../lib/Reactive';
import { nestedProps } from '../../../../../../lib/nestedProps';
import { Static } from '../../../../../../lib/Static';
import { Kit } from '@kit/Kit';
import { Code } from './Code';
import CodeView from './Code.vue';
import SnippetHeadView from './SnippetHead.vue';
import SnippetFootView from './SnippetFoot.vue';

// One snippet card: a head, the code block, a foot. The head and the
// foot are sections — roles whose views render over this model — and
// the code block is a role with a class of its own. The card reads the
// Code entry's theme so its sections can match the block they frame.
class $Snippet {
  static get $kit() {
    return {
      Head: { vue: SnippetHeadView },
      Foot: { vue: SnippetFootView },
      Code: { namespace: Code, vue: CodeView },
    } satisfies Kit.Of<Snippet.Role>;
  }

  static readonly COPIED_FOR_MS = 1200;

  static get propsTypes() {
    return definePropTypes({
      snippet: { type: Object as PropType<Snippet.Source>, required: true },
      kit: { type: Object as PropType<Kit.Entry<typeof Snippet>> },
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Snippet.propsTypes> {
    return { kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Snippet.Props) {
    nestedProps(props, this.self.propsDefaults);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Snippet;
  }

  /** the kit is the class's; a subclass with its own `$kit` swaps the subtree */
  get kit() {
    return this.self.$kit;
  }

  get copied() {
    return ref(false);
  }

  get source(): Snippet.Source {
    return this.props.snippet;
  }

  get name(): string {
    return this.source.name;
  }

  get lang(): string {
    return this.source.lang;
  }

  get code(): string {
    return this.source.code;
  }

  get lineCount(): number {
    return this.code.split('\n').length;
  }

  get charCount(): number {
    return this.code.length;
  }

  /** the theme the Code role renders with: the entry's word, else Code's own default */
  get theme(): Code.Theme {
    return (this.kit.Code.props?.theme as Code.Theme | undefined) ?? Code.Class.propsDefaults.theme;
  }

  get palette(): Code.Palette {
    return Code.Class.PALETTES[this.theme];
  }

  /** the engine the Code role colours with — whichever class the entry names */
  get engineLabel(): string {
    const Class = this.kit.Code.namespace?.Class as typeof Code.Class | undefined;
    return Class?.engine.label ?? Code.Class.engine.label;
  }

  /** the card paints its sections from the block's palette */
  get cardStyle(): Record<string, string> {
    const palette = this.palette;
    return { '--snip-bg': palette.background, '--snip-fg': palette.foreground, '--snip-accent': palette.accent };
  }

  get copyLabel(): string {
    return this.copied.value ? 'copied ✓' : 'copy';
  }

  get linesLabel(): string {
    return `${this.lineCount} lines`;
  }

  /** the block's copy event, or the foot's button */
  onCopy(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(code).catch(() => undefined);
    this.copied.value = true;
    setTimeout(() => this.resetCopied(), this.self.COPIED_FOR_MS);
  }

  copyAll() {
    this.onCopy(this.code);
  }

  resetCopied() {
    this.copied.value = false;
  }
}

export namespace Snippet {
  export const $Class = Static($Snippet);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Role = 'Head' | 'Foot' | 'Code';

  export interface Source {
    name: string;
    lang: string;
    code: string;
  }
}
