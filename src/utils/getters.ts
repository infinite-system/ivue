import type { Getters } from '../types/core'

/**
 * Store all getters for each class prototype processed by getPrototypeGetters.
 * @see getPrototypeGetters
 */
export const gettersMap = new Map()

/**
 * Get getters of a class prototype as a map.
 *
 * @param proto
 * @return Getters
 */
export function getPrototypeGetters (proto: object | null) {

  if (gettersMap.has(proto)) return gettersMap.get(proto)

  const initialProto = proto

  const props: any[] = []

  while (proto && proto.constructor.name !== 'Object') {
    props.push.apply(props, Object.entries(
      Object.getOwnPropertyDescriptors(proto)
    ))
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  const getters: Getters = new Map()

  for (let i = 0; i < props.length; i++) {
    if (props[i][0] !== '__proto__' && typeof props[i][1].get === 'function') {
      getters.set(props[i][0], props[i][1])
    }
  }
  /**
   * Save getters in the getters map.
   */
  gettersMap.set(initialProto, getters)

  return getters
}

/**
 * Get getters of a class instance and the total number of them.
 * @param instance Object instance
 * @returns Getter descriptors
 */
export function getInstanceGetters (instance: { [x: string]: any; }) {

  const getters: Getters = new Map()
  const props = Object.entries(Object.getOwnPropertyDescriptors(instance))

  for (let i = 0; i < props.length; i++) {
    if (typeof props[i][1].get === 'function' && props[i][0] !== '__proto__') {
      getters.set(props[i][0], props[i][1])
    }
  }

  return getters
}
