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
        const bindKey =
          typeof key === 'string'
            ? Symbol.for(`ivue.staticBound.${key}`)
            : Symbol('ivue.staticBound');

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
