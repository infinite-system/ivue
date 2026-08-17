// Without vue-tsc, plain tsc needs a module shape for .vue imports; the
// Playwright walk covers template correctness end to end.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
