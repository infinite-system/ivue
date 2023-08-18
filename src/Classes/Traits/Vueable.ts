import { getCurrentInstance, type ComponentInternalInstance, nextTick } from 'vue';
import { mountable, Mountable } from '@/Classes/Traits/Mountable';
import { Routable } from '@/Classes/Traits/Routable';
import { Behavior } from '@/behavior';
import { Traits, type Class, extend } from '@/utils';

export function vueable (self: Vueable, baseClass: Class) {

  mountable(self, baseClass)

  self.$instance = getCurrentInstance()

  baseClass.behavior = extend(baseClass.behavior ?? {}, { $refs: Behavior.DISABLED })
}

export class Vueable {

  $instance!: ComponentInternalInstance | null
  
  $emit!: Function
  
  constructor (baseClass: Class) {
    vueable(this, baseClass)
  }
  
  get $refs () {
    return this.$instance?.refs;
  }
  
  $nextTick = nextTick
}

export interface Vueable extends Routable, Mountable {}
Traits(Vueable, [Routable, Mountable])
