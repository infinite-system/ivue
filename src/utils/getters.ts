import type { Getters } from '../types/core'

/**
 * Store all getters for each class prototype processed by getPrototypeGetters.
 * @see getPrototypeGetters
 */
export const getters = new Map()

/**
 * Get getters of a class instance and the total number of them.
 *
 * @param proto
 * @return Getters
 */
export function getPrototypeGetters (proto: object | null) {

  if (getters.has(proto)) return getters.get(proto)

  const initialProto = proto

  const props: any[] = []
  
  while (proto && proto.constructor.name !== 'Object') {
    props.push.apply(props, Object.entries(
      Object.getOwnPropertyDescriptors(proto)
    ))
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  const _getters: Getters = { values: {}, length: 0 }

  for (let i = 0; i < props.length; i++) {
    if (props[i][0] !== '__proto__' && typeof props[i][1].get === 'function') {
      _getters.values[props[i][0]] = props[i][1]
      _getters.length++
    }
  }

  // Save getters in the getters map
  getters.set(initialProto, _getters)

  return _getters
}

export function getInstanceGetters (instance: { [x: string]: any; }) {

  const getters: Getters = { values: {}, length: 0 }
  const props = Object.entries(Object.getOwnPropertyDescriptors(instance))

  for (let i = 0; i < props.length; i++) {
    if (typeof props[i][1].get === 'function' && props[i][0] !== '__proto__') {
      getters.values[props[i][0]] = props[i][1]
      getters.length++
    }
  }
  return getters
}
