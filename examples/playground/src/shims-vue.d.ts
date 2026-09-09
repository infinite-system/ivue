// Single-file components imported from .ts (the AI chat's part and tool
// registries) need a module shape for tsc; Vite supplies the real one.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
