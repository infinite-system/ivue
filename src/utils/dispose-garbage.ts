import { toRaw } from "vue"
import type { AnyClass, Getters, IVue } from ".."
const propertiesMap = new WeakMap()
/**
 * Advanced garbage disposal for complete memory control.
 * Disposes an internal object that is under the vue reactive proxy.
 * To expose the raw property, toRaw(vue) method is used 
 * to retrieve the original object.
 * 
 * @param vue ivue instance
 * @param getters @see Getters
 * @param name string
 */
export const disposeGarbage = <T extends AnyClass> (vue: IVue<T> | any) => {
  // Deep garbage collection, gives really amazing performance in Opera as well as Google Chrome.
  // Opera seems to perform better though with cleaning up the garbage more effeciently and more.

  let instance = toRaw(vue)
  let props: any = Object.getOwnPropertyNames(instance)

  for (let i = 0; i < props.length; i++) {
    delete instance[props[i]]
  }

  // Faster but less thorough garbage collection:
  // Will remove only enumerable properties.
  // for (prop in vue) {
  //   delete vue[prop]
  // }

  // Unset roots for gc engine to collect and dispose
  instance = null
  props = null
}