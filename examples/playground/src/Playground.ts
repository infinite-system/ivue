import { ref } from 'vue';
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

  // CONSTANTS — the manifest registry; plain field, never mutated.
  examples = examples;

  // DERIVED — plain getters, reactive via leaf tracking.
  get activeExample(): ExampleEntry {
    return (
      this.examples.find((example) => example.slug === this.route.value) ??
      this.examples[0]
    );
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
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
