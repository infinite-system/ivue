import { Behavior, overrideFunctionHandler, getGetters } from "./utils";
import { computed, effectScope, markRaw, reactive } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";

/**
 * Make a new transient iVue instance of <T> Class without inversify container.
 * For typescript: https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype
 *
 * @param className
 * @param args
 */
export function iVue<T> (className: T, ...args: T extends { new (...args: infer P): any } ? P : never[]) {
  return iVueBuilder(null, className, ...args) as T
}

/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param  ctx Inversify Container context
 * @param  obj Object or Class name,
 *              - If instantiated via Inversify Container it is an object
 *              - If instantiated via iVue(className, ...args) it is a class name
 * @param args Arguments are available when used via iVue(obj, ...args)
 */
export function iVueBuilder (ctx, obj, ...args) {

  const getters = getGetters(obj)

  const vue = reactive(ctx === null
    ? Reflect.construct(obj, args) // if we are instantiating objects directly with iVue(obj, ...args)
    : Object.create(obj) // if we are instantiating via an IOC container
  )

  let hasBehavior = 'behavior' in vue && typeof vue.behavior === 'object'
  let behavior = hasBehavior ? vue.behavior : undefined

  const hasInit = 'init' in vue && typeof vue.init === 'function'
  if (hasInit) {
    if (!behavior) behavior = {} // only initialize empty object if there is 'init'
    if (!('init' in behavior)) behavior.init = Behavior.SCOPED // Default to SCOPED for 'init' function
    hasBehavior = true // if init() function is defined, we have a default override for it
  }

  if (hasBehavior) {
    for (const prop in behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof vue[prop] === 'function') {
        if (behavior[prop] === Behavior.DISABLED) continue // skip, because disabling a function has no effect
        const func = vue[prop]
        vue[prop] = overrideFunctionHandler(behavior[prop], func, vue, prop)
      } else {
        if (behavior[prop] === Behavior.DISABLED && typeof vue[prop] === 'object') {
          vue[prop] = markRaw(vue[prop])
        }
      }
    }
  }

  if (getters.length) {
    // Only initialize these if there are getters to save on memory
    // https://stackoverflow.com/questions/44222017/memory-overhead-of-empty-array-vs-undefined-var
    const computedMap = {}
    const computedScope = {}

    for (const prop in getters.values) {
      if (behavior?.[prop] === Behavior.DISABLED) continue // skip if DISABLED
      // Get getter and setter descriptors
      const descriptors = Object.getOwnPropertyDescriptor(vue.constructor.prototype, prop)
      // Computed storage
      computedMap[prop] = null
      // Handle getters as Vue 3 computed()
      Object.defineProperty(vue, prop, {
        // Redefine the existing getter function
        // by making it wrapped up inside Vue 3 computed function
        get: function () {
          if (computedMap[prop]) {
            // If computed is already defined
            // just return the reactive .value of the computed
            return computedMap[prop].value
          }
          // If computed is not defined create an effect scope
          // to make the computed disposable to prevent memory leaks
          computedScope[prop] = effectScope()
          computedScope[prop].run(() => {
            // This is the meat of the matter
            computedMap[prop] = computed(() => {
              // Run the getter of the Class inside the computed
              // as the reactive(vue) object via .bind(vue).
              return descriptors.get.bind(vue)()
            })
          })
          // Register a dispose function for the computed,
          // when component that created it is being destroyed,
          // the computed will be stopped as well to prevent memory leaks.
          tryOnScopeDispose(() => computedScope[prop].stop())

          return computedMap[prop].value
        },
        set: descriptors?.set?.bind(vue) || undefined,
        enumerable: descriptors?.enumerable || true,
        configurable: descriptors?.configurable || true
      })
    }
  }


  if (hasInit && ctx !== null && ctx.currentRequest.bindings[0].scope === 'Singleton') {
    // Initialize Singleton Immediately
    vue.init()
  }

  return vue
}