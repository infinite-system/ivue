import type { ExtractPropTypes, PropType } from 'vue';
import { ref } from 'vue';
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
import CardHeaderView from './Card.Header.vue';
import CardBodyView from './Card.Body.vue';
import FrameView from './Card.Frame.vue';

// A model that composes: its kit names the sections of its view and the
// one leaf role with a class. The views import this module and this module
// imports the views; the lazy `$kit` getter is what makes the cycle
// harmless — nobody reads the other side at module init.
class $Card extends KitContainer.$Class<Card.Roles> {
  /** cached once per receiver class by Static(): `Card.$kit` and `FancyCard.$kit` are different objects */
  static override get $kit(): Card.Roles {
    return {
      Header: { view: CardHeaderView },
      Body: { view: CardBodyView },
      Frame: { view: FrameView },
      Code: { view: CodeView, namespace: Code }
    };
  }

  static get propsTypes() {
    return definePropTypes({
      title: { type: String as PropType<string>, required: true },
      items: { type: Array as PropType<string[]> },
      kit: { type: Object as PropType<Kit.Entry<typeof Card>> }
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Card.propsTypes> {
    return { items: [], kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Card.Props) {
    super();
    nestedProps(props, this.self.propsDefaults);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $Card;
  }

  get copied() {
    return ref<string[]>([]);
  }

  get title(): string {
    return this.props.title;
  }

  get items(): string[] {
    return this.props.items;
  }

  get reversedItems(): string[] {
    return [...this.items].reverse();
  }

  get copiedCount(): number {
    return this.copied.value.length;
  }

  onCopy(code: string) {
    this.copied.value = [...this.copied.value, code];
  }
}

export namespace Card {
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Roles = Kit.Of<'Header' | 'Body' | 'Frame', $Card> & {
    Code: Kit.Entry<$Card, undefined, typeof Code>;
  };
  export const $Class = Static($Card);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Role = 'Header' | 'Body' | 'Frame' | 'Code';
}
