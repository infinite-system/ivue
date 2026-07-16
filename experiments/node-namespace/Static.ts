export type ClassConstructor = new (...arguments_: any[]) => any;

/** Lazily bind every visible static method without touching the raw class. */
export function Static<Class extends ClassConstructor>(
  targetClass: Class,
): Class {
  const SelectedClass = class extends targetClass {};
  const visitedKeys = new Set<PropertyKey>();

  for (
    let currentClass = targetClass;
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
          Object.defineProperty(this, key, {
            ...descriptor,
            value: boundMethod,
          });
          return boundMethod;
        },
      });
    }
  }

  return SelectedClass as Class;
}
