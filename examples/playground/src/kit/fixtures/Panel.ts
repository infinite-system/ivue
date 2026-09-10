import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractPropDefaultTypes } from '../../ivue';
import { nestedProps } from '../../nestedProps';
import { Static } from '../../Static';
import { Kit } from '../Kit';
import { Card } from './Card';
import CardView from './Card.vue';

// A root above the card: two levels, so an override can reach a leaf two
// hops down through `subkit`.
class $Panel {
  static get $kit() {
    return {
      Card: { namespace: Card, view: CardView },
    } satisfies Kit.Of<'Card'>;
  }

  static get propsTypes() {
    return definePropTypes({
      titles: { type: Array as PropType<string[]> },
      kit: { type: Object as PropType<Kit.Entry<typeof Panel>> },
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Panel.propsTypes> {
    return { titles: [], kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Panel.Props) {
    nestedProps(props, this.self.propsDefaults);
  }

  protected get self() {
    return this.constructor as typeof $Panel;
  }

  get kit() {
    return this.self.$kit;
  }

  get titles(): string[] {
    return this.props.titles;
  }

  itemsFor(title: string): string[] {
    return [`${title}-alpha`, `${title}-beta`];
  }
}

export namespace Panel {
  export const $Class = Static($Panel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
