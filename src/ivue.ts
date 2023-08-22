import { computed, reactive, toRef, type ComputedRef } from "vue";
import type { IVue, IVueToRefsObj, AnyClass, InferredArgs, Getters } from "./types/core";
import { Behavior } from "./behavior";
import { getPrototypeGetters, getInstanceGetters } from './utils/getters'

/**
 * Create ivue instance from class constructor.
 * 
 * @param className 
 * @param args 
 * @returns @see IVue<T>
 */
export function ivue<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {
  const vue = ivueTransform(reactive(Reflect.construct(className, args)), getPrototypeGetters(className.prototype), ...args)
  if (typeof vue.init === 'function') vue.init()
  return vue
}

/**
 * Create ivue instance from an object.
 * 
 * @param obj 
 * @returns 
 */
export function iobj<T extends object> (obj: T): T & IVueToRefsObj<T> {
  const vue = ivueTransform(reactive(obj), getInstanceGetters(obj))
  if (typeof vue.init === 'function') vue.init()
  return vue
}

/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param vue
 * @param getters
 * @param args Arguments are available when used via ivue(obj, ...args)
 */
export function ivueTransform (vue: any, getters: Getters, ...args: undefined[]) {

  let computeds: Record<string, ComputedRef>

  if (getters.length) {

    // Only initialize these if there are getters to save on memory
    // https://stackoverflow.com/questions/44222017/memory-overhead-of-empty-array-vs-undefined-var
    computeds = {}

    for (const prop in getters.values) {
      if (vue.constructor?.behavior?.[prop] === Behavior.DISABLED) continue // skip if DISABLED

      // Handle getter as Vue computed()
      Object.defineProperty(vue, prop, {
        enumerable: true,
        configurable: true,
        // Convert getter to computed
        get: function () {
          if (prop in computeds) {
            return computeds[prop].value // Computed defined? return the .value of the computed
          } else {
            // Computed not defined? Define and run .get method inside computed while .bind(vue)
            return (computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)())).value
          }
        },
        set: getters.values[prop].set?.bind(vue)
      })
    }
  }

  Object.defineProperty(vue, 'toRefs', {
    enumerable: false,
    value: function (...filters: string[]) {
      const result: Record<string | symbol, any> = {}

      if (filters.length) {
        const filtersLength = filters.length
        for (let i = 0; i < filtersLength; i++) {
          const prop = filters[i]
          if (prop in getters.values){
            if (prop in computeds) {
              result[prop] = computeds[prop]
            } else {
              result[prop] = computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)())
            }
          } else {
            if (typeof vue[prop] === 'function') {
              result[prop] = vue[prop].bind(vue) // Bind method to vue, makes destructuring work
            } else {
              result[prop] = toRef(vue, prop)
            }  
          }
        }
      } else {
        // Convert props
        for (const prop in vue) {
          // Skip a getter, it might be a computed, accessing it will cause a computation
          if (prop in getters.values) continue;

          if (typeof vue[prop] === 'function') {
            result[prop] = vue[prop].bind(vue) // Bind method to vue, makes destructuring work
          } else {
            result[prop] = toRef(vue, prop)
          }
        }

        // Convert getters
        for (const prop in getters.values) {
          if (prop in computeds) {
            result[prop] = computeds[prop]
          } else {
            result[prop] = computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)())
          }
        }
      }

      // Return a Proxy to correctly proxy the method calls to the vue object.
      return new Proxy(vue, {
        get: (target, key): any => {
          if (key in result) {
            return result[key] // return ref
          } else if (key in target) { // check for methods in vue itself
            return target[key].bind(vue) // Bind method to vue, makes destructuring work
          }
        }
      })
    }
  })

  return vue
}
