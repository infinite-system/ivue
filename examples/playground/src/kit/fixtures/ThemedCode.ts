import type { ExtractPropTypes, PropType } from 'vue';
import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes
} from '../../ivue';
import { Static } from '../../Static';
import { Code } from './Code';

// A subclass that WIDENS the contract: a declared `theme` prop the parent
// may pass, and a `select` event the child may emit. The base view knows
// neither; `Kit.Class.vue` pairs this class with a view that declares both.
class $ThemedCode extends Code.$Class {
  static override get propsTypes() {
    return definePropTypes({
        ...super.propsTypes,
        theme: { type: String as PropType<'mono' | 'paper'> }
      });
  }

  static override get propsDefaults(): ExtractPropDefaultTypes<typeof $ThemedCode.propsTypes> {
    return { ...super.propsDefaults, theme: 'mono' };
  }

  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static override get emits() {
    return {
        ...super.emits,
        select: (code: string) => typeof code === 'string'
      };
  }

  /** The widened contract, redeclared for the type only: `declare` emits no field and runs nothing,
   *  and a props bag with one more field or an emit that takes one more event assigns to the base's,
   *  so every read of `this.props` and every call of `this.emit` below is typed to this class. */
  declare props: ThemedCode.Props;
  declare emit: ThemedCode.Emits;

  protected override get self() {
    return this.constructor as typeof $ThemedCode;
  }

  /** the declared prop wins; the kit's `theme` is the fallback the base class already reads */
  override get theme(): string | undefined {
    return this.props.theme ?? super.theme;
  }

  select() {
    this.emit('select', this.visible);
  }
}

export namespace ThemedCode {
  export const $Class = Static($ThemedCode);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
