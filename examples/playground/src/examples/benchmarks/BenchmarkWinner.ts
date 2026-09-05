// BenchmarkWinner.ts — the winner badge's model: one prop, one derived class.
import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';

class $BenchmarkWinner {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      placement: { type: String as PropType<BenchmarkWinner.Placement> },
    });
  }

  static get propsDefaults() {
    return { placement: 'before' as BenchmarkWinner.Placement };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: BenchmarkWinner.Props) {}

  // DERIVED — the badge's side of the number it decorates
  get placementClass() {
    return `benchmark-winner--${this.props.placement}`;
  }
}

export namespace BenchmarkWinner {
  export const $Class = Static($BenchmarkWinner); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Placement = 'before' | 'after';
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
