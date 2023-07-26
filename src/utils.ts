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

export function unraw(obj) {
  delete obj.__v_skip
}

export function raw(obj) {
  return markRaw(obj)
}

export enum Override {
  SCOPED = 'SCOPED',
  SCOPED_INTERCEPT = 'SCOPED_INTERCEPT',
  INTERCEPT = 'INTERCEPT',
  DISABLED = 'DISABLED'
}

const beforeMap = new Map()
const afterMap = new Map()

export function beforeAction (fn, callback) {
  if (beforeMap.has(fn)) {
    beforeMap.get(fn).push(callback)
  } else {
    beforeMap.set(fn, [callback])
  }
}

export function afterAction (fn, callback) {
  if (beforeMap.has(fn)) {
    beforeMap.get(fn).push(callback)
  } else {
    beforeMap.set(fn, [callback])
  }
}

export function runBeforeAction (vue, obj, prop, args) {
  const runFn = (fn) => {
    const fns = beforeMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      fns[i](vue, ...args)
    }
  }
  if (beforeMap.has(obj[prop])) runFn(obj[prop])
  if (beforeMap.has(vue[prop])) runFn(vue[prop])
}

export function runAfterAction (vue, obj, prop, args, fnReturn) {
  const runFn = (fn) => {
    const fns = afterMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      fns[i](vue, fnReturn, ...args)
    }
  }
  if (afterMap.has(obj[prop])) runFn(obj[prop])
  if (afterMap.has(vue[prop])) runFn(vue[prop])
}

export function overrideFunctionHandler (type_, vue, obj, prop) {
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
        fnReturn = obj[prop].bind(vue)(...args)
      })
      tryOnScopeDispose(() => scope.stop())
      return fnReturn
    }
  }

  // Handle interceptable functions
  // Define the common handler
  const fnInterceptable = (...args) => {
    runBeforeAction(vue, obj, prop, args)
    fnReturn = obj[prop].bind(vue)(...args)
    runAfterAction(vue, obj, prop, args, fnReturn)
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