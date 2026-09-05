// Badge.ts — a component whose WHOLE contract is a value on the class:
// prop types, defaults and a validator as static getters, the TypeScript
// type derived from them. Anything can read it — the SFC, a subclass, a
// test, a knobs panel — because nothing here is only a type.
import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';

class $Badge {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      label: { type: String, required: true },
      tone: { type: String as PropType<Badge.Tone> },
      size: { type: Number, validator: (size: number) => size > 0 },
      rounded: { type: Boolean },
    });
  }

  static get propsDefaults() {
    return { tone: 'success' as Badge.Tone, size: 14, rounded: false };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** KNOB — the values a panel may offer for each prop; a live static, read like the rest. */
  static get propsChoices() {
    return {
      label: ['runtime', 'props', 'value', 'ivue'],
      tone: ['neutral', 'success', 'danger'] as readonly Badge.Tone[],
      size: [0, 12, 14, 16, 20, 28],
    };
  }

  constructor(public props: Badge.Props) {}

  // PROPS — plain getters, leaf-tracked through the props proxy
  get label() {
    return this.props.label;
  }

  get tone() {
    return this.props.tone;
  }

  get size() {
    return this.props.size;
  }

  get rounded() {
    return this.props.rounded;
  }

  // DERIVED — what the template binds
  get classes() {
    return ['badge', `badge--${this.tone}`, { 'badge--rounded': this.rounded }];
  }

  get style() {
    return { fontSize: `${this.size}px` };
  }
}

export namespace Badge {
  export const $Class = Static($Badge); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Tone = 'neutral' | 'success' | 'danger';
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
