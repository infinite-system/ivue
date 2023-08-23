import type { Class } from '../types/core'
import { IVUE } from '../behavior';
import { extend } from '../utils/extend'
import { getCurrentInstance } from 'vue';

export function useInstance (mainClass: Class, self: UseInstance | any) {
  mainClass.behavior = extend(mainClass.behavior ?? {}, { $instance: IVUE.OFF })
}

export class UseInstance {
  get $instance () {
    return getCurrentInstance()
  }
  constructor (mainClass: Class) {
    useInstance(mainClass, this)
  }
}