import { type Class } from '@/types/core';
import { after } from '@/index'
import { onMounted, onUnmounted, onBeforeMount, onBeforeUnmount } from 'vue'

export function mountable (self: Mountable, mainClass: Class) {
  after(mainClass, (intercept, self: any) => {
    if ('beforeMount' in self) onBeforeMount(() => self.beforeMount())
    if ('mounted' in self) onMounted(() => self.mounted())
    if ('beforeUnmount' in self) onBeforeUnmount(() => self.beforeUnmount())
    if ('unmounted' in self) onUnmounted(() => self.unmounted())
  })
}

/** Make a class mountable to a Vue component */
export class Mountable {
  constructor(mainClass: Class) {
    mountable(this, mainClass)
  }
  beforeMount?: ReturnType<typeof onBeforeMount> = function() {}
  mounted?: ReturnType<typeof onMounted> = function() {}
  beforeUnmount?: ReturnType<typeof onBeforeUnmount> = function() {}
  unmounted?: ReturnType<typeof onUnmounted> = function() {}
}