// Vendored from ivue lib/Static.ts — the playground is self-contained on
// purpose (StackBlitz imports this folder straight from GitHub).
/**
 * `Static()` — the static-side sibling of `Reactive()`.
 *
 * Lazily binds every visible static method of a capability class without
 * touching the raw class, so methods stay referentially stable and safe to
 * retain as callbacks (routers, watchers, command handlers) while the
 * selected `Class` slot remains replaceable by a kernel/plugin.
 *
 * Get-only static accessors whose name starts with `$` become
 * compute-once-per-receiver caches: the getter body runs on first read
 * through a given class, its result is stored under a symbol OWN property
 * of that receiver, and later reads return the stored value. The store
 * is a record tagged with its owner, and the guard is one chain read and
 * one identity compare (`hit.owner === this`) rather than `Object.hasOwn`
 * — measured 3.7 ns a read against 5.5 — so a parent's record found
 * through the chain is recognised as the parent's and never shadows a
 * subclass: each class in a hierarchy derives through its own overrides
 * on its own first read, in ANY read order.
 * The `$` prefix IS the API: it promises STABLE IDENTITY per receiver,
 * nothing more — whether the cached value is then treated as immutable
 * config or as a mutable memo table is the author's design. A static
 * getter that must stay live (a knob for subclasses to pinch, a
 * fresh-per-read value) must not use the prefix.
 *
 * Method binding uses the same per-receiver symbol discipline: the bound
 * function is cached under a symbol own property, never under the method
 * name — so a parent-first read can never install a parent-bound method
 * where a subclass's chain lookup would find it.
 *
 * `$` semantics are GRANTED BY the transform: a raw class, a raw
 * subclass, or a class only passed through `Reactive()` keeps native
 * getter behavior. A class that needs instance reactivity AND static
 * `$`-caches composes the transforms: `Static(Reactive($Class))`.
 *
 * This is the namespace pattern's backend adapter: canonical namespace +
 * mutable `Class` slot + late reads, for STATELESS capability classes (a
 * function bag). Never wrap stateful/reactive instance classes with it — use
 * `Reactive()` for those; `Static()` operates on the single class object and
 * has no instance dimension.
 *
 * Ships from `ivue/extras` (not the reactive core) so the primary `ivue`
 * entry stays minimal.
 */
export type ClassConstructor = new (...arguments_: any[]) => any;

const hasOwn = Object.hasOwn;

// Every bind/cache symbol this module ever issues — so a second wrap can
// recognize an ancestor's runtime residue even for the unregistered
// symbols that back symbol-keyed methods.
const issuedCacheKeys = new Set<PropertyKey>();

/** The key under which a bound subclass names the raw class `Static()` wrapped — for tooling that
 *  prints a class by name and must see past the wrapper. */
export const STATIC_RAW = Symbol.for('ivue.static.raw');

export function Static<Class extends ClassConstructor>(targetClass: Class): Class {
  const SelectedClass = class extends targetClass {};
  Object.defineProperty(SelectedClass, STATIC_RAW, { configurable: true, value: targetClass });
  const visitedKeys = new Set<PropertyKey>();

  for (
    let currentClass: ClassConstructor = targetClass;
    currentClass !== Function.prototype;
    currentClass = Object.getPrototypeOf(currentClass)
  ) {
    for (const key of Reflect.ownKeys(currentClass)) {
      if (visitedKeys.has(key)) continue;
      visitedKeys.add(key);

      // An already-wrapped ancestor that has been READ owns its bind/cache
      // symbol properties, and every wrapper names its raw class. They are
      // runtime residue, not API — re-wrapping them would install an
      // ancestor-bound function where the child's own chain lookup expects
      // to bind for itself, or bind the raw class as if it were a method.
      if (key === STATIC_RAW || issuedCacheKeys.has(key)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(currentClass, key)!;

      if (typeof descriptor.value === 'function') {
        // HOT-LOOP READY — measured, twice, after two wrong theories. The
        // bind happens ONCE: the first read defines an own bind-key
        // property holding the bound function; every later read returns
        // it. A HOISTED bound method is exactly plain-function speed
        // (in-browser, 9M calls, fresh-page medians: module fn 31.7ms,
        // hoisted bound method 30.0ms). The ONLY per-call cost is reading
        // the method THROUGH the accessor inside the loop (84.6ms same
        // loop) — so in a million-call loop, destructure the methods once
        // (`const { method } = X.Class` — a late read of the mutable slot,
        // so a subclass swap is still honored) and pay the accessor once.
        // Ordinary call counts never notice any of this.
        //
        // Benchmark honestly: a shared bench(fn) harness makes the call
        // site megamorphic and slows every variant measured after the
        // first — that artifact once misread bound calls as "48% slower."
        // Fresh page per variant, dedicated loops.
        // One symbol PER ACCESSOR, never per name: a child's override and the parent's method must
        // cache under different keys on one receiver, or `super.method()` in the override reads the
        // parent's accessor with `this` as the child, finds the child's own bound override under the
        // shared name-key, and recurses.
        const method = descriptor.value;
        const bindKey = Symbol(`ivue.staticBound.${String(key)}`);
        issuedCacheKeys.add(bindKey);

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: any) {
            if (!hasOwn(this, bindKey)) {
              Object.defineProperty(this, bindKey, {
                configurable: true,
                value: method.bind(this)
              });
            }
            return this[bindKey];
          }
        });
      } else if (
        descriptor.get &&
        !descriptor.set &&
        typeof key === 'string' &&
        key.startsWith('$')
      ) {
        // The same discipline for a `$`-cache: a child's `super.$x` must reach the parent's value,
        // not the child's own cache under a shared name-key.
        const getter = descriptor.get;
        const cacheKey = Symbol(`ivue.staticCache.${key}`);
        issuedCacheKeys.add(cacheKey);

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: any) {
            // the record may be found through the chain — a parent's — and the
            // owner tag tells it from this receiver's own
            const hit: { owner: object; value: unknown } | undefined = this[cacheKey];
            if (hit !== undefined && hit.owner === this) return hit.value;
            const record = { owner: this, value: getter.call(this) };
            Object.defineProperty(this, cacheKey, { configurable: true, value: record });
            return record.value;
          }
        });
      }
    }
  }

  return SelectedClass as Class;
}
