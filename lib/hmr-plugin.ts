import type { Plugin } from 'vite';

/**
 * ivue HMR Vite plugin — "hot reload for classes" with zero boilerplate.
 *
 * The capability itself lives in the Reactive() runtime (see the HMR section
 * in Reactive.ts): a global registry keyed by class name grafts a
 * re-executed module's class onto the canonical identity, so live instances
 * keep their state and run the new behavior. The ONE thing the runtime
 * cannot do from inside is stop Vite's update propagation: a module only
 * becomes an HMR boundary if `import.meta.hot.accept()` appears literally in
 * its source. This plugin injects that line into modules that call
 * `Reactive(...)`, exactly like @vitejs/plugin-vue injects acceptance into
 * SFCs.
 *
 * Usage (vite.config.ts):
 *   import ivueHmr from 'ivue/lib/hmr-plugin';
 *   export default defineConfig({ plugins: [vue(), ivueHmr()] });
 *
 * Opt-outs:
 * - a module that already references `import.meta.hot` is left untouched
 *   (the author is managing HMR themselves);
 * - a `@ivue-no-hmr` comment anywhere in the file disables injection —
 *   edits then propagate to the importing component boundary and remount
 *   those components (still ghost-free: the runtime grafts on re-execution
 *   either way).
 *
 * Notes:
 * - dev-server only (`apply: 'serve'`) — production builds are untouched;
 * - the `Reactive(` test is deliberately naive (a same-named local function
 *   would false-positive); the injected accept is harmless on a module that
 *   turns out not to define Reactive classes — it just becomes a
 *   self-accepting module;
 * - modules whose OTHER exports (helpers, constants) are consumed elsewhere
 *   will serve stale copies of those to old importers after a hot update —
 *   the classic self-accept caveat. Keep Reactive classes in dedicated
 *   modules (the ivue namespace-export convention already does this), or
 *   opt the file out.
 */
export interface IvueHmrOptions {
  /** Files to consider (default: .ts/.tsx/.js/.jsx). */
  include?: RegExp;
  /** Files to skip (default: node_modules). */
  exclude?: RegExp;
}

export default function ivueHmr(options: IvueHmrOptions = {}): Plugin {
  const include = options.include ?? /\.[jt]sx?$/;
  const exclude = options.exclude ?? /node_modules/;
  return {
    name: 'ivue-hmr',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      if (!include.test(id) || exclude.test(id)) return;
      if (!/\bReactive\s*\(/.test(code)) return;
      if (code.includes('import.meta.hot')) return;
      if (code.includes('@ivue-no-hmr')) return;
      return {
        code:
          code +
          '\n// injected by ivue-hmr: self-accept so class edits graft onto live instances\n' +
          'if (import.meta.hot) {\n  import.meta.hot.accept();\n}\n',
        map: null,
      };
    },
  };
}
