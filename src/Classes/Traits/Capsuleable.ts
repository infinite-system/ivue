import { init, use } from '@/kernel';
import type { AnyClass } from '@/types/core';

export class Capsuleable {

  $!: InstanceType<this['capsule']>
  
  capsule: AnyClass | any

  encapsulate (args: IArguments | [] = [], method = init) {
    this.$ = method(this.capsule, this, ...args)
    if (method === init || method === use) {
      this.$.__v_skip = true // markRaw() equivalent
    }
  }
}