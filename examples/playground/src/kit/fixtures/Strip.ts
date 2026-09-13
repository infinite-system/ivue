import type { ExtractPropTypes, PropType } from 'vue';
import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractPropDefaultTypes
} from '../../ivue';
import { nestedProps } from '../../nestedProps';
import { Static } from '../../Static';
import { Kit } from '../Kit';
import { Code } from './Code';
import CodeView from './Code.vue';
import StripHeadView from './StripHead.vue';
import StripBodyView from './StripBody.vue';
import StripFootView from './StripFoot.vue';

// A container: its sections are roles the view renders in the kit's
// `order`, and its body is a list container that feeds every item through
// the `Item` role's bind. Nothing in the view names a section; a patch
// inserts, drops, moves or dresses one by relations against names.
class $Strip {
  /** the sections in their order, and the list role with the bind that feeds each item */
  static get $kit(): Strip.Roles {
    return {
      Head: { view: StripHeadView },
      Body: { view: StripBodyView },
      Foot: { view: StripFootView },
      // the typed form: the bind's result is checked against Code's props, the seam against the strip
      Item: Kit.Class.entry(CodeView, Code, {
        bind: ({ model, item, key }) => ({ code: item, cap: model.cap, 'data-key': key })
      }),
      order: ['Head', 'Body', 'Foot']
    };
  }

  static get propsTypes() {
    return definePropTypes({
      title: { type: String as PropType<string>, required: true },
      items: { type: Array as PropType<string[]> },
      cap: { type: Number as PropType<number | null> },
      kit: { type: Object as PropType<Kit.Entry<typeof Strip>> }
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Strip.propsTypes> {
    return { items: [], cap: null, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Strip.Props) {
    nestedProps(props, this.self.propsDefaults);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Strip;
  }

  /** the kit is the class's; a subclass with its own `$kit` swaps the subtree */
  get kit() {
    return this.self.$kit;
  }

  get title(): string {
    return this.props.title;
  }

  get items(): string[] {
    return this.props.items;
  }

  get cap(): number | null {
    return this.props.cap;
  }

  get hasItems(): boolean {
    return this.items.length > 0;
  }

  /** the foot shows only over items; every other role always — a layer overrides this and falls back to `super` */
  shows(role: Strip.SectionRole): boolean {
    return role === 'Foot' ? this.hasItems : true;
  }

  /** what a seam hands the role's view — the entry's bind, or `{ model, kit }`; never a branch on the name */
  seam(role: Strip.Role, item?: string, key?: string | number): Kit.Bound {
    return Kit.Class.seam(this, this.kit[role], item, key);
  }
}

export namespace Strip {
  export const $Class = Static($Strip);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type SectionRole = 'Head' | 'Body' | 'Foot';
  export type Role = SectionRole | 'Item';
  /** declared, so the container's instance type and its kit can name each other; the Item entry
   *  names its namespace so a bind is held to Code's contract */
  export type Roles = Kit.Of<SectionRole, $Strip> & {
    Item: Kit.Entry<$Strip, string, typeof Code>;
    order: readonly SectionRole[];
  };
}
