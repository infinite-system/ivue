/**
 * Get setters and getters of a class instance.
 * Also gets all magic methods (getters and setters) stored in 'all' param.
 *
 * @param instance
 * @return { get: [...], set: [...], all: [...] }
 */
export function getMagicProperties (instance) {

  let parent = Object.getPrototypeOf(instance)

  const props = []
  while (parent && parent.constructor.name !== 'Object') {
    const parentProps = Object.entries(
      Object.getOwnPropertyDescriptors(parent)
    )
    props.push.apply(props, parentProps)
    parent = Object.getPrototypeOf(parent.constructor.prototype)
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

  return magicProps
}

/**
 * Get all object properties including all ancestor prototype properties.
 *
 * @param obj
 */
export function getAllProperties (obj) {

  let parent = Object.getPrototypeOf(obj)
  const props = Object.getOwnPropertyNames(obj)

  // this determines all the ancestor prototype props as well
  while (parent && parent.constructor.name !== 'Object') {
    const parentProps = Object.getOwnPropertyNames(parent)
      // caller, callee, arguments are not accessible so should be skipped
      .filter(el => !['caller', 'callee', 'arguments'].includes(el))
    props.push.apply(props, parentProps)
    parent = Object.getPrototypeOf(parent.constructor.prototype)
  }

  return Array.from(new Set(props))
}

export function unraw(obj) {
  delete obj.__v_skip
}