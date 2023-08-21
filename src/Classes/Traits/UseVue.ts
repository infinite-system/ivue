import type { Class } from '@/types/core'
import { Traits } from '@/index';
import { useMounting, UseMounting } from '@/Classes/Traits/UseMounting';
import { UseRouting } from '@/Classes/Traits/UseRouting';
import { useRefs, UseRefs } from './UseRefs';
import { UseEmit } from './UseEmit';
import { UseTick } from './UseTick';
import { UseInstance, useInstance } from './UseInstance';

export function useVue (mainClass: Class, obj: UseVue | any) {
  useInstance(mainClass, obj)
  useRefs(mainClass, obj)
  useMounting(mainClass, obj)
}

export class UseVue {
  constructor (mainClass: Class) {
    useVue(mainClass, this)
  }
}

Traits(UseVue, [
  UseRouting, 
  UseMounting, 
  UseEmit, 
  UseTick, 
  UseRefs,
  UseInstance
])

export interface UseVue
  extends
  UseRouting,
  UseMounting,
  UseEmit,
  UseTick,
  UseRefs,
  UseInstance {}
