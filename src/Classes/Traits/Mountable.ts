import { type Class } from '@/utils';
import { after } from '@/index'
import { onMounted, onUnmounted, onBeforeMount, onBeforeUnmount } from 'vue'

export function mountable (self: Mountable, baseClass: Class) {
  after(baseClass, (self: any) => {
    if ('beforeMount' in self) onBeforeMount(() => self.beforeMount())
    if ('mounted' in self) onMounted(() => self.mounted())
    if ('beforeUnmount' in self) onBeforeUnmount(() => self.beforeUnmount())
    if ('unmounted' in self) onUnmounted(() => self.unmounted())
  })
}

/** Make a class mountable to a Vue component */
export class Mountable {
  constructor(baseClass: Class) {
    mountable(this, baseClass)
  }
  onBeforeMount?: ReturnType<typeof onBeforeMount> = function() {}
  mounted?: ReturnType<typeof onMounted> = function() {}
  onBeforeUnmount?: ReturnType<typeof onBeforeUnmount> = function() {}
  onUnmounted?: ReturnType<typeof onUnmounted> = function() {}
}