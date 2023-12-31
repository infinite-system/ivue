import { type Class } from '../types/core';
import { after } from '../behavior'
import { onMounted, onUnmounted, onBeforeMount, onBeforeUnmount } from 'vue'

export function useMounting (mainClass: Class, obj: UseMounting | any) {
  after(mainClass, ({ self }) => {
    if ('beforeMount' in self) onBeforeMount(() => self.beforeMount())
    if ('mounted' in self) onMounted(() => self.mounted())
    if ('beforeUnmount' in self) onBeforeUnmount(() => self.beforeUnmount())
    if ('unmounted' in self) onUnmounted(() => self.unmounted())
  })
}

/** Make a class useMounting to a Vue component */
export class UseMounting {
  constructor (mainClass: Class) {
    useMounting(mainClass, this)
  }
  beforeMount?: ReturnType<typeof onBeforeMount> = function () {}
  mounted?: ReturnType<typeof onMounted> = function () {}
  beforeUnmount?: ReturnType<typeof onBeforeUnmount> = function () {}
  unmounted?: ReturnType<typeof onUnmounted> = function () {}
}