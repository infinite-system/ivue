/**
 * `Static()` — the static-side sibling of `Reactive()`.
 *
 * Lazily binds every visible static method of a capability class without
 * touching the raw class, so methods stay referentially stable and safe to
 * retain as callbacks (routers, watchers, command handlers) while the
 * selected `Class` slot remains replaceable by a kernel/plugin.
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
      if (typeof descriptor.value !== 'function') continue;
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
    }
  }

  return SelectedClass as Class;
}
