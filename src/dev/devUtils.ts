/**
 * Functions in this file were created during development
 * process, but are not actually used in the final files.
 *
 * They are good resources to derive other functions
 * or use in other projects.
 */

const magicPropsMap = new Map()
/**
 * Get all magic properties (getters & setters) of an object instance.
 *
 * @param instance
 */
export function getMagicProperties (instance) {

  let proto = Object.getPrototypeOf(instance)

  if (magicPropsMap.has(proto)) {
    // console.log('from map!!', proto)
    return magicPropsMap.get(proto)
  }

  const originalPrototype = proto

  let props: string[] | undefined = []
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

  props = undefined
  magicPropsMap.set(originalPrototype, magicProps)

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
    // eslint-disable-next-line prefer-spread
    props.push.apply(props, protoProps)
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  return Array.from(new Set(props))
}