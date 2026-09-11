import type { ExtractPropTypes, PropType } from 'vue';
import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes
} from '../../ivue';
import { nestedProps } from '../../nestedProps';
import { Static } from '../../Static';
import type { Kit } from '../Kit';

// A leaf with a class: one block of code, cut at a cap. The three getter
// shapes a kit-rendered class can take toward its entry's props are all
// here on purpose — `cap` is a knob the author opened to the kit, `code`
// is closed to it, `theme` exists only through it.
class $Code {
  static get propsTypes() {
    return definePropTypes({
      code: { type: String as PropType<string>, required: true },
      lang: { type: String as PropType<string> },
      cap: { type: Number as PropType<number | null> },
      /** the entry this view was rendered through — the class's own prop, typed to its namespace */
      kit: { type: Object as PropType<Kit.Entry<typeof Code>> }
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Code.propsTypes> {
    return { lang: 'text', cap: null, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static get emits() {
    return {
      copy: (code: string) => typeof code === 'string'
    };
  }

  constructor(
    public props: Code.Props,
    public emit: Code.Emits
  ) {
    nestedProps(props, this.self.propsDefaults);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Code;
  }

  /** a prop the kit may tune: the consumer's value first, then what the parent passed */
  get cap(): number | null {
    return (this.props.kit?.props?.cap as number | null | undefined) ?? this.props.cap;
  }

  /** a prop the kit cannot touch — on purpose: the code is the parent's */
  get code(): string {
    return this.props.code;
  }

  /** a prop that exists only through the kit — the path says so */
  get theme(): string | undefined {
    return this.props.kit?.props?.theme as string | undefined;
  }

  get lang(): string {
    return this.props.lang;
  }

  get visible(): string {
    const cap = this.cap;
    return cap === null || this.code.length <= cap ? this.code : this.code.slice(0, cap);
  }

  copy() {
    this.emit('copy', this.visible);
  }
}

export namespace Code {
  export const $Class = Static($Code);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
