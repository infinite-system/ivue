import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractEmitTypes, type ExtractPropDefaultTypes } from '../../ivue';
import { Static } from '../../Static';
import { Code } from './Code';

// A subclass that WIDENS the contract: a declared `theme` prop the parent
// may pass, and a `select` event the child may emit. The base view knows
// neither; `Kit.Class.view` pairs this class with a view that declares both.
class $ThemedCode extends Code.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      theme: { type: String as PropType<'mono' | 'paper'> },
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
      select: (code: string) => typeof code === 'string',
    };
  }

  protected override get self() {
    return this.constructor as typeof $ThemedCode;
  }

  /** the declared prop wins; the kit's `theme` is the fallback the base class already reads */
  override get theme(): string | undefined {
    return (this.props as ThemedCode.Props).theme ?? super.theme;
  }

  select() {
    (this.emit as ThemedCode.Emits)('select', this.visible);
  }
}

export namespace ThemedCode {
  export const $Class = Static($ThemedCode);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
