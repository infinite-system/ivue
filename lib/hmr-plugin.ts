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
  /**
   * Module specifier the injected code imports `ivueHotUpdate` from
   * (default: 'ivue'). Point it at your local engine copy if you vendor
   * Reactive.ts (e.g. 'src/utils/ivue2').
   */
  runtime?: string;
  /**
   * High-performance dev mode: instead of arming class HMR, set
   * `globalThis[Symbol.for('ivue.hmr.disable')]` before any `Reactive()`
   * call, so dev instances are constructed at PRODUCTION speed (no
   * construct-trap proxy — ~11× cheaper on bare `new`). Class edits then
   * fall back to Vite's normal propagation (component remount / reload).
   * Wire it to an env flag for a per-terminal switch:
   *   ivueHmr({ fast: !!process.env.IVUE_FAST })
   */
  fast?: boolean;
}

export default function ivueHmr(options: IvueHmrOptions = {}): Plugin {
  const include = options.include ?? /\.[jt]sx?$/;
  const exclude = options.exclude ?? /node_modules/;
  const runtime = options.runtime ?? 'ivue';
  const fast = options.fast ?? false;
  return {
    name: 'ivue-hmr',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      if (!include.test(id) || exclude.test(id)) return;
      if (!/\bReactive\s*\(/.test(code)) return;
      if (fast) {
        // Prepend (never append): the flag must be set before this module's
        // own Reactive() calls run. Imports are hoisted above it either way,
        // and the engine reads the symbol lazily at each Reactive() call, so
        // first-transformed-module-wins is sufficient. No self-accept is
        // injected — with grafting disabled it would silently serve stale
        // classes; edits propagate to component boundaries instead.
        return {
          code:
            '// injected by ivue-hmr (fast): production-speed instances in dev\n' +
            "globalThis[Symbol.for('ivue.hmr.disable')] = true;\n" +
            code,
          map: null,
        };
      }
      if (code.includes('import.meta.hot')) return;
      if (code.includes('@ivue-no-hmr')) return;
      return {
        code:
          code +
          '\n// injected by ivue-hmr: self-accept so class edits graft onto\n' +
          '// live instances; constructor-level edits escalate to a component\n' +
          '// remount via ivueHotUpdate (imports are hoisted — EOF is fine).\n' +
          `import { ivueHotUpdate as __ivueHotUpdate } from '${runtime}';\n` +
          'if (import.meta.hot) {\n' +
          '  import.meta.hot.accept((mod) => __ivueHotUpdate?.(import.meta.hot, mod));\n' +
          '}\n',
        map: null,
      };
    },
  };
}
