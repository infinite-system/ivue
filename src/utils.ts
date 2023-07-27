import { markRaw, effectScope } from 'vue'
import { tryOnScopeDispose } from "@vueuse/core";

const gettersMap = new Map()
/**
 * Get getters of a class instance and the total number of them.
 *
 * @param instance
 * @return { values: { [getter]: true }, length: number }
 */
export function getGetters (instance) {

  let proto = Object.getPrototypeOf(instance)

  if (gettersMap.has(proto)) {
    return gettersMap.get(proto)
  }
  const originalPrototype = proto

  let props: object[] | undefined = []
  while (proto && proto.constructor.name !== 'Object') {
    const protoProps = Object.entries(
      Object.getOwnPropertyDescriptors(proto)
    )
    // eslint-disable-next-line prefer-spread
    props.push.apply(props, protoProps)
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  const getters = { values: {}, length: 0 }

  for (let i = 0; i < props.length; i++) {
    if (props[i][0] !== '__proto__') {
      if (typeof props[i][1].get === 'function') {
        getters.values[props[i][0]] = true
        getters.length++
      }
    }
  }

  props = undefined
  gettersMap.set(originalPrototype, getters)

  return getters
}

/**
 * Convert object back to Vue reactive.
 *
 * @param obj
 */
export function unraw (obj) {
  delete obj.__v_skip
}

/**
 * Alias for Vues' markRaw()
 * @param obj
 */
export function raw (obj) {
  return markRaw(obj)
}

/**
 * Overrides list.
 * SCOPED: allows watch(), computed(), watchEffect() to be auto garbage collected.
 * SCOPED_INTERCEPT: allows scoping AND before/after function intercepts
 * INTERCEPT: allows before/after function intercepts only,
 *            watch(), computed(), watchEffect() will NOT be garbage collected
 * DISABLED: for objects -> makes them markRaw() non-reactive,
 *           for getters -> makes them non-computed normal getters.
 */
export enum Override {
  SCOPED = 'SCOPED',
  SCOPED_INTERCEPT = 'SCOPED_INTERCEPT',
  INTERCEPT = 'INTERCEPT',
  DISABLED = 'DISABLED'
}

const beforeMap = new Map()
const afterMap = new Map()

/**
 * Function to run before action in xVue.
 *
 * @param fn
 * @param callback
 */
export function beforeAction (fn, callback) {
  if (beforeMap.has(fn)) {
    beforeMap.get(fn).push(callback)
  } else {
    beforeMap.set(fn, [callback])
  }
}

/**
 * Function to run after action in xVue.
 *
 * @param fn
 * @param callback
 */
export function afterAction (fn, callback) {
  if (beforeMap.has(fn)) {
    beforeMap.get(fn).push(callback)
  } else {
    beforeMap.set(fn, [callback])
  }
}

/**
 * Execute functions before action.
 *
 * @param vue
 * @param prop
 * @param args
 */
export function runBeforeAction (vue, prop, args) {
  // console.log('run fn', vue, obj, prop, vue[prop], obj[prop])
  // console.trace()
  const runFn = (fn) => {
    const fns = beforeMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      // console.log('fns[i]', fns[i])
      fns[i](vue, ...args)
    }
  }
  if (beforeMap.has(vue.constructor.prototype[prop])) runFn(vue.constructor.prototype[prop])
  if (beforeMap.has(vue[prop])) runFn(vue[prop])
}

/**
 * Execute functions after action.
 *
 * @param vue
 * @param obj
 * @param prop
 * @param args
 */
export function runAfterAction (vue, prop, args, fnReturn) {
  const runFn = (fn) => {
    const fns = afterMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      fns[i](vue, fnReturn, ...args)
    }
  }
  if (afterMap.has(vue.constructor.prototype[prop])) runFn(vue.constructor.prototype[prop])
  if (afterMap.has(vue[prop])) runFn(vue[prop])
}

/**
 * Override function depending on type.
 * SCOPED: allows watch(), computed(), watchEffect() to be auto garbage collected.
 * SCOPED_INTERCEPT: allows scoping AND before/after function intercepts
 * INTERCEPT: allows before/after function intercepts only,
 *            watch(), computed(), watchEffect() will NOT be garbage collected
 * @param type_
 * @param func
 * @param vue
 * @param prop
 */
export function overrideFunctionHandler (type_, func, vue, prop) {
  // Define a default void return
  let fnReturn = void (0)
  // Handle basic scoped most often scenario early
  // Usually the init() function
  if (type_ === Override.SCOPED) {
    // Inside scoped you can put watch(), computed(), watchEffect()
    // and it will be auto garbage collected on scope destruction
    return function (...args) {
      const scope = effectScope()
      scope.run(() => {
        fnReturn = func.bind(vue)(...args)
      })
      tryOnScopeDispose(() => scope.stop())
      return fnReturn
    }
  }

  // Handle interceptable functions
  // Define the common handler
  const fnInterceptable = (...args) => {
    runBeforeAction(vue, prop, args)
    fnReturn = func.bind(vue)(...args)
    runAfterAction(vue, prop, args, fnReturn)
  }

  switch (type_) {
    case Override.INTERCEPT:
      // Basic, fast, non-scoped intercepts
      return function (...args) {
        fnInterceptable(...args)
        return fnReturn
      }
    case Override.SCOPED_INTERCEPT:
      // Inside scoped you can put watch(), computed(), watchEffect()
      // and it will be auto garbage collected on scope destruction
      return function (...args) {
        const scope = effectScope()
        scope.run(() => {
          fnInterceptable(...args)
        })
        tryOnScopeDispose(() => scope.stop())
        return fnReturn
      }
  }
}