import type { Class } from '../types/core'
/**
 * Apply traits to the derived class, methods and properties are supported.
 *
 * @param derivedCtor
 * @param constructors
 */
export function Traits (derivedCtor: Class, constructors: any[]): void {

  constructors.reverse().forEach((baseCtor) => {

    const obj = new baseCtor(derivedCtor)

    for (const prop in obj) {
      Object.defineProperty(
        derivedCtor.prototype,
        prop,
        {
          value: obj[prop],
          writable: true
        }
      );
    }

    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (!(name in derivedCtor.prototype)) {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
        );
      }
    });
  });
}
