// Field.ts — the minimal base contract every field example shares.
//
// The common QField passthrough (model, label, hint, density, read/disable
// states, loading, outlined styling) is declared ONCE, as statics on a
// base class: a field `extends Field.$Class` and its contract is
// inherited the way its behavior is — `super.propsTypes` spreads, one
// default re-tuned per line, nothing copied.

import type { PropType } from 'vue';

import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractPropDefaultTypes,
} from '../../ivue';
import { Static } from '../../Static';

class $Field {
  /* Contract — STATIC; subclasses extend with `super` */

  static get propsTypes() {
    return definePropTypes({
      modelValue: { type: null as unknown as PropType<any> },
      label: { type: String as PropType<string> },
      hint: { type: String as PropType<string> },
      dense: { type: Boolean as PropType<boolean> },
      disable: { type: Boolean as PropType<boolean> },
      readonly: { type: Boolean as PropType<boolean> },
      loading: { type: Boolean as PropType<boolean> },
      outlined: { type: Boolean as PropType<boolean> },
      /**
       * The driving runner — the universal shell's swap seam. A subclass
       * CLASS (this component constructs it with its own props and emit)
       * or a pre-built INSTANCE (a wrapping component constructs the
       * subclass with ITS props and emit and hands it down, so every emit
       * leaves through the wrapper). Unset = this component's own Class.
       */
      runner: { type: [Function, Object] as PropType<any> },
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<
    typeof $Field.propsTypes
  > {
    return {
      modelValue: null,
      label: '',
      hint: '',
      dense: false,
      disable: false,
      readonly: false,
      loading: false,
      outlined: true,
      runner: null,
    };
  }

  /** The fusion — written once here, read through the receiver: a
   *  subclass's `props` fuses ITS types and defaults. A subclass that
   *  ADDS props re-declares this one line so its derived `Props` type
   *  widens (a static's return type is not polymorphic in TypeScript). */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /**
   * Resolve the instance that drives a field SFC: the `runner` prop as an
   * INSTANCE is used as-is; as a CLASS it is constructed with this SFC's
   * props and emit; unset, the receiving class constructs itself. Every
   * field SFC is one line — `X.Class.runner(props, emit)` — and therefore
   * its own swap point.
   */
  static runner<This extends typeof $Field>(
    this: This,
    props: any,
    emit: any,
  ): InstanceType<This> {
    const runner = props.runner;
    if (typeof runner === 'object' && runner !== null) return runner;
    const RunnerClass = (typeof runner === 'function' ? runner : this) as This;
    return new RunnerClass(props, emit) as InstanceType<This>;
  }

  /** Fields take (props, emit); the base accepts either so `runner()` can
   *  construct any receiver uniformly. */
  constructor(..._arguments: any[]) {}
}

export namespace Field {
  export const $Class = Static($Field); // anchor — fields `extends` this
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
