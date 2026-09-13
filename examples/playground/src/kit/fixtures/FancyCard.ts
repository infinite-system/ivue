import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Card } from './Card';
import CardHeaderFancyView from './Card.Header.Fancy.vue';
import CardBodyGroupedView from './Card.Body.Grouped.vue';
import CardFrameFancyView from './Card.Frame.Fancy.vue';

// An override is a subclass: three sections swapped, the Code role kept.
class $FancyCard extends Card.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Header: { view: CardHeaderFancyView },
      Body: { view: CardBodyGroupedView },
      Frame: { view: CardFrameFancyView }
    };
  }
}

export namespace FancyCard {
  export const $Class = Static($FancyCard);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
