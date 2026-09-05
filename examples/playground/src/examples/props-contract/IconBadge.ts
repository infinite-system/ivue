// IconBadge.ts — the variant. It ADDS one prop, RE-TUNES one default, and
// inherits the rest by `super` — the compiler checks every override.
import type { ExtractPropTypes } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Badge } from './Badge';

class $IconBadge extends Badge.$Class {
  /* Contract — STATIC, extended */

  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      icon: { type: String },
    });
  }

  static override get propsDefaults() {
    return { ...super.propsDefaults, size: 16, icon: '★' };
  }

  // re-declared because it ADDS a prop — static return types are not polymorphic
  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public override props: IconBadge.Props) {
    super(props);
  }

  get icon() {
    return this.props.icon;
  }
}

export namespace IconBadge {
  export const $Class = Static($IconBadge); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Props = ExtractPropTypes<typeof $Class.props>;
}
