import type { Class } from '@/types/core'
import { getCurrentInstance, type ComponentInternalInstance, nextTick } from 'vue';
import { mountable, Mountable } from '@/Classes/Traits/Mountable';
import { Routable } from '@/Classes/Traits/Routable';
import { Behavior } from '@/behavior';
import { Traits, extend } from '@/utils';

export function vueable (self: Vueable, mainClass: Class) {

  mountable(self, mainClass)

  self.$instance = getCurrentInstance()

  mainClass.behavior = extend(mainClass.behavior ?? {}, { $refs: Behavior.DISABLED })
}

export class Vueable {

  $instance!: ComponentInternalInstance | null
  
  $emit: Function = (...args:any) => {}
  
  constructor (mainClass: Class) {
    vueable(this, mainClass)
  }
  
  get $refs () {
    return this.$instance?.refs;
  }
  
  $nextTick = nextTick
}

export interface Vueable extends Routable, Mountable {}
Traits(Vueable, [Routable, Mountable])
