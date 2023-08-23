import type { Class } from '../types/core';
import { IVUE } from '../behavior';
import { extend } from '../utils/extend'
import { getCurrentInstance } from 'vue';

export function useRefs (mainClass: Class, obj: any) {
  mainClass.behavior = extend(mainClass.behavior ?? {}, { $refs: IVUE.OFF })
}

export class UseRefs {
  get $refs () {
    return getCurrentInstance()?.refs;
  }
  constructor (mainClass: Class) {
    useRefs(mainClass, this)
  }
}
