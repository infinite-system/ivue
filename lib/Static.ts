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
 * through a given class, its (shallowly frozen) result is stored under a
 * symbol OWN property of that receiver, and later reads return the stored
 * value. The `Object.hasOwn` guard never walks the prototype chain, so a
 * parent's cache can never shadow a subclass — each class in a hierarchy
 * derives through its own overrides on its own first read, in ANY read
 * order. The `$` prefix IS the API: a static getter that must stay live
 * (a knob for subclasses to pinch, a fresh-per-read value) must not use
 * it. Cached values are frozen shallowly — cache-and-freeze or
 * return-fresh, never cache-mutable.
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

      const descriptor = Object.getOwnPropertyDescriptor(currentClass, key)!;

      if (typeof descriptor.value === 'function') {
        const method = descriptor.value;

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: ClassConstructor) {
            const boundMethod = method.bind(this);
            Object.defineProperty(this, key, { ...descriptor, value: boundMethod });
            return boundMethod;
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

        Object.defineProperty(SelectedClass, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get(this: any) {
            if (!Object.hasOwn(this, cacheKey)) {
              Object.defineProperty(this, cacheKey, {
                configurable: true,
                value: Object.freeze(getter.call(this)),
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
