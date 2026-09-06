import { defineAsyncComponent, ref, type Component } from 'vue';
import { Reactive } from './ivue';
import { examples, type ExampleEntry } from './examples';

class $Playground {
  // Constructor runs in App's setup — the hashchange listener lives for the
  // life of the page, exactly as long as the shell itself.
  constructor() {
    window.addEventListener('hashchange', () => this.syncRoute());
  }

  // MUTABLE STATE — the active route slug, mirrored from location.hash.
  get route() {
    return ref(this.readHash());
  }

  // CONSTANTS — the manifest registry and its lazy route components;
  // plain fields, never mutated. A route never loads the others' code.
  readonly examples = examples;
  readonly routeComponents: Record<string, Component> = Object.fromEntries(
    examples.map((example) => [
      example.slug,
      defineAsyncComponent(example.load),
    ]),
  );

  // DERIVED — plain getters, reactive via leaf tracking.
  get activeExample(): ExampleEntry {
    return (
      this.examples.find((example) => example.slug === this.route.value) ??
      this.examples[0]
    );
  }

  get activeComponent(): Component {
    return this.routeComponents[this.activeExample.slug];
  }

  /** The stage key — the route when set, else the fallback example's slug. */
  get activeSlug() {
    return this.route.value || this.activeExample.slug;
  }

  /** Whether a nav entry is the active one (a per-item template condition). */
  isActive(example: ExampleEntry) {
    return example.slug === this.activeExample.slug;
  }

  readHash() {
    return location.hash.replace(/^#\/?/, '');
  }

  syncRoute() {
    this.route.value = this.readHash();
  }

  navigate(slug: string) {
    location.hash = `#/${slug}`;
  }
}

export namespace Playground {
  export const $Class = $Playground; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
