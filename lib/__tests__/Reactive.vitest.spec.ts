import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computed,
  isReactive,
  isRef,
  reactive,
  ref,
  shallowRef,
  toRaw,
} from 'vue';

import {
  isClass,
  propsWithDefaults,
  Reactive,
  type ReactiveInstance,
} from '../Reactive';

/**
 * Test suite for Reactive.ts — the "ivue v2" engine.
 *
 * Design notes:
 *  - Reactive() MUTATES the class prototype in place (lazy getters / lazy-bound
 *    methods). Therefore every test defines its OWN fresh class so that prototype
 *    mutations never bleed across tests.
 *  - Instances are PLAIN class instances (no reactive() proxy). Reactivity is
 *    opt-in per-accessor by returning ref()/computed()/shallowRef() from getters.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Reactive()', () => {
  describe('identity & return value', () => {
    it('returns the SAME class reference (mutates in place, no wrapper)', () => {
      class Foo {
        get x() {
          return ref(1);
        }
      }
      const Result = Reactive(Foo);
      expect(Result).toBe(Foo as any);
    });

    it('instances are plain (NOT a reactive proxy) — the core perf invariant', () => {
      class Foo {
        get x() {
          return ref(1);
        }
        bump() {
          return 1;
        }
      }
      const RFoo = Reactive(Foo);
      const inst = new RFoo();
      // No deep reactive proxy is created per instance.
      expect(isReactive(inst)).toBe(false);
      // toRaw() on a plain instance returns the instance itself.
      expect(toRaw(inst)).toBe(inst);
    });
  });

  describe('lazy reactive getters (ref-returning)', () => {
    it('caches the SAME ref instance across accesses (stable identity)', () => {
      class Box {
        get width() {
          return ref(100);
        }
      }
      const inst = new (Reactive(Box))();
      const r1 = (inst as any).width;
      const r2 = (inst as any).width;
      expect(isRef(r1)).toBe(true);
      expect(r1).toBe(r2); // exact same ref → stable reactive cell
      r1.value = 250;
      expect((inst as any).width.value).toBe(250); // write survives
    });

    it('different instances get different ref instances', () => {
      class Box {
        get width() {
          return ref(1);
        }
      }
      const R = Reactive(Box);
      const a: any = new R();
      const b: any = new R();
      a.width.value = 5;
      expect(a.width.value).toBe(5);
      expect(b.width.value).toBe(1); // isolated per instance
      expect(a.width).not.toBe(b.width);
    });

    it('supports shallowRef and computed getters', () => {
      class Box {
        get depth() {
          return shallowRef(10);
        }
        get w() {
          return ref(4);
        }
        get area() {
          return computed(() => (this as any).w.value * 2);
        }
      }
      const inst: any = new (Reactive(Box))();
      expect(inst.depth.value).toBe(10);
      expect(inst.area.value).toBe(8);
      inst.w.value = 5;
      expect(inst.area.value).toBe(10); // computed reacts
    });

    it('keeps the prototype setter wired for a ref-returning getter (assign via property)', () => {
      const sets: number[] = [];
      class WithSetter {
        _b = ref(1);
        get x() {
          return this._b; // returns the ref → cached, no de-opt
        }
        set x(v: number) {
          sets.push(v);
          this._b.value = v; // standard setter writes through
        }
      }
      const inst: any = new (Reactive(WithSetter))();
      expect(inst.x.value).toBe(1); // getter returns the cached ref
      inst.x = 7; // prototype setter → originalSetter.call(toRaw(this), 7)
      expect(sets).toEqual([7]);
      expect(inst.x.value).toBe(7);
    });

    it('writable computed getter (get/set on the computed) works via .value', () => {
      class Box {
        get w() {
          return ref(2);
        }
        get label() {
          return computed({
            get: () => `w=${(this as any).w.value}`,
            set: (v: string) => {
              (this as any).w.value = parseInt(v.replace(/\D/g, ''), 10);
            },
          });
        }
      }
      const inst: any = new (Reactive(Box))();
      expect(inst.label.value).toBe('w=2');
      inst.label.value = 'set 42';
      expect(inst.w.value).toBe(42);
      expect(inst.label.value).toBe('w=42');
    });
  });

  describe('self-optimizing de-optimization (non-ref getters)', () => {
    it('getter returning a plain value de-opts back to a native getter (no setter)', () => {
      let calls = 0;
      class Plain {
        get answer() {
          calls++;
          return 42;
        }
      }
      const R = Reactive(Plain);
      const a: any = new R();
      expect(a.answer).toBe(42); // first access via wrapper → triggers de-opt
      expect(a.answer).toBe(42); // second access via restored getter
      // A brand-new instance exercises the RESTORED prototype getter (toRaw path).
      const b: any = new R();
      expect(b.answer).toBe(42);
      expect(calls).toBeGreaterThanOrEqual(3);
      // Not cached as a ref under any symbol — it's a normal getter now.
      const syms = Object.getOwnPropertySymbols(a);
      expect(syms.length).toBe(0);
    });

    it('getter+setter returning a plain value de-opts but keeps the setter wired', () => {
      class PlainRW {
        _x = 7;
        get x() {
          return this._x; // plain value → de-opt
        }
        set x(v: number) {
          this._x = v;
        }
      }
      const R = Reactive(PlainRW);
      const a: any = new R();
      expect(a.x).toBe(7); // de-opt happens here
      a.x = 99; // restored setter path
      expect(a.x).toBe(99);
      // second instance uses restored getter + setter on the prototype
      const b: any = new R();
      b.x = 123;
      expect(b.x).toBe(123);
      expect(a.x).toBe(99);
    });
  });

  describe('$-prefixed singletons (cacheWhole)', () => {
    it('caches the WHOLE result forever, even non-refs (composable/service pattern)', () => {
      let created = 0;
      class WithService {
        get $service() {
          created++;
          return { tag: 'svc', n: 1 }; // a plain object, not a ref
        }
      }
      const inst: any = new (Reactive(WithService))();
      const s1 = inst.$service;
      const s2 = inst.$service;
      expect(s1).toBe(s2); // same object cached
      expect(created).toBe(1); // original getter ran exactly once
      s1.n = 99;
      expect(inst.$service.n).toBe(99); // mutations persist on the singleton
    });
  });

  describe('lazy-bound methods', () => {
    it('returns a stable, bound function across accesses (referential equality)', () => {
      class Counter {
        count = 0;
        inc() {
          this.count++;
          return this.count;
        }
      }
      const inst: any = new (Reactive(Counter))();
      const m1 = inst.inc;
      const m2 = inst.inc;
      expect(typeof m1).toBe('function');
      expect(m1).toBe(m2); // stable identity → safe as event handler / dep
    });

    it('method is bound to the instance (this is correct when detached)', () => {
      class Counter {
        count = 10;
        inc() {
          this.count++;
          return this.count;
        }
      }
      const inst: any = new (Reactive(Counter))();
      const { inc } = inst; // detached
      expect(inc()).toBe(11);
      expect(inc()).toBe(12);
      expect(inst.count).toBe(12);
    });

    it('method can be overridden per-instance via the setter', () => {
      class Counter {
        greet() {
          return 'hi';
        }
      }
      const R = Reactive(Counter);
      const a: any = new R();
      const b: any = new R();
      a.greet = () => 'custom'; // setter → stored on raw under super symbol
      expect(a.greet()).toBe('custom');
      expect(b.greet()).toBe('hi'); // other instance unaffected
    });

    it('works when the instance IS wrapped in reactive() (toRaw anchoring)', () => {
      class Svc {
        v = 1;
        get val() {
          return ref(5);
        }
        act() {
          return 'acted';
        }
      }
      const RSvc = Reactive(Svc);
      const r: any = reactive(new RSvc());
      // Bound method + ref cache resolve against the raw target, not the proxy.
      expect(r.act()).toBe('acted');
      // Vue's reactive proxy AUTO-UNWRAPS a ref returned from the getter, so
      // through the proxy you read the value directly (no .value needed).
      expect(r.val).toBe(5);
      const raw = toRaw(r);
      expect(raw).not.toBe(r); // proxy != raw
      // caches live on the raw object, not the proxy
      expect(Object.getOwnPropertySymbols(raw).length).toBeGreaterThan(0);
    });
  });

  describe('inheritance & super chains', () => {
    it('resolves getters across a 3-level chain with super.x.value', () => {
      class Base {
        get tag() {
          return ref('div');
        }
        get summary() {
          return computed(() => `[Base:${(this as any).tag.value}]`);
        }
        get chain() {
          return 'Base';
        }
      }
      class Mid extends Base {
        get summary() {
          return computed(() => `(Mid>${super.summary.value})`);
        }
        get chain() {
          return super.chain + '->Mid';
        }
      }
      class Leaf extends Mid {
        get summary() {
          return computed(() => `{Leaf>${super.summary.value}}`);
        }
        get chain() {
          return super.chain + '->Leaf';
        }
      }
      const inst: any = new (Reactive(Leaf))();
      expect(inst.summary.value).toBe('{Leaf>(Mid>[Base:div])}');
      // de-opt plain-value getter chain via super
      expect(inst.chain).toBe('Base->Mid->Leaf');
    });

    it('super computed and child computed are cached under different symbols (no collision)', () => {
      class Base {
        get val() {
          return computed(() => 1);
        }
      }
      class Child extends Base {
        get val() {
          return computed(() => 10 + super.val.value);
        }
      }
      const inst: any = new (Reactive(Child))();
      expect(inst.val.value).toBe(11);
      // Both a base-level and child-level cache symbol exist on the instance.
      expect(Object.getOwnPropertySymbols(inst).length).toBeGreaterThanOrEqual(2);
    });

    it('inherited methods bind correctly', () => {
      class Base {
        hello() {
          return 'base';
        }
      }
      class Child extends Base {
        world() {
          return this.hello() + '+child';
        }
      }
      const inst: any = new (Reactive(Child))();
      expect(inst.world()).toBe('base+child');
    });
  });

  describe('idempotence (PROCESSED flag)', () => {
    it('calling Reactive twice on the same class is safe and a no-op the 2nd time', () => {
      class Foo {
        get x() {
          return ref(1);
        }
        m() {
          return 2;
        }
      }
      const A = Reactive(Foo);
      const B = Reactive(Foo); // second pass must not double-wrap
      expect(A).toBe(B);
      const inst: any = new B();
      expect(inst.x.value).toBe(1);
      expect(inst.m()).toBe(2);
    });

    it('Reactive(Parent) then Reactive(Child) skips the already-processed parent proto', () => {
      class Parent {
        get p() {
          return ref('p');
        }
      }
      const RParent = Reactive(Parent);
      class Child extends RParent {
        get c() {
          return ref('c');
        }
      }
      const RChild = Reactive(Child as any);
      const inst: any = new RChild();
      expect(inst.p.value).toBe('p'); // parent getter still works (processed once)
      expect(inst.c.value).toBe('c');
    });
  });

  describe('non-transformed members', () => {
    it('setter-only accessors are left as native setters (not transformed)', () => {
      let received: any = null;
      class SetterOnly {
        _v = 0;
        // getter present so we can read back; setter-only target is `sink`
        set sink(v: number) {
          received = v;
          this._v = v;
        }
        get readV() {
          return ref(this._v);
        }
      }
      const inst: any = new (Reactive(SetterOnly))();
      inst.sink = 55;
      expect(received).toBe(55);
      expect(inst._v).toBe(55);
    });

    it('plain instance data fields are untouched', () => {
      class Data {
        name = 'hello';
        nums = [1, 2, 3];
      }
      const inst: any = new (Reactive(Data))();
      expect(inst.name).toBe('hello');
      expect(inst.nums).toEqual([1, 2, 3]);
    });
  });

  describe('DEV warning: getter returns Ref but setter is standard', () => {
    it('warns at processing time about the API conflict', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class Conflict {
        get y() {
          return ref(5); // returns Ref...
        }
        set y(_v: number) {
          // ...but setter is "standard" (doesn't accept a Ref)
        }
      }
      Reactive(Conflict);
      // import.meta.env.DEV is true under vitest
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0][0])).toContain('API conflict');
    });

    it('swallows a getter that throws when probed with an empty object', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class Throwy {
        get z() {
          // Accessing this.missing.deep throws when called on {} during the
          // DEV probe — Reactive must catch and not crash.
          return ref((this as any).missing.deep);
        }
        set z(_v: any) {}
      }
      expect(() => Reactive(Throwy)).not.toThrow();
      // Probe threw before isRef() check → no warning emitted.
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('$stopEffects teardown', () => {
    it('clears cached computeds so they re-materialize fresh after teardown', () => {
      class Store {
        get x() {
          return ref(2);
        }
        get doubled() {
          return computed(() => (this as any).x.value * 2);
        }
      }
      const inst: any = new (Reactive(Store))();
      const c = inst.doubled; // materialize + cache the computed
      expect(c.value).toBe(4);

      (inst as ReactiveInstance<Store>).$stopEffects();

      // caches cleared → a fresh computed is produced on next access
      const c2 = inst.doubled;
      expect(c2).not.toBe(c);
      expect(c2.value).toBe(4);
      // no cache symbols should survive teardown (until re-access creates them)
      // (c2 access above re-created exactly one)
      expect(Object.getOwnPropertySymbols(toRaw(inst)).length).toBeGreaterThan(0);
    });

    it('invokes effect.stop() when a cached reactive value exposes one (Vue <=3.4 shape)', () => {
      // Vue 3.5 computeds no longer expose effect.stop(), so we use a faux ref
      // that satisfies isRef() AND carries a stoppable effect to cover the line.
      const stop = vi.fn();
      const fauxRef: any = { __v_isRef: true, value: 1, effect: { stop } };
      class Store {
        get faux() {
          return fauxRef;
        }
      }
      const inst: any = new (Reactive(Store))();
      inst.faux; // isRef(fauxRef) === true → cached under a symbol
      (inst as any).$stopEffects();
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('deletes cached bound methods (no .effect) without error', () => {
      class Store {
        ping() {
          return 'pong';
        }
      }
      const inst: any = new (Reactive(Store))();
      const m1 = inst.ping; // cache a bound fn (has no .effect)
      expect(m1()).toBe('pong');
      (inst as any).$stopEffects();
      const m2 = inst.ping; // re-bound after cache clear
      expect(m2).not.toBe(m1);
      expect(m2()).toBe('pong');
    });

    it('calls a user-defined stopEffects() hook if present', () => {
      let stopped = 0;
      class Store {
        get x() {
          return ref(1);
        }
        stopEffects() {
          stopped++;
        }
      }
      const inst: any = new (Reactive(Store))();
      inst.x; // materialize a cache entry
      (inst as any).$stopEffects();
      expect(stopped).toBe(1);
    });

    it('skips the RAW symbol while iterating (no crash on the raw anchor)', () => {
      class Store {
        m() {
          return 1;
        }
        get r() {
          return ref(9);
        }
      }
      const inst: any = new (Reactive(Store))();
      inst.m(); // sets the RAW anchor symbol + a bound-method symbol
      inst.r; // sets a ref cache symbol
      expect(() => inst.$stopEffects()).not.toThrow();
    });

    it('$stopEffects is injected only once (idempotent re-Reactive)', () => {
      class Store {
        m() {
          return 1;
        }
      }
      Reactive(Store);
      const desc1 = Object.getOwnPropertyDescriptor(
        Store.prototype,
        '$stopEffects'
      );
      Reactive(Store); // must not redefine
      const desc2 = Object.getOwnPropertyDescriptor(
        Store.prototype,
        '$stopEffects'
      );
      expect(desc1!.value).toBe(desc2!.value);
    });
  });
});

describe('isClass()', () => {
  it('returns false for non-functions', () => {
    expect(isClass(42)).toBe(false);
    expect(isClass('str')).toBe(false);
    expect(isClass(null)).toBe(false);
    expect(isClass({})).toBe(false);
    expect(isClass(undefined)).toBe(false);
  });

  it('returns false for arrow functions (no prototype)', () => {
    expect(isClass(() => {})).toBe(false);
  });

  it('returns false for normal functions (writable prototype)', () => {
    expect(isClass(function named() {})).toBe(false);
    function decl() {}
    expect(isClass(decl)).toBe(false);
  });

  it('returns true for ES classes (non-writable prototype)', () => {
    class Foo {}
    expect(isClass(Foo)).toBe(true);
    expect(isClass(class extends Foo {})).toBe(true);
  });
});

describe('propsWithDefaults()', () => {
  it('skips required props and props with no default', () => {
    const typed = {
      a: { type: String, required: true },
      b: { type: Number },
    };
    const defaults = { a: 'should-be-ignored' };
    const out = propsWithDefaults(defaults, { ...typed }) as Record<
      string,
      any
    >;
    expect('default' in out.a).toBe(false); // required → skipped
    expect('default' in out.b).toBe(false); // def === undefined → skipped
  });

  it('assigns primitive & function defaults directly (no factory)', () => {
    const fn = () => 'hi';
    const typed = {
      s: { type: String },
      n: { type: Number },
      b: { type: Boolean },
      fn: { type: Function },
      nul: { type: Object },
    };
    const defaults = { s: 'x', n: 5, b: true, fn, nul: null };
    const out = propsWithDefaults(defaults, { ...typed }) as Record<string, any>;
    expect(out.s.default).toBe('x');
    expect(out.n.default).toBe(5);
    expect(out.b.default).toBe(true);
    expect(out.fn.default).toBe(fn); // function passed through directly
    expect(out.nul.default).toBe(null); // null → else branch, assigned directly
  });

  it('wraps object/array defaults in a factory that structuredClones', () => {
    const typed = { o: { type: Object }, a: { type: Array } };
    const defaults = { o: { nested: { k: 1 } }, a: [1, 2, 3] };
    const out = propsWithDefaults(defaults, { ...typed }) as Record<string, any>;

    expect(typeof out.o.default).toBe('function');
    const o1 = out.o.default();
    const o2 = out.o.default();
    expect(o1).toEqual({ nested: { k: 1 } });
    expect(o1).not.toBe(o2); // fresh clone each call
    expect(o1.nested).not.toBe(o2.nested); // deep clone
    o1.nested.k = 999;
    expect(o2.nested.k).toBe(1); // isolation

    const a1 = out.a.default();
    const a2 = out.a.default();
    expect(a1).toEqual([1, 2, 3]);
    expect(a1).not.toBe(a2);
  });

  it('uses a custom cloner when provided', () => {
    const typed = { o: { type: Object } };
    const defaults = { o: { k: 1 } };
    const cloner = vi.fn((v: any) => ({ ...v, cloned: true }));
    const out = propsWithDefaults(defaults, { ...typed }, cloner) as Record<
      string,
      any
    >;
    const v = out.o.default();
    expect(cloner).toHaveBeenCalledWith(defaults.o);
    expect(v).toEqual({ k: 1, cloned: true });
  });

  it('wraps a class default in a factory that returns the class itself', () => {
    class Cool {
      x = 1;
    }
    const typed = { c: { type: Object } };
    const defaults = { c: Cool };
    const out = propsWithDefaults(defaults, { ...typed }) as Record<string, any>;
    expect(typeof out.c.default).toBe('function');
    expect(out.c.default()).toBe(Cool); // not instantiated, not cloned
  });

  it('mutates prop descriptor objects in place (adds default only)', () => {
    const typed = { a: { type: Number }, b: { type: String } };
    const aRef = typed.a;
    const out = propsWithDefaults({ a: 1 }, typed);
    expect(out.a).toBe(aRef); // same object, augmented
    expect(out.a.default).toBe(1);
    expect('default' in out.b).toBe(false);
  });
});
