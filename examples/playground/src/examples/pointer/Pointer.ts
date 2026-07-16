// Pointer.ts — a class HOSTING a composable: private inside, two refs outside.
import { Reactive } from '../../ivue';
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

  // display derivations — touch events report fractional page coordinates
  // (23.333…); whole pixels are what a readout wants
  get pageX() {
    return Math.round(this.x.value);
  }
  get pageY() {
    return Math.round(this.y.value);
  }
}

export namespace Pointer {
  export const $Class = $Pointer; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
