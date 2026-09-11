import { onMounted, ref, shallowRef, useId } from 'vue';
import { loaders } from 'virtual:lazy-source-map';
import { Reactive } from '../../../../lib/Reactive';

// A code group whose tabs load on demand. VitePress renders every `<<<`
// snippet into the page's own chunk; this group imports a file's
// highlighted chunk (see .vitepress/plugins/lazy-source.mjs) the first
// time its tab opens, and keeps it. The markup mirrors VitePress's own
// code group so its CSS, its copy button and its themes all apply.
class $LazyCodeGroup {
  constructor(public props: LazyCodeGroup.Props) {
    // The radio-group name: Vue's SSR-safe id, so the server render and
    // the client agree (a module counter drifts across the pages the
    // build renders in one process, and hydration flags every id).
    this.name = `lazy-code-group-${useId()}`;
    onMounted(() => this.load(this.active.value));
  }

  // MUTABLE STATE — the open tab, the sources loaded so far, the failures
  get active() {
    return ref(0);
  }

  get loaded() {
    return shallowRef<Record<string, LazyCodeGroup.Source>>({});
  }

  get failed() {
    return shallowRef<Record<string, string>>({});
  }

  /** The radio-group name, assigned in the constructor. */
  readonly name: string;

  // PROPS
  get files() {
    return this.props.files;
  }

  // DERIVED
  get activeFile() {
    return this.files[this.active.value];
  }

  get activeSource(): LazyCodeGroup.Source | undefined {
    return this.loaded.value[this.activeFile.path];
  }

  get activeHtml() {
    return this.activeSource?.html ?? '';
  }

  get activeFailure() {
    return this.failed.value[this.activeFile.path];
  }

  get isLoading() {
    return !this.activeSource && !this.activeFailure;
  }

  /** The status line shows while the tab loads or after it failed. */
  get showsStatus() {
    return this.isLoading || Boolean(this.activeFailure);
  }

  get statusText() {
    return this.activeFailure
      ? `Could not load ${this.activeFile.label}: ${this.activeFailure}`
      : 'Loading…';
  }

  inputId(index: number) {
    return `${this.name}-${index}`;
  }

  isActive(index: number) {
    return this.active.value === index;
  }

  // ACTIONS
  select(index: number) {
    this.active.value = index;
    this.load(index);
  }

  async load(index: number) {
    const file = this.files[index];
    if (!file || this.loaded.value[file.path] || this.failed.value[file.path]) return;
    const loader = loaders[file.path];
    if (!loader) {
      this.failed.value = { ...this.failed.value, [file.path]: 'not in the lazy-source roots' };
      return;
    }
    try {
      const module = await loader();
      this.loaded.value = { ...this.loaded.value, [file.path]: module.default };
    } catch (error) {
      this.failed.value = { ...this.failed.value, [file.path]: (error as Error).message };
    }
  }
}

export namespace LazyCodeGroup {
  export const $Class = $LazyCodeGroup; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — the SFC constructs it
  export type Instance = typeof Class.Instance;

  export interface File {
    /** Repo-relative path, e.g. `examples/playground/src/lenis/Lenis.ts`. */
    path: string;
    label: string;
  }

  export interface Source {
    html: string;
    lines: number;
    lang: string;
  }

  export interface Props {
    files: File[];
  }
}
