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
 * of that receiver, and later reads return the stored value. The
 * `Object.hasOwn` guard never walks the prototype chain, so a parent's
 * cache can never shadow a subclass — each class in a hierarchy derives
 * through its own overrides on its own first read, in ANY read order.
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

export function Static<Class extends ClassConstructor>(targetClass: Class): Class {
  const SelectedClass = class extends targetClass {};
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
      // symbol properties. They are runtime residue, not API — re-wrapping
      // them would install an ancestor-bound function where the child's
      // own chain lookup expects to bind for itself.
      if (typeof key === 'symbol' && Symbol.keyFor(key)?.startsWith('ivue.static')) continue;
      if (issuedCacheKeys.has(key)) continue; // the unregistered symbols backing symbol-keyed methods

      const descriptor = Object.getOwnPropertyDescriptor(currentClass, key)!;

      if (typeof descriptor.value === 'function') {
      // HOT-LOOP READY. The bind happens ONCE: first read of the method
      // defines an own bind-key property holding the bound function, and
      // every later read returns it — no rebinding, no closure churn, no
      // allocation per call. What remains is the accessor indirection of
      // a `.method` read. Measured at 20M calls: a plain module function
      // 30.9M calls/s, `Class.method()` 25.2M/s, and the method hoisted
      // into a local 28.6M/s. So statics are fine directly in hot paths;
      // only a loop calling MILLIONS of times earns hoisting the method
      // out (`const { method } = X.Class` — a late read of the mutable
      // slot, so a subclass still wins).
        const method = descriptor.value;
        const bindKey =
          typeof key === 'string'
            ? Symbol.for(`ivue.staticBound.${key}`)
            : Symbol('ivue.staticBound');
        issuedCacheKeys.add(bindKey);

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: any) {
            if (!hasOwn(this, bindKey)) {
              Object.defineProperty(this, bindKey, {
                configurable: true,
                value: method.bind(this),
              });
            }
            return this[bindKey];
          },
        });
      } else if (
        descriptor.get &&
        !descriptor.set &&
        typeof key === 'string' &&
        key.startsWith('$')
      ) {
        const getter = descriptor.get;
        const cacheKey = Symbol.for(`ivue.staticCache.${key}`);
        issuedCacheKeys.add(cacheKey);

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: any) {
            if (!hasOwn(this, cacheKey)) {
              Object.defineProperty(this, cacheKey, {
                configurable: true,
                value: getter.call(this),
              });
            }
            return this[cacheKey];
          },
        });
      }
    }
  }

  return SelectedClass as Class;
}
