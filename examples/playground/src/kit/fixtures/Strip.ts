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
import { KitContainer } from '../KitContainer';
import { Code } from './Code';
import CodeView from './Code.vue';
import StripHeaderView from './Strip.Header.vue';
import StripBodyView from './Strip.Body.vue';
import StripFooterView from './Strip.Footer.vue';

// A container: its sections are roles the view renders in the kit's
// `order`, and its body is a list container that feeds every item through
// the `Item` role's bind. Nothing in the view names a section; a patch
// inserts, drops, moves or dresses one by relations against names.
class $Strip extends KitContainer.$Class<Strip.Roles, string> {
  /** the sections in their order, and the list role with the bind that feeds each item */
  static override get $kit(): Strip.Roles {
    return {
      Header: { view: StripHeaderView },
      Body: { view: StripBodyView },
      Footer: { view: StripFooterView },
      // an inline bind returning an attribute beside props: `entry` refuses a wrong key, a literal would not
      Item: Kit.Class.entry({
        view: CodeView,
        namespace: Code,
        bind: ({ model, item, key }) => ({ code: item, cap: model.cap, 'data-key': key })
      }),
      order: ['Header', 'Body', 'Footer']
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
    super();
    nestedProps(props, this.self.propsDefaults);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $Strip;
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
}

export namespace Strip {
  export const $Class = Static($Strip);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type SectionRole = 'Header' | 'Body' | 'Footer';
  export type Role = SectionRole | 'Item';
  /** declared, so the container's instance type and its kit can name each other; the Item entry
   *  names its namespace so a bind is held to Code's contract */
  export type Roles = Kit.Of<SectionRole, $Strip> & {
    Item: Kit.Entry<$Strip, string, typeof Code>;
    order: readonly SectionRole[];
  };
}
