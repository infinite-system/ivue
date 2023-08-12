import { Behavior, behaviorMethodHandler, getGetters } from "./utils";
import { computed, markRaw, reactive, toRef } from "vue";

export type IVue<T extends abstract new (...args: any) => any> = InstanceType<T> & IVueToRefs<T>

export interface IVueToRefs<T extends abstract new (...args: any) => any> {
  toRefs: () => InstanceType<T>
}

/**
 * Make a new transient iVue instance of <T> Class without inversify container.
 * For typescript: https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype
 *
 * @param className
 * @param args
 */
export function iVue<T extends abstract new (...args: any) => any> (
  className: T,
  ...args: T extends { new (...args: infer P): any } ? P : never[]
): IVue<T> {
  return iVueBuilder(
    getGetters(className.prototype),
    reactive(Reflect.construct(className, args)),
    ...args
  )
}

/**
 * Activation method to use with Inversify IOC library.
 *
 * @param ctx
 * @param obj
 * @param args
 */
export function iVueInversify (ctx, obj, ...args) {
  return iVueBuilder(
    getGetters(Reflect.getPrototypeOf(obj)),
    reactive(Object.create(obj)),
    ...args
  )
}

/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param getters
 * @param vue
 * @param args Arguments are available when used via iVue(obj, ...args)
 */
export function iVueBuilder (getters, vue, ...args) {

  const hasBehavior = 'behavior' in vue.constructor && typeof vue.constructor.behavior === 'object'
  const behavior = hasBehavior ? vue.constructor.behavior : undefined
  const hasInit = 'init' in vue && typeof vue.init === 'function'

  if (hasBehavior) {
    for (const prop in behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof vue[prop] === 'function') {
        if (behavior[prop] === Behavior.DISABLED) continue // skip DISABLED
        const func = vue[prop] // This re-assignment is important to copy the function
        behaviorMethodHandler(behavior[prop], func, vue, prop)
      } else {
        if (behavior[prop] === Behavior.DISABLED && typeof vue[prop] === 'object') {
          vue[prop] = markRaw(vue[prop])
        }
      }
    }
  }

  let computeds
  let descriptors
  
  if (getters.length) {

    // Only initialize these if there are getters to save on memory
    // https://stackoverflow.com/questions/44222017/memory-overhead-of-empty-array-vs-undefined-var
    computeds = {}
    descriptors = {}

    for (const prop in getters.values) {
      if (behavior?.[prop] === Behavior.DISABLED) continue // skip if DISABLED

      descriptors[prop] = Object.getOwnPropertyDescriptor(vue.constructor.prototype, prop)

      computeds[prop] = null
      // Handle getter as Vue computed()
      Object.defineProperty(vue, prop, {
        enumerable: descriptors[prop]?.enumerable || true,
        configurable: descriptors[prop]?.configurable || true,
        // Convert getter to computed
        get: function () {
          return computeds[prop]
            // Computed defined? return the .value of the computed
            ? computeds[prop].value
            // Computed not defined? Define and run .get method inside computed while .bind(vue)
            : (computeds[prop] = computed(() => descriptors[prop].get.bind(vue)())).value
        },
        set: descriptors[prop]?.set?.bind(vue) || undefined
      })
    }
  }

  Object.defineProperty(vue, 'toRefs', {
    enumerable: false,
    value: function () {
      const result = {}

      // Convert props
      for (const prop in vue) {
        // Skip a getter, it might be a computed, accessing it will cause a computation
        if (prop in getters.values) continue;

        result[prop] = typeof vue[prop] === 'function'
          ? vue[prop].bind(vue) // Bind method to vue, makes destructuring work
          : toRef(vue, prop)
      }

      // Convert getters
      for(const prop in getters.values) {
        result[prop] = prop in computeds && computeds[prop] !== null
          ? computeds[prop]
          : computeds[prop] = computed(() => descriptors[prop].get.bind(vue)())
      }

      // Return a Proxy to correctly proxy the method calls to the vue object.
      return new Proxy(vue, {
        get: (target, key): any => key in result
          ? result[key] // return ref
          : key in target // check for methods in vue itself
            ? target[key].bind(vue) // Bind method to vue, makes destructuring work
            : void 0
      })
    }
  })

  // .init() exists? Run it, reactive references can already be used inside .init()
  if (hasInit) vue.init()

  return vue
}
