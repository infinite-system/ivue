// DemoPointer.ts — the docs demo's ONE model: it hosts the playground's
// Pointer (a class hosting useMouse) and the two presentation composables
// that map page coordinates into the pad, behind `$`-getters.
import { ref, type Ref } from 'vue';
import { useElementBounding, useWindowScroll } from '@vueuse/core';
import { Reactive } from '../../../../lib/Reactive';
import { Pointer } from '../../../../examples/playground/src/examples/composable/Pointer';

class $DemoPointer {
  constructor() {
    // First touch INSIDE setup: useMouse's listeners land in the
    // component's scope and are cleaned up on unmount.
    void this.$pointer;
  }

  protected get $pointer() {
    return new Pointer.Class();
  }

  // presentation composables — created on first touch, cached for life
  protected get $bounds() {
    return useElementBounding(this.padEl);
  }
  protected get $scroll() {
    return useWindowScroll();
  }

  /** The pad element the crosshair is drawn inside (a template ref). */
  get padEl() {
    return ref<HTMLElement | null>(null);
  }

  // FORWARDED cells — the Pointer's refs, same cells
  get x(): Ref<number> {
    return this.$pointer.x;
  }
  get y(): Ref<number> {
    return this.$pointer.y;
  }

  // DERIVED — plain getters
  get pageX() {
    return this.$pointer.pageX;
  }
  get pageY() {
    return this.$pointer.pageY;
  }
  get localX() {
    return this.x.value - (this.$bounds.left.value + this.$scroll.x.value);
  }
  get localY() {
    return this.y.value - (this.$bounds.top.value + this.$scroll.y.value);
  }
  get inside() {
    const bounds = this.$bounds;
    return (
      bounds.width.value > 0 &&
      this.localX >= 0 &&
      this.localX <= bounds.width.value &&
      this.localY >= 0 &&
      this.localY <= bounds.height.value
    );
  }
  get verticalHairStyle() {
    return { left: this.localX + 'px' };
  }
  get horizontalHairStyle() {
    return { top: this.localY + 'px' };
  }
  get dotStyle() {
    return { left: this.localX + 'px', top: this.localY + 'px' };
  }
}

export namespace DemoPointer {
  export const $Class = $DemoPointer; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
