// ExperimentalDocs.ts — the "Current Explorations" rail: hidden unless the
// reader opted in with ?experiment=1 (remembered for the session, cleared
// with ?experiment=0).
import { onMounted, ref } from 'vue';
import { useRoute, withBase, type Route } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $ExperimentalDocs {
  /* Knobs — STATIC */

  static get STORAGE_KEY() {
    return 'ivue.docs.experiment';
  }

  static get LINKS(): ExperimentalDocs.Link[] {
    return [{ text: 'Node Development by Restart', link: '/guide/node-class-hmr' }];
  }

  constructor(readonly route: Route = useRoute()) {
    onMounted(() => this.readExperimentFlag());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ExperimentalDocs;
  }

  // MUTABLE STATE
  get isVisible() {
    return ref(false);
  }

  // DERIVED — plain getters
  get links() {
    return this.self.LINKS;
  }

  isActive(item: ExperimentalDocs.Link) {
    return this.route.path === withBase(item.link);
  }

  href(item: ExperimentalDocs.Link) {
    return `${withBase(item.link)}?experiment=1`;
  }

  ariaCurrent(item: ExperimentalDocs.Link) {
    return this.isActive(item) ? 'page' : undefined;
  }

  // ACTIONS
  readExperimentFlag() {
    const queryValue = new URLSearchParams(window.location.search).get('experiment');
    if (queryValue === '1' || queryValue === '0') {
      sessionStorage.setItem(this.self.STORAGE_KEY, queryValue);
    }
    this.isVisible.value =
      queryValue === '1' || (queryValue !== '0' && sessionStorage.getItem(this.self.STORAGE_KEY) === '1');
  }
}

export namespace ExperimentalDocs {
  export const $Class = Static($ExperimentalDocs); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export interface Link {
    text: string;
    link: string;
  }
}
