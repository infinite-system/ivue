import { ivue, init, use } from '@/index';
import type { AnyClass } from '@/types/core';

export class UseCapsule {

  $!: InstanceType<this['capsule']>

  capsule: AnyClass | any

  useCapsule (args: IArguments | [] = [], method = init) {
    this.$ = method(this.capsule, this, ...args)
    if (method === init || method === use || method === ivue) {
      this.$.__v_skip = true // markRaw() equivalent
    }
  }
}