// ContactAvatar.ts — a deterministic initials avatar's model: two
// derivations off props, and the style object the template binds.
import type { PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../../ivue';
import { Static } from '../../../Static';

class $ContactAvatar {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      name: { type: String as PropType<string>, required: true },
      size: { type: Number as PropType<number> },
    });
  }

  static get propsDefaults() {
    return { size: 32 };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: ContactAvatar.Props) {}

  // DERIVED — plain getters, zero bytes per instance
  get initials() {
    return this.props.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('');
  }

  /** Deterministic hue from the name — the same contact always gets the same color. */
  get backgroundColor() {
    let hash = 0;
    for (const character of this.props.name) {
      hash = (hash * 31 + character.charCodeAt(0)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
  }

  get style() {
    const size = this.props.size;
    return {
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.42)}px`,
      backgroundColor: this.backgroundColor,
    };
  }
}

export namespace ContactAvatar {
  export const $Class = Static($ContactAvatar); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Props = { name: string; size: number };
}
