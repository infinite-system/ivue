import { get, make, use, init } from '../kernel';
import type { AnyClass } from '../types/core';
import { markRaw } from 'vue';

export class UseCapsule {

  $!: InstanceType<this['capsule']>

  capsule: AnyClass | any

  useCapsule (args: any = []) {
    this.$ = use(this.capsule, this, ...args)
    markRaw(this.$)
  }

  initCapsule (args: any = []) {
    this.$ = init(this.capsule, this, ...args)
    markRaw(this.$)
  }

  getCapsule (args: any = []) {
    this.$ = get(this.capsule, this, ...args)
  }

  makeCapsule (args: any = []) {
    this.$ = make(this.capsule, this, ...args)
  }
}