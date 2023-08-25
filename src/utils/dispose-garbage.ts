import { toRaw } from "vue"
import type { AnyClass, Getters, IVue } from ".."

export const disposeGarbage = <T extends AnyClass> (vue: IVue<T>, getters: Getters | null, name: string) => {
  let instance = toRaw(vue)
  for (const i in instance) {
    if (i in getters!.values) continue
    try {
      instance[i] = null // prepare for garbage collection
    } catch (e) {
      console.warn(`${name} garbage collector had a problem wiping 
          out a property vue[${i}], this is likely an ivue internals bug.`, e)
    }
  }
}