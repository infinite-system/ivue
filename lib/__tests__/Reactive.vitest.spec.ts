import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ref } from 'vue';
import {
  computed,
  nextTick,
  isReactive,
  isRef,
  reactive,
  ref,
  shallowRef,
  toRaw,
  watch,
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
      const instance = new RFoo();
      // No deep reactive proxy is created per instance.
      expect(isReactive(instance)).toBe(false);
      // toRaw() on a plain instance returns the instance itself.
      expect(toRaw(instance)).toBe(instance);
    });
  });

  describe('lazy reactive getters (ref-returning)', () => {
    it('caches the SAME ref instance across accesses (stable identity)', () => {
      class Box {
        get width() {
          return ref(100);
        }
      }
      const instance = new (Reactive(Box))();
      const r1 = (instance as any).width;
      const r2 = (instance as any).width;
      expect(isRef(r1)).toBe(true);
      expect(r1).toBe(r2); // exact same ref → stable reactive cell
      r1.value = 250;
      expect((instance as any).width.value).toBe(250); // write survives
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
      const instance: any = new (Reactive(Box))();
      expect(instance.depth.value).toBe(10);
      expect(instance.area.value).toBe(8);
      instance.w.value = 5;
      expect(instance.area.value).toBe(10); // computed reacts
    });

    it('keeps the prototype setter wired for a ref-returning getter (assign via property)', () => {
      const sets: number[] = [];
      class WithSetter {
        _b = ref(1);
        get x() {
          return this._b; // returns the ref → cached, no de-opt
        }
        set x(v: number | Ref<number>) {
          sets.push(v as number);
          this._b.value = v as number; // standard setter writes through
        }
      }
      const instance: any = new (Reactive(WithSetter))();
      expect(instance.x.value).toBe(1); // getter returns the cached ref
      instance.x = 7; // prototype setter → originalSetter.call(toRaw(this), 7)
      expect(sets).toEqual([7]);
      expect(instance.x.value).toBe(7);
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
      const instance: any = new (Reactive(Box))();
      expect(instance.label.value).toBe('w=2');
      instance.label.value = 'set 42';
      expect(instance.w.value).toBe(42);
      expect(instance.label.value).toBe('w=42');
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
      // The getter's VALUE is not cached under any symbol — only the
      // engine's RAW back-pointer (stamped on first access by resolveRaw)
      // may exist on the instance.
      const syms = Object.getOwnPropertySymbols(a);
      expect(syms.map((s) => s.toString())).toEqual(['Symbol(ivue.raw)']);
      expect((a as any)[syms[0]]).toBe(a);
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

    it('native accessor pair over reactive state stays fully reactive (no computed)', async () => {
      class Thermo {
        get celsius() {
          return ref(20);
        }
        // plain derived getter + native setter — the accessor-pair form
        get fahrenheit() {
          return (this.celsius.value * 9) / 5 + 32;
        }
        set fahrenheit(value: number) {
          this.celsius.value = ((value - 32) * 5) / 9;
        }
      }
      const R = Reactive(Thermo);
      const thermo: any = new R();
      expect(thermo.fahrenheit).toBe(68);

      // watch the plain derived getter on the RAW instance
      const seen: number[] = [];
      watch(
        () => thermo.fahrenheit,
        (fahrenheit: number) => seen.push(fahrenheit),
        { flush: 'sync' },
      );

      thermo.fahrenheit = 212; // native setter writes through to the ref
      expect(thermo.celsius.value).toBeCloseTo(100, 10);
      expect(thermo.fahrenheit).toBeCloseTo(212, 10);
      expect(seen.length).toBe(1);
      expect(seen[0]).toBeCloseTo(212, 10);

      thermo.celsius.value = 0; // writing the source ref re-fires too
      expect(seen.length).toBe(2);
      expect(seen[1]).toBeCloseTo(32, 10);
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
      const instance: any = new (Reactive(WithService))();
      const s1 = instance.$service;
      const s2 = instance.$service;
      expect(s1).toBe(s2); // same object cached
      expect(created).toBe(1); // original getter ran exactly once
      s1.n = 99;
      expect(instance.$service.n).toBe(99); // mutations persist on the singleton
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
      const instance: any = new (Reactive(Counter))();
      const m1 = instance.inc;
      const m2 = instance.inc;
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
      const instance: any = new (Reactive(Counter))();
      const { inc } = instance; // detached
      expect(inc()).toBe(11);
      expect(inc()).toBe(12);
      expect(instance.count).toBe(12);
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

  describe('raw resolution through proxy chains (resolveRaw)', () => {
    // REGRESSION: the engine once resolved the raw as
    // `this[RAW] ?? (this[RAW] = toRaw(this))`. Reading the symbol-keyed
    // RAW back-pointer through a Vue reactive proxy DEEP-WRAPS the returned
    // object (`reactive(raw)`), so once the pointer was stamped, the first
    // access of any OTHER method through the proxy bound that method to the
    // PROXY and cached it on the true raw — after which `this.x.value`
    // crashed for every caller, because the proxy auto-unwraps refs.
    it('a method first-accessed through reactive() AFTER the pointer is stamped still binds to the raw (no cache poisoning)', () => {
      class Box {
        get count() {
          return ref(0);
        }
        inc() {
          this.count.value++;
        }
        dec() {
          this.count.value--;
        }
      }
      const RBox = Reactive(Box);
      const instance: any = new RBox();
      const p: any = reactive(instance);

      // First method access — pointer unstamped — bound correctly and
      // stamps the RAW back-pointer.
      void p.inc;
      // Second method's FIRST access happens with the pointer stamped:
      // this is the poisoning path.
      const dec = p.dec;
      expect(() => dec()).not.toThrow();
      expect(instance.count.value).toBe(-1);
      // The cached function keeps working from every access path.
      p.inc();
      instance.inc();
      expect(instance.count.value).toBe(1);
    });

    // Vue's component expose proxy is a plain (non-Vue-reactive) Proxy that
    // does not answer `__v_raw`, so `toRaw()` cannot see through it; the
    // engine must fall back to the RAW back-pointer — and normalize it,
    // because the pointer read through the chain comes back deep-wrapped.
    it('resolves the true raw through an opaque foreign proxy (component expose-proxy shape)', () => {
      class Box {
        get count() {
          return ref(0);
        }
        inc() {
          this.count.value++;
        }
        dec() {
          this.count.value--;
        }
      }
      const RBox = Reactive(Box);
      const instance: any = new RBox();
      const p: any = reactive(instance);
      void p.inc; // stamp the pointer via the normal component path

      const foreign: any = new Proxy(p, {
        get(target, key, receiver) {
          if (key === '__v_raw') return undefined; // opaque to toRaw()
          return Reflect.get(target, key, receiver); // accessors run with this=foreign
        },
      });

      // First access of `dec` happens THROUGH the foreign chain.
      const dec = foreign.dec;
      expect(() => dec()).not.toThrow();
      expect(instance.count.value).toBe(-1);
      // Ref cells materialized through the foreign chain land on the raw.
      expect(foreign.count).toBe(-1); // auto-unwrapped via the reactive layer
      instance.inc();
      expect(instance.count.value).toBe(0);
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
      const instance: any = new (Reactive(Leaf))();
      expect(instance.summary.value).toBe('{Leaf>(Mid>[Base:div])}');
      // de-opt plain-value getter chain via super
      expect(instance.chain).toBe('Base->Mid->Leaf');
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
      const instance: any = new (Reactive(Child))();
      expect(instance.val.value).toBe(11);
      // Both a base-level and child-level cache symbol exist on the instance.
      expect(Object.getOwnPropertySymbols(instance).length).toBeGreaterThanOrEqual(
        2,
      );
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
      const instance: any = new (Reactive(Child))();
      expect(instance.world()).toBe('base+child');
    });
  });

  describe('deep inheritance (parent / grandparent / great-grandparent)', () => {
    // L1 (great-grandparent) -> L2 -> L3 -> L4 (child)
    class L1 {
      get base() {
        return ref(10);
      }
      get tag() {
        return computed(() => `L1:${(this as any).base.value}`);
      }
      get name() {
        return 'L1';
      }
      greet() {
        return 'hi-L1';
      }
    }
    class L2 extends L1 {
      get tag() {
        return computed(() => `L2(${super.tag.value})`);
      }
      get name() {
        return super.name + '>L2';
      }
      greet() {
        return super.greet() + '/L2';
      }
    }
    class L3 extends L2 {
      get extra() {
        return ref(5);
      }
      get tag() {
        return computed(() => `L3[${super.tag.value}]`);
      }
      get name() {
        return super.name + '>L3';
      }
    }
    class L4 extends L3 {
      get tag() {
        return computed(() => `L4{${super.tag.value}}`);
      }
      get name() {
        return super.name + '>L4';
      }
      // computed in the child aggregating refs declared 3 and 1 levels up
      get sum() {
        return computed(
          () => (this as any).base.value + (this as any).extra.value,
        );
      }
      greet() {
        return super.greet() + '/L4';
      }
    }
    Reactive(L4);

    it('computed super-chains resolve through 4 levels', () => {
      const d: any = new L4();
      // L4 wraps L3 wraps L2 wraps L1
      expect(d.tag.value).toBe('L4{L3[L2(L1:10)]}');
    });

    it('plain-getter (de-opt) super-chains resolve through 4 levels', () => {
      const d: any = new L4();
      expect(d.name).toBe('L1>L2>L3>L4');
    });

    it('refs declared in ancestors are inherited and aggregated by a child computed', () => {
      const d: any = new L4();
      expect(d.base.value).toBe(10); // from great-grandparent
      expect(d.extra.value).toBe(5); // from grandparent
      expect(d.sum.value).toBe(15);
    });

    it('mutating an ANCESTOR ref re-runs the full computed chain (reactivity through inheritance)', () => {
      const d: any = new L4();
      expect(d.tag.value).toBe('L4{L3[L2(L1:10)]}');
      expect(d.sum.value).toBe(15);

      d.base.value = 20; // great-grandparent ref
      expect(d.tag.value).toBe('L4{L3[L2(L1:20)]}'); // chain recomputed
      expect(d.sum.value).toBe(25);

      d.extra.value = 7; // grandparent ref
      expect(d.sum.value).toBe(27);
    });

    it('each level resolves correctly as a standalone instance', () => {
      expect((new L2() as any).tag.value).toBe('L2(L1:10)');
      expect((new L3() as any).tag.value).toBe('L3[L2(L1:10)]');
      expect((new L2() as any).name).toBe('L1>L2');
      expect((new L3() as any).name).toBe('L1>L2>L3');
    });

    it('every level caches its own computed under a distinct symbol (no shadow collision)', () => {
      const d: any = new L4();
      d.tag.value; // materializes L4, L3, L2, L1 caches via the super chain
      // 4 distinct computed cache symbols (+ base ref once it is read)
      d.base.value;
      const symbols = Object.getOwnPropertySymbols(d).filter(
        (s) =>
          s !==
          Object.getOwnPropertySymbols(d).find(
            (x) => x.toString() === 'Symbol(ivue.raw)',
          ),
      );
      // at least the four tag Refs + base must coexist (RAW pointer excluded)
      expect(symbols.length).toBeGreaterThanOrEqual(5);
    });

    it('super method calls chain through 3 levels', () => {
      const d: any = new L4();
      expect(d.greet()).toBe('hi-L1/L2/L4'); // L3 does not override greet()
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
      const instance: any = new B();
      expect(instance.x.value).toBe(1);
      expect(instance.m()).toBe(2);
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
      const instance: any = new RChild();
      expect(instance.p.value).toBe('p'); // parent getter still works (processed once)
      expect(instance.c.value).toBe('c');
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
      const instance: any = new (Reactive(SetterOnly))();
      instance.sink = 55;
      expect(received).toBe(55);
      expect(instance._v).toBe(55);
    });

    it('plain instance data fields are untouched', () => {
      class Data {
        name = 'hello';
        nums = [1, 2, 3];
      }
      const instance: any = new (Reactive(Data))();
      expect(instance.name).toBe('hello');
      expect(instance.nums).toEqual([1, 2, 3]);
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
      const instance: any = new (Reactive(Store))();
      const c = instance.doubled; // materialize + cache the computed
      expect(c.value).toBe(4);

      (instance as ReactiveInstance<Store>).$stopEffects();

      // caches cleared → a fresh computed is produced on next access
      const c2 = instance.doubled;
      expect(c2).not.toBe(c);
      expect(c2.value).toBe(4);
      // no cache symbols should survive teardown (until re-access creates them)
      // (c2 access above re-created exactly one)
      expect(Object.getOwnPropertySymbols(toRaw(instance)).length).toBeGreaterThan(
        0,
      );
    });

    it('deletes cached bound methods without error', () => {
      class Store {
        ping() {
          return 'pong';
        }
      }
      const instance: any = new (Reactive(Store))();
      const m1 = instance.ping; // cache a bound fn (has no .effect)
      expect(m1()).toBe('pong');
      (instance as any).$stopEffects();
      const m2 = instance.ping; // re-bound after cache clear
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
      const instance: any = new (Reactive(Store))();
      instance.x; // materialize a cache entry
      (instance as any).$stopEffects();
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
      const instance: any = new (Reactive(Store))();
      instance.m(); // sets the RAW anchor symbol + a bound-method symbol
      instance.r; // sets a ref cache symbol
      expect(() => instance.$stopEffects()).not.toThrow();
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
        '$stopEffects',
      );
      Reactive(Store); // must not redefine
      const desc2 = Object.getOwnPropertyDescriptor(
        Store.prototype,
        '$stopEffects',
      );
      expect(desc1!.value).toBe(desc2!.value);
    });
  });

  describe('$watch + lazy effect scope', () => {
    it('a watcher registered via $watch fires on change', () => {
      class Store {
        get count() {
          return ref(0);
        }
      }
      const instance: any = new (Reactive(Store))();
      const seen: number[] = [];
      instance.$watch(
        () => instance.count.value,
        (v: number) => seen.push(v),
        { flush: 'sync' },
      );
      instance.count.value = 1;
      instance.count.value = 2;
      expect(seen).toEqual([1, 2]);
    });

    it('$stopEffects stops watchers created via $watch', () => {
      class Store {
        get count() {
          return ref(0);
        }
      }
      const instance: any = new (Reactive(Store))();
      const seen: number[] = [];
      instance.$watch(
        () => instance.count.value,
        (v: number) => seen.push(v),
        { flush: 'sync' },
      );
      instance.count.value = 1;
      expect(seen).toEqual([1]);

      instance.$stopEffects();

      instance.count.value = 2; // scope stopped → no more callbacks
      expect(seen).toEqual([1]);
    });

    it('pure-data instances never allocate a scope (zero overhead)', () => {
      class Store {
        get count() {
          return ref(0);
        }
        bump() {
          return 1;
        }
      }
      const instance: any = new (Reactive(Store))();
      instance.count.value;
      instance.bump();
      // No scope symbol exists because $watch was never called.
      const hasScope = Object.getOwnPropertySymbols(instance).some(
        (s) => s.toString() === 'Symbol(ivue_scope)',
      );
      expect(hasScope).toBe(false);
      // $stopEffects is still safe with no scope present
      expect(() => instance.$stopEffects()).not.toThrow();
    });

    it('reuses the same scope across multiple $watch calls', () => {
      class Store {
        get a() {
          return ref(0);
        }
        get b() {
          return ref(0);
        }
      }
      const instance: any = new (Reactive(Store))();
      const seen: string[] = [];
      instance.$watch(
        () => instance.a.value,
        () => seen.push('a'),
        { flush: 'sync' },
      );
      instance.$watch(
        () => instance.b.value,
        () => seen.push('b'),
        { flush: 'sync' },
      ); // reuses scope
      instance.a.value = 1;
      instance.b.value = 1;
      expect(seen).toEqual(['a', 'b']);
      // Both watchers stop together via the single shared scope
      instance.$stopEffects();
      instance.a.value = 2;
      instance.b.value = 2;
      expect(seen).toEqual(['a', 'b']);
    });
  });

  describe('exotic prototype chains', () => {
    it('handles a chain that bottoms out at null (no Object.prototype)', () => {
      function NullBase(this: any) {}
      NullBase.prototype = Object.create(null); // proto chain ends at null
      class Child extends (NullBase as any) {
        get x() {
          return ref(7);
        }
      }
      const R = Reactive(Child as any);
      const instance: any = new R();
      expect(instance.x.value).toBe(7); // walked past the null-proto base safely
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
    const out = propsWithDefaults(defaults, { ...typed }) as Record<
      string,
      any
    >;
    expect(out.s.default).toBe('x');
    expect(out.n.default).toBe(5);
    expect(out.b.default).toBe(true);
    expect(out.fn.default).toBe(fn); // function passed through directly
    expect(out.nul.default).toBe(null); // null → else branch, assigned directly
  });

  it('wraps object/array defaults in a factory that structuredClones', () => {
    const typed = { o: { type: Object }, a: { type: Array } };
    const defaults = { o: { nested: { k: 1 } }, a: [1, 2, 3] };
    const out = propsWithDefaults(defaults, { ...typed }) as Record<
      string,
      any
    >;

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
    const out = propsWithDefaults(defaults, { ...typed }) as Record<
      string,
      any
    >;
    expect(typeof out.c.default).toBe('function');
    expect(out.c.default()).toBe(Cool); // not instantiated, not cloned
  });

  it('never mutates the input descriptors — shared type maps stay clean', () => {
    // Descriptors are routinely SHARED between props maps via spread
    // (`{ ...baseParamsTypes }` copies the outer object only). A mutating
    // implementation would rewrite the base component's defaults when a
    // wrapper applies different ones.
    const typed = { a: { type: Number }, b: { type: String } };
    const aRef = typed.a;
    const out = propsWithDefaults({ a: 1 }, typed);
    expect(out.a).not.toBe(aRef); // copied, not augmented in place
    expect(out.a.default).toBe(1);
    expect('default' in aRef).toBe(false); // the shared input is untouched
    expect('default' in out.b).toBe(false);

    // the wrapper scenario: same descriptors, different defaults
    const wrapperOut = propsWithDefaults({ a: 2 }, { ...typed });
    expect(wrapperOut.a.default).toBe(2);
    expect(out.a.default).toBe(1); // base defaults survive
  });


});


describe('$watchEffect (scoped watchEffect)', () => {
  it('runs immediately, re-runs on dep change, and is stopped by $stopEffects', async () => {
    class Box {
      get n() {
        return ref(1);
      }
    }
    const R = Reactive(Box);
    const instance: any = new R();
    let runs = 0;
    let last = 0;
    instance.$watchEffect(() => {
      runs++;
      last = instance.n.value;
    });
    expect(runs).toBe(1);
    expect(last).toBe(1);
    instance.n.value = 5;
    await nextTick();
    expect(runs).toBe(2);
    expect(last).toBe(5);
    instance.$stopEffects();
    instance.n.value = 9;
    await nextTick();
    expect(runs).toBe(2); // scope stopped — no further runs
  });

  it('returns a stop handle and shares the $watch scope', async () => {
    class Box {
      get n() {
        return ref(0);
      }
    }
    const R = Reactive(Box);
    const instance: any = new R();
    let effectRuns = 0;
    let watchRuns = 0;
    const stop = instance.$watchEffect(() => {
      effectRuns++;
      void instance.n.value;
    });
    instance.$watch(
      () => instance.n.value,
      () => {
        watchRuns++;
      }
    );
    stop(); // individual stop, scope stays alive
    instance.n.value = 3;
    await nextTick();
    expect(effectRuns).toBe(1); // stopped
    expect(watchRuns).toBe(1); // sibling watcher in the same scope still fires
  });
});
