import { useMouse } from '@vueuse/core';
import { computed, ref, shallowRef } from 'vue';
import { Reactive } from '../../../ivue';
import { Container } from './Container';

class $InteractiveBox extends Container.$Class {

  constructor(props: { id: number }) {
    super();
    this.id = props.id;
  }

  readonly id: number;

  // --- Composition API Integrations ---
  // Using private getter to encapsulate the hook
  protected get $mouse() {
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
    return Container.Class.$theme;
  }

  // --- Computed Inheritance & Overrides ---

  // 1. New Computed: Calculates geometry
  // computed: stable-handle — read by the override chain below
  get area() {
    return computed(() => this.computeArea());
  }

  // 2. Override Computed: Chains up to Container -> BaseElement
  // computed: stable-handle — the override chain reads super.diagnosticSummary.value
  override get diagnosticSummary() {
    return computed(() => this.describeBox());
  }

  // 3. Complex Computed: reactive setter/getter example
  // computed: stable-handle — a writable v-model target
  get label() {
    return computed({
      get: () => this.describeLabel(),
      set: (text: string) => this.parseLabel(text),
    });
  }

  // Testing string concatenation inheritance
  override get typeChain() {
    return super.typeChain + ' -> InteractiveBox';
  }

  // --- Methods ---

  computeArea() {
    return this.width.value * this.height.value;
  }

  describeBox() {
    return `[Box #${this.id} Area:${this.area.value}] >> ` + super.diagnosticSummary.value;
  }

  describeLabel() {
    return `Box-${this.id} (${this.width.value}x${this.height.value})`;
  }

  /** Reverse logic: parsing a string to set width (just for demo). */
  parseLabel(text: string) {
    const parsed = parseInt(text.replace(/\D/g, ''));
    if (!isNaN(parsed)) this.width.value = parsed;
  }

  // Main update loop
  override refreshState() {
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
}

export namespace InteractiveBox {
  export const $Class = $InteractiveBox;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}