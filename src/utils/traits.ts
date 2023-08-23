import type { Class } from '../types/core'

/**
 * Traits architecture that supports methods, properties, getters and setters.
 * 
 * Traits override each other, while traits can set new props onto
 * the main prototype, they cannot override the main prototypes' 
 * props if the main prototype had them already initially.
 * 
 * Traits override each other, left most traits having higher priority, matching
 * TypeScript's interface `interface Class extends Trait1, Trait2, Trait3 {}`
 * architecture, enabling us to have full TypeScript & IDE support:
 * 
 * Example:
 * ```ts
 * class MainClass {}
 * 
 * class Trait1 {
 *   get prop () { return 3 }
 * }
 * 
 * class Trait2 {
 *   get prop () { return 2 }
 * }
 * 
 * class Trait3 {
 *   get prop () { return 3 }
 * }
 * 
 * Traits(MainClass, [Trait1, Trait2, Trait3])
 * export interface MainClass extends Trait1, Trait2, Trait3 {}
 * ```
 * 
 * Trait1 props will override Traits2 & Traits3 properties,
 * but will not override MainClass properties if set.
 * 
 * Inspired by TypeScript docs: https://www.typescriptlang.org/docs/handbook/mixins.html#alternative-pattern
 * 
 * @param main
 * @param traits
 */
export function Traits (main: Class, traits: Class[]): void {

  const initialProtoSetterOnly: Record<string | number | symbol, Function> = {}

  const initialProto = Object.getOwnPropertyNames(main.prototype)
    .reduce((acc: any, prop: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(main.prototype, prop)
      let skip = false
      // skip setters without getters
      if (descriptor?.set && !descriptor?.get) {
        // collect setter only descriptors
        initialProtoSetterOnly[prop] = descriptor?.set
        skip = true
      }
      if (!skip) acc[prop] = true
      return acc
    }, {})

  const notInInitialProto: Record<string, boolean> = {}

  traits.reverse().forEach(trait => {

    // Init the traits constructor to be able to perform
    // transformations on the main class beyond 
    // just property & method inheritance.
    const obj = new trait(main)

    // Loop initialized properties, otherwise they are undefined
    for (const prop in obj) {

      if (!(prop in initialProto)) notInInitialProto[prop] = true

      // Did prop exist on the initial state of main prototype?
      // If it did, we do not want to override it
      if (prop in notInInitialProto) {
        Object.defineProperty(
          main.prototype,
          prop,
          {
            value: obj[prop],
            writable: true
          }
        )
      }
    }

    // Loop through all properties to get the methods
    Object.getOwnPropertyNames(trait.prototype).forEach(prop => {
      if (prop !== 'constructor') {

        if (!(prop in initialProto)) notInInitialProto[prop] = true

        // Did prop exist on the initial state of main prototype?
        // If it did, we do not want to override it
        if (prop in notInInitialProto) {
          const descriptor = Object.getOwnPropertyDescriptor(trait.prototype, prop) || Object.create(null)

          // This is to ensure that setters from other traits are passed down
          // but only if the initialProto has no setter set
          if (descriptor?.set && !(prop in initialProtoSetterOnly)) {
            initialProtoSetterOnly[prop] = descriptor?.set
          }

          // This is to ensure the initialProto with set only does not get overriden 
          // with traits that do not have a setter, but only have a getter
          if (descriptor?.get && !descriptor?.set && prop in initialProtoSetterOnly) {
            descriptor.set = initialProtoSetterOnly[prop]
          }

          Object.defineProperty(
            main.prototype,
            prop,
            descriptor
          )
        }

      }
    })
  })
}
