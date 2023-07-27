import { Override, overrideFunctionHandler, getGetters } from "./utils";
import { computed, effectScope, markRaw, reactive } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";
import { Field } from "@/tests/Helpers/Field";

/**
 * Make a new transient xVue instance of <T> Class without inversify container.
 *
 * @param className
 * @param args
 */
export function xVueNew<T> (className: T, ...args) {
  return xVue(null, className, ...args) as T
}

/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param ctx
 * @param obj
 * @param args
 */
export function xVue (ctx, obj, ...args) {

  const getters = getGetters(obj)

  const vue = reactive(ctx === null ? Reflect.construct(obj, args) : Object.create(obj))

  let hasOverrides = 'overrides' in vue && typeof vue.overrides === 'object'
  let overrides = hasOverrides ? vue.overrides : undefined

  const hasInit = 'init' in vue && typeof vue.init === 'function'
  if (hasInit) {
    if (!overrides) overrides = {} // only initialize empty object if there is 'init'
    if (!('init' in overrides)) overrides.init = Override.SCOPED // Default to SCOPED for 'init' function
    hasOverrides = true // if init() function is defined, we have a default override for it
  }

  if (hasOverrides) {
    for (const prop in overrides) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof vue[prop] === 'function') {
        if (overrides[prop] === Override.DISABLED) continue // skip, because disabling a function has no effect
        const func = vue[prop]
        vue[prop] = overrideFunctionHandler(overrides[prop], func, vue, prop)
      } else {
        if (overrides[prop] === Override.DISABLED && typeof vue[prop] === 'object') {
          vue[prop] = markRaw(vue[prop])
        }
      }
    }
  }

  if (getters.length) {
    // Only initialize these if there are getters to save on memory
    // https://stackoverflow.com/questions/44222017/memory-overhead-of-empty-array-vs-undefined-var
    const computed_ = {}
    const computedScope = {}

    for (const prop in getters.values) {
      if (overrides?.[prop] === Override.DISABLED) continue // skip if DISABLED
      // Get getter and setter descriptors
      const descriptors = Object.getOwnPropertyDescriptor(vue.constructor.prototype, prop)
      // Computed storage
      computed_[prop] = null
      // Handle getters as Vue 3 computed()
      Object.defineProperty(vue, prop, {
        // Redefine the existing getter function
        // by making it wrapped up inside Vue 3 computed function
        get: function () {
          if (computed_[prop]) {
            // If computed is already defined
            // just return the reactive .value of the computed
            return computed_[prop].value
          }
          // If computed is not defined create an effect scope
          // to make the computed disposable to prevent memory leaks
          computedScope[prop] = effectScope()
          computedScope[prop].run(() => {
            // This is the meat of the matter
            computed_[prop] = computed(() => {
              // Run the getter of the Class inside the computed
              // as the reactive(vue) object via .bind(vue).
              return descriptors.get.bind(vue)()
            })
          })
          // Register a dispose function for the computed,
          // when component that created it is being destroyed,
          // the computed will be stopped as well to prevent memory leaks.
          tryOnScopeDispose(() => computedScope[prop].stop())

          return computed_[prop].value
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