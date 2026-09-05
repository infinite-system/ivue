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
    };
  }

  /** The fusion — written once here, read through the receiver: a
   *  subclass's `props` fuses ITS types and defaults. A subclass that
   *  ADDS props re-declares this one line so its derived `Props` type
   *  widens (a static's return type is not polymorphic in TypeScript). */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }
}

export namespace Field {
  export const $Class = Static($Field); // anchor — fields `extends` this
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
