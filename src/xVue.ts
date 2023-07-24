import { Override, overrideFunctionHandler, getMagicProperties } from "./utils";
import { computed, effectScope, markRaw, reactive } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";

/**
 * Make a transient xVue instance without inversify container.
 *
 * @param obj
 */
export function xVueMake<T> (obj:T) {
  return xVue(null, obj) as T
}

/**
 * Pure VueJS observable reactive architecture system.
 *
 * @param ctx
 * @param obj
 */
export function xVue (ctx, obj) {

  const magicProps = getMagicProperties(obj)

  let hasOverrides = 'overrides' in obj && typeof obj.overrides === 'object'
  const overrides = hasOverrides ? obj.overrides : {}

  const hasInit = 'init' in obj && typeof obj.init === 'function'
  if (hasInit) {
    if (!('init' in overrides)) overrides.init = Override.SCOPED // Default to SCOPED for 'init' function
    hasOverrides = true // if init() function is defined, we have a default override for it
  }

  const vue = reactive(Object.create(obj))

  if (hasOverrides) {
    for (const prop in overrides) {
      if (prop in magicProps.get) continue // skip getters to not cause a computation
      if (typeof obj[prop] === 'function') {
        if (overrides[prop] === Override.DISABLED) continue // skip, because disabling a function has no effect
        vue[prop] = overrideFunctionHandler(overrides[prop], vue, obj, prop)
      } else {
        if (overrides[prop] === Override.DISABLED && typeof obj[prop] === 'object') {
          vue[prop] = markRaw(obj[prop])
        }
      }
    }
  }

  const computeds = {}
  const scope = {}

  for (const prop in magicProps.get) {

    if (overrides?.[prop] === Override.DISABLED) continue // skip if DISABLED

    // Get getter and setter descriptors
    const descriptors = Object.getOwnPropertyDescriptor(obj.constructor.prototype, prop)

    // Computed storage
    computeds[prop] = null

    // Handle getters as Vue 3 computed()
    Object.defineProperty(vue, prop, {
      // Redefine the existing getter function
      // by making it wrapped up inside Vue 3 computed function
      get: function () {
        if (computeds[prop]) {
          // If computed is already defined
          // just return the reactive .value of the computed
          return computeds[prop].value
        } else {
          // If computed is not defined create an effect scope
          // to make the computed disposable to prevent memory leaks
          scope[prop] = effectScope()
          scope[prop].run(() => {
            // This is the meat of the matter
            computeds[prop] = computed(() => {
              // Run the getter of the Class inside the computed
              // as the reactive(vue) object via .bind(vue).
              return descriptors.get.bind(vue)()
            })
          })
          // Register a dispose function for the computed,
          // when component that created it is being destroyed,
          // the computed will be stopped as well to prevent memory leaks.
          tryOnScopeDispose(() => {
            scope[prop].stop()
          })
          return computeds[prop]
        }
      },
      set: descriptors?.set?.bind(vue) || undefined,
      enumerable: descriptors?.enumerable || true,
      configurable: descriptors?.configurable || true
    })
  }

  if (hasInit && ctx !== null && ctx.currentRequest.bindings[0].scope === 'Singleton') {
    // Initialize Singleton Immediately
    vue.init()
  }

  return vue
}
