import { markRaw, effectScope } from 'vue'
import { tryOnScopeDispose } from "@vueuse/core";
/**
 * Get setters and getters of a class instance.
 * Also gets all magic methods (getters and setters) stored in 'all' param.
 *
 * @param instance
 * @return { get: [...], set: [...], all: [...] }
 */
const magicPropsMap = new Map()

export function getMagicProperties (instance) {

  let proto = Object.getPrototypeOf(instance)

  if (magicPropsMap.has(proto)) {
    // console.log('from map!!', proto)
    return magicPropsMap.get(proto)
  }

  const originalProto = proto

  const props = []
  while (proto && proto.constructor.name !== 'Object') {
    const protoProps = Object.entries(
      Object.getOwnPropertyDescriptors(proto)
    )
    // eslint-disable-next-line prefer-spread
    props.push.apply(props, protoProps)
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  const magicProps = { get: {}, set: {} }

  for (let i = 0; i < props.length; i++) {
    if (props[i][0] !== '__proto__') {
      if (typeof props[i][1].get === 'function') {
        // getters
        magicProps.get[props[i][0]] = true
      }
      if (typeof props[i][1].set === 'function') {
        // setters
        magicProps.set[props[i][0]] = true
      }
    }
  }

  magicPropsMap.set(originalProto, magicProps)

  return magicProps
}

/**
 * Get all object properties including all ancestor prototype properties.
 *
 * @param obj
 */
export function getAllProperties (obj) {

  let proto = Object.getPrototypeOf(obj)
  const props = Object.getOwnPropertyNames(obj)

  // this determines all the ancestor prototype props as well
  while (proto && proto.constructor.name !== 'Object') {
    const protoProps = Object.getOwnPropertyNames(proto)
      // caller, callee, arguments are not accessible so should be skipped
      .filter(el => !['caller', 'callee', 'arguments'].includes(el))
    props.push.apply(props, protoProps)
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  return Array.from(new Set(props))
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

export function runBeforeAction (vue, fn, prop, args) {
  if (beforeMap.has(fn)) {
    const fns = beforeMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      fns[i](vue, ...args)
    }
  }
}

export function runAfterAction (vue, fn, prop, args, fnReturn) {
  if (afterMap.has(fn)) {
    const fns = afterMap.get(fn)
    for (let i = 0; i < fns.length; i++) {
      fns[i](vue, fnReturn, ...args)
    }
  }
}

export function overrideFunctionHandler (type_, vue, obj, prop) {
  let fnReturn = void (0)
  const fnInterceptable = (...args) => {
    runBeforeAction(vue, obj[prop], prop, args)
    fnReturn = obj[prop].bind(vue)(...args)
    runAfterAction(vue, obj[prop], prop, args, fnReturn)
  }
  switch (type_) {
    case Override.INTERCEPT:
      return function (...args) {
        fnInterceptable(...args)
        return fnReturn
      }
    case Override.SCOPED_INTERCEPT:
      return function (...args) {
        const scope = effectScope()
        scope.run(() => {
          fnInterceptable(...args)
        })
        tryOnScopeDispose(() => scope.stop())
        return fnReturn
      }
    case Override.SCOPED:
      return function (...args) {
        const scope = effectScope()
        scope.run(() => {
          fnReturn = obj[prop].bind(vue)(...args)
        })
        tryOnScopeDispose(() => scope.stop())
        return fnReturn
      }
  }
}