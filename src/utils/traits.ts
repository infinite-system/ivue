import type { Class } from '../types/core'

/**
 * Apply traits to the derived class, methods and properties are supported.
 *
 * @param mainClass
 * @param classes
 */
export function Traits (mainClass: Class, classes: any[]): void {

  classes.reverse().forEach((traitClass) => {

    const obj = new traitClass(mainClass)

    for (const prop in obj) {
      Object.defineProperty(
        mainClass.prototype,
        prop,
        {
          value: obj[prop],
          writable: true
        }
      )
    }

    Object.getOwnPropertyNames(traitClass.prototype).forEach((name) => {
      if (!(name in mainClass.prototype)) {
        Object.defineProperty(
          mainClass.prototype,
          name,
          Object.getOwnPropertyDescriptor(traitClass.prototype, name) ||
          Object.create(null)
        )
      }
    })
  })
}
