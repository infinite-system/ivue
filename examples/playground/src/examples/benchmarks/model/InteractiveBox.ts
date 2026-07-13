import { useMouse } from '@vueuse/core';
import { computed as $, ref, shallowRef } from 'vue';
import { Reactive } from '../../../ivue';
import { Container, GlobalTheme } from './Container';

class $InteractiveBox extends Container.$Class {
  id: number;

  constructor(props: { id: number }) {
    super();
    this.id = props.id;
  }

  // --- Composition API Integrations ---
  // Using private getter to encapsulate the hook
  private get $mouse() {
    return useMouse();
  }

  get mouseX() {
    return this.$mouse.x;
  }
  get mouseY() {
    return this.$mouse.y;
  }

  // --- Reactive Properties ---
  get width() {
    return ref(100);
  }

  get height() {
    return ref(100);
  }

  get depth() {
    return shallowRef(10);
  }

  // Accessing the imported global state
  get globalTheme() {
    return GlobalTheme;
  }

  // --- Computed Inheritance & Overrides ---

  // 1. New Computed: Calculates geometry
  get area() {
    return $(() => this.width.value * this.height.value);
  }

  // 2. Override Computed: Chains up to Container -> BaseElement
  get diagnosticSummary() {
    return $(
      () =>
        `[Box #${this.id} Area:${this.area.value}] >> ` +
        super.diagnosticSummary.value
    );
  }

  // 3. Complex Computed: reactive setter/getter example
  get label() {
    return $({
      get: () => `Box-${this.id} (${this.width.value}x${this.height.value})`,
      set: (val: string) => {
        // Reverse logic: parsing a string to set width (just for demo)
        const num = parseInt(val.replace(/\D/g, ''));
        if (!isNaN(num)) this.width.value = num;
      },
    });
  }

  // --- Methods ---

  // Main update loop
  refreshState() {
    super.refreshState(); // Updates Base opacity, Container padding
    this.width.value = Math.floor(Math.random() * 500);
    this.height.value = Math.floor(Math.random() * 500);
    return true;
  }

  // Benchmark function: Simulates heavy collision detection math
  calculatePhysics() {
    // Pythagorean theorem + some random math overhead
    return Math.sqrt(
      Math.pow(this.width.value, 2) + Math.pow(this.height.value, 2)
    ) * Math.random();
  }

  // Testing string concatenation inheritance
  get typeChain() {
    return super.typeChain + ' -> InteractiveBox';
  }
}

export namespace InteractiveBox {
  export const $Class = $InteractiveBox;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}