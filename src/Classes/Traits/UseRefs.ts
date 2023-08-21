import type { Class } from '@/types/core';
import { Behavior, extend } from '@/index';
import { getCurrentInstance } from 'vue';

export function useRefs (mainClass: Class, obj: any) {
  mainClass.behavior = extend(mainClass.behavior ?? {}, { $refs: Behavior.DISABLED })
}

export class UseRefs {
  get $refs () {
    return getCurrentInstance()?.refs;
  }
  constructor (mainClass: Class) {
    useRefs(mainClass, this)
  }
}
