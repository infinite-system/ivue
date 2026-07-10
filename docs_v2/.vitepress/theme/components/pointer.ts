// pointer.ts — a class HOSTING a composable: private inside, two refs outside.
import { Reactive } from '../../../../lib/Reactive';
import { useMouse } from '@vueuse/core';

class $Pointer {
  // the composable is an implementation detail — created once, held forever
  private get $mouse() {
    return useMouse();
  }

  // the public surface: two refs
  get x() {
    return this.$mouse.x;
  }
  get y() {
    return this.$mouse.y;
  }
}

export namespace Pointer {
  export const $Class = $Pointer; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
