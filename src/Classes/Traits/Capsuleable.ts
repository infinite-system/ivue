import {init } from '@/kernel';
import { after } from '@/index';

export class Capsuleable {

  $!: InstanceType<this['capsule']>
  
  capsule: any

  encapsulate (args: IArguments) {
    after(this.constructor, (self: any) => {
      // init capsule only after this.constructor
      this.$ = init(this.capsule, this, ...args)
      this.$.__v_skip = true // markRaw() equivalent
    })
  }
}