// MemberAvatar.ts — a member chip's model: the size class, the color
// swatch, and the name/initials with their "unassigned" fallbacks.
import type { PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Member } from './Member';

class $MemberAvatar {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      member: { type: Object as PropType<Member.Model> },
      size: { type: String as PropType<MemberAvatar.Size> },
    });
  }

  static get propsDefaults() {
    return { size: 'medium' as MemberAvatar.Size };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: MemberAvatar.Props) {}

  // PROPS — plain getters
  get member() {
    return this.props.member;
  }

  // DERIVED — plain getters, zero bytes per instance
  get sizeClass() {
    return `ow-avatar--${this.props.size}`;
  }
  get style() {
    return { background: this.member?.color ?? '#94a3b8' };
  }
  get name() {
    return this.member?.name ?? 'Unassigned';
  }
  get initials() {
    return this.member?.initials ?? '?';
  }
  get isOnline() {
    return this.member?.online.value ?? false;
  }
}

export namespace MemberAvatar {
  export const $Class = Static($MemberAvatar); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Size = 'small' | 'medium' | 'large';
  export type Props = { member?: Member.Model; size: Size };
}
