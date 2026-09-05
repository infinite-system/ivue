import { computed, ref, watch } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { BaseElement } from './BaseElement';

class $Container extends BaseElement.$Class {
  /** A shared global state (simulating global config) — ONE cell in a
   *  static readonly field, so every receiver resolves to the same theme. */
  protected static readonly sharedTheme = ref({
    primaryColor: 'blue',
    scaleFactor: 1.0,
  });
  static get $theme() {
    return this.sharedTheme; // the field IS the pin
  }

  constructor() {
    super();
  }

  init() {
    // Example of watching a global ref inside the class
    watch(this.layoutMode, (v) => {
      // Logic could go here
    });
  }

  get padding() {
    return ref(10);
  }

  get scale() {
    return ref(1);
  }

  get layoutMode() {
    return ref('flex');
  }

  // INHERITANCE TEST: Overriding the computed property
  // We explicitly call `super.diagnosticSummary.value` to ensure reactivity travels up the chain
  override get diagnosticSummary() {
    return computed(
      () =>
        `{Container: pad=${this.padding.value}} >> ` +
        super.diagnosticSummary.value
    );
  }

  // A computed derived from local state
  get layoutString() {
    return computed(
      () => `Display: ${this.layoutMode.value} | Scale: ${this.scale.value}`
    );
  }

  // Overriding the update method
  override refreshState() {
    super.refreshState();
    this.padding.value = Math.floor(Math.random() * 50);
    this.scale.value = parseFloat((Math.random() * 2).toFixed(2));
    this.layoutMode.value = Math.random() > 0.5 ? 'grid' : 'flex';
  }

  onThemeChange(v: any) {
    console.log('Theme changed', v);
  }

  override get typeChain() {
    return super.typeChain + ' -> Container';
  }
}

export namespace Container {
  export const $Class = Static($Container); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}