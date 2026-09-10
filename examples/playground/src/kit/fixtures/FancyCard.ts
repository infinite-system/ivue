import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Card } from './Card';
import FancyHeadView from './FancyHead.vue';
import GroupedBodyView from './GroupedBody.vue';
import FancyFrameView from './FancyFrame.vue';

// An override is a subclass: three sections swapped, the Code role kept.
class $FancyCard extends Card.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Head: { view: FancyHeadView },
      Body: { view: GroupedBodyView },
      Frame: { view: FancyFrameView },
    };
  }
}

export namespace FancyCard {
  export const $Class = Static($FancyCard);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
