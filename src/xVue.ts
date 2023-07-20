import { getAllProperties, getMagicProperties } from "./utils";
import { computed, effectScope, markRaw, reactive } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";

function beforeAction(prop, fn, args) {
  console.log('beforeAction:', prop + '()', /*fn,*/ args)
}

function afterAction(prop, fn, args, fnReturn) {
  console.log('afterAction:', prop + '()', /*fn,*/ args, fnReturn)
}

/**
 * Pure VueJS observable reactive architecture system.
 *
 * @param ctx
 * @param obj
 */
export function xVue(ctx, obj) {

  const props = getAllProperties(obj)
  const magicProps = getMagicProperties(obj)

  const hasOverrides = 'overrides' in obj
  const overrides = 'overrides' in obj ? obj.overrides : {}

  const vue = reactive(Object.create(obj))

  for (let i = 0; i < props.length; i++) {

    const prop = props[i]
    if (prop === 'constructor') continue // skip constructors
    if (prop in magicProps.get) continue // skip getters

    vue[prop] = typeof obj[prop] === 'function'
      ? function (...args) {
        beforeAction(prop, obj[prop], args)
        const fnReturn = obj[prop].bind(vue)(...args)
        afterAction(prop, obj[prop], args, fnReturn)
        return fnReturn
      }
      : (overrides?.[prop] === false ? markRaw(obj[prop]) : obj[prop])
  }

  if (hasOverrides) {
    obj.overrides = markRaw(obj.overrides)
  }

  const computeds = {}
  const scope = {}

  for (const prop in magicProps.get) {
    if (overrides?.[prop] === false) continue

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
      set: descriptors.set?.bind(vue) || undefined,
      enumerable: descriptors.enumerable || true,
      configurable: descriptors.configurable || true
    })
  }

  if ('setup' in vue && typeof vue.setup === 'function') {
    const setupScope = effectScope()
    setupScope.run(() => vue.setup())
    tryOnScopeDispose(() => setupScope.stop())
  }

  return vue
}
