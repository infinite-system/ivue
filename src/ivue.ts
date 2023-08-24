import { computed, reactive, toRef, type ComputedRef, effectScope, type EffectScope } from 'vue';
import type { IVue, IVueToRefsObj, AnyClass, InferredArgs, Getters } from "./types/core";
import { IVUE } from "./behavior";
import { getPrototypeGetters, getInstanceGetters } from './utils/getters'
import { tryOnScopeDispose } from '@vueuse/core';
/**
 * Create ivue instance from class constructor.
 * 
 * @param className 
 * @param args 
 * @returns @see IVue<T>
 */
export function ivue<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {
  let scope:  EffectScope | null = effectScope()
  
  let vue = ivueTransform(reactive(Reflect.construct(className, args)), getPrototypeGetters(className.prototype), scope, ...args)
  
  if (typeof vue.init === 'function') scope.run(async () => await vue.init())

  tryOnScopeDispose(() => {
    scope?.stop()
    scope = vue = null
  })

  return vue
}

/**
 * Create ivue instance from an object.
 * 
 * @param obj 
 * @returns 
 */
export function iobj<T extends object> (obj: T): T & IVueToRefsObj<T> {
  let scope: EffectScope | null = effectScope()
  
  let vue = ivueTransform(reactive(obj), getInstanceGetters(obj), scope)
  
  if (typeof vue.init === 'function') scope.run(async () => await vue.init())
  
  tryOnScopeDispose(() => {
    scope?.stop()
    scope = vue = null
  })

  return vue
}

/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param vue
 * @param getters
 * @param args Arguments are available when used via ivue(obj, ...args)
 */
export function ivueTransform (vue: any, getters: Getters, scope: EffectScope, ...args: undefined[]) {

  let computeds: Record<string, ComputedRef>

  // let scope: any;
  if (getters.length) {
    // console.log('scope in ivue')
    // Only initialize these if there are getters to save on memory
    // https://stackoverflow.com/questions/44222017/memory-overhead-of-empty-array-vs-undefined-var
    computeds = {}

    for (const prop in getters.values) {
      if (vue.constructor?.behavior?.[prop] === IVUE.OFF) {
        Object.defineProperty(vue, prop, getters.values[prop]) // reset back to initial
        continue // skip if OFF
      }

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
            scope.run(() => computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)()))
            return computeds[prop].value
          }
        },
        set: getters.values[prop].set?.bind(vue)
      })
    }
  }


  Object.defineProperty(vue, 'toRefs', {
    enumerable: false,
    configurable: true,

    /**
     * Convert from reacive to refs, will convert the all the properties
     * or just the ones specified in the filter.
     * 
     * @params ...props: string[] (optional) object property names in string form which will be converted to refs.
     */
    value: function (...props: string[]) {
      const result: Record<string | symbol, any> = {}

      if (props.length) {
        const propsLength = props.length
        for (let i = 0; i < propsLength; i++) {
          const prop = props[i]
          if (prop in getters.values) {
            if (prop in computeds) {
              result[prop] = computeds[prop]
            } else {
              scope.run(() => result[prop] = computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)()))
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
            scope.run(() => result[prop] = computeds[prop] = computed(() => getters.values[prop].get!.bind(vue)()))
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
