import type { Class } from '@/types/core'
import { Behavior, extend } from '@/index';
import { getCurrentInstance } from 'vue';

export function useInstance(self: any, mainClass: Class) {
  mainClass.behavior = extend(mainClass.behavior ?? {}, { $instance: Behavior.DISABLED })
}

export class UseInstance {
  get $instance () {
    return getCurrentInstance()
  }
  constructor(mainClass: Class) {
    useInstance(this, mainClass)
  }
}