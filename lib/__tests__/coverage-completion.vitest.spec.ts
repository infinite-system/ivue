/**
 * Coverage completion: the package entry, the Kernel container, the
 * ivueHmr Vite plugin's transform in every mode, and the one hmrActive()
 * branch that only evaluates outside the TEST short-circuit.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as packageEntry from '../index';
import { Kernel, kernel } from '../kernel';
import ivueHmr from '../hmr-plugin';
import { ivueHotUpdate, Reactive } from '../Reactive';
import { ref } from 'vue';

describe('package entry (index.ts)', () => {
  it('re-exports the engine surface', () => {
    expect(typeof packageEntry.Reactive).toBe('function');
    expect(typeof packageEntry.ivueHotUpdate).toBe('function');
  });
});

describe('Kernel', () => {
  it('sets, gets, falls back, clears', () => {
    const container = new Kernel();
    container.set('answer', 42);
    expect(container.get('answer', 0)).toBe(42);
    expect(container.get('missing', 'fallback')).toBe('fallback');
    container.clear();
    expect(container.get('answer', 0)).toBe(0);
    expect(kernel).toBeInstanceOf(Kernel);
  });
});

describe('ivueHmr plugin', () => {
  const transform = (plugin: any, code: string, id: string) =>
    plugin.transform(code, id);

  it('declares dev-server-only metadata', () => {
    const plugin: any = ivueHmr();
    expect(plugin.name).toBe('ivue-hmr');
    expect(plugin.apply).toBe('serve');
    expect(plugin.enforce).toBe('post');
  });

  it('injects a self-accept into Reactive() modules', () => {
    const plugin: any = ivueHmr();
    const out = transform(plugin, 'const X = Reactive(class {});', '/src/x.ts');
    expect(out.code).toContain('import.meta.hot.accept');
    expect(out.code).toContain("from 'ivue'");
  });

  it('honors a custom runtime specifier', () => {
    const plugin: any = ivueHmr({ runtime: 'src/utils/ivue2' });
    const out = transform(plugin, 'const X = Reactive(class {});', '/src/x.ts');
    expect(out.code).toContain("from 'src/utils/ivue2'");
  });

  it('skips non-matching, excluded, non-Reactive, self-managed, and opted-out files', () => {
    const plugin: any = ivueHmr();
    expect(transform(plugin, 'const X = Reactive(class {});', '/src/x.css')).toBeUndefined();
    expect(transform(plugin, 'const X = Reactive(class {});', '/node_modules/dep/x.ts')).toBeUndefined();
    expect(transform(plugin, 'const plain = 1;', '/src/x.ts')).toBeUndefined();
    expect(
      transform(plugin, 'const X = Reactive(class {});\nif (import.meta.hot) {}', '/src/x.ts'),
    ).toBeUndefined();
    expect(
      transform(plugin, '// @ivue-no-hmr\nconst X = Reactive(class {});', '/src/x.ts'),
    ).toBeUndefined();
  });

  it('honors custom include/exclude patterns', () => {
    const plugin: any = ivueHmr({ include: /\.mjs$/, exclude: /skipme/ });
    expect(transform(plugin, 'Reactive(class {});', '/src/x.ts')).toBeUndefined();
    expect(transform(plugin, 'Reactive(class {});', '/skipme/x.mjs')).toBeUndefined();
    expect(transform(plugin, 'Reactive(class {});', '/src/x.mjs')).toBeDefined();
  });

  it('fast mode prepends the disable global and injects no accept', () => {
    const plugin: any = ivueHmr({ fast: true });
    const out = transform(plugin, 'const X = Reactive(class {});', '/src/x.ts');
    expect(out.code.startsWith('// injected by ivue-hmr (fast)')).toBe(true);
    expect(out.code).toContain("globalThis[Symbol.for('ivue.hmr.disable')] = true;");
    expect(out.code).not.toContain('accept');
    // fast still leaves non-Reactive files alone
    expect(transform(plugin, 'const plain = 1;', '/src/x.ts')).toBeUndefined();
  });
});

describe('hmrActive() full left-conjunction (line outside the TEST short-circuit)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as any)[Symbol.for('ivue.hmr.disable')];
    delete (globalThis as any)[Symbol.for('ivue.hmr.force')];
  });

  it('evaluates import.meta.hot when TEST is false', () => {
    vi.stubEnv('TEST', false as any);
    vi.stubEnv('DEV', true as any);
    class $Probe {
      get value() {
        return ref(1);
      }
    }
    const Probe = Reactive($Probe);
    const probe: any = new Probe();
    expect(probe.value.value).toBe(1); // engine fully functional either way
  });

  it('disable flag short-circuits even with TEST false', () => {
    vi.stubEnv('TEST', false as any);
    vi.stubEnv('DEV', true as any);
    (globalThis as any)[Symbol.for('ivue.hmr.disable')] = true;
    class $Probe2 {
      get value() {
        return ref(2);
      }
    }
    const Probe2 = Reactive($Probe2);
    expect(new (Probe2 as any)().value.value).toBe(2);
  });
});

describe('remaining HMR branch arms', () => {
  afterEach(() => {
    delete (globalThis as any)[Symbol.for('ivue.hmr.force')];
  });

  it('ivueHotUpdate without a hot context is a no-op', () => {
    expect(() => ivueHotUpdate(null, { Anything: class {} })).not.toThrow();
    expect(() => ivueHotUpdate(undefined, {})).not.toThrow();
  });

  it('an explicit hmrId keys the registry instead of the class name', () => {
    (globalThis as any)[Symbol.for('ivue.hmr.force')] = true;
    class $Keyed {
      greet() {
        return 'v1';
      }
    }
    const First = Reactive($Keyed, 'explicit-key');
    // same class re-registered under the same explicit id → identical proxy
    const Second = Reactive($Keyed, 'explicit-key');
    expect(Second).toBe(First);
    const registry = (globalThis as any)[
      Symbol.for('ivue.hmr.registry')
    ] as Map<string, unknown>;
    expect(registry.has('explicit-key')).toBe(true);
    registry.delete('explicit-key');
  });
});
