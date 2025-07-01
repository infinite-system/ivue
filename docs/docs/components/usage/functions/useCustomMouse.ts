import { computed, ref, type Ref } from 'vue';
import { useMouse } from '@vueuse/core';

type UseMouse = { x: Ref<number>; y: Ref<number> };

export function useCustomMouse(requiredProp: number) {
  const { x, y }: UseMouse = useMouse();

  const _sum = ref(0);

  function sum() {
    _sum.value = x.value + y.value + requiredProp;
  }

  const total = computed(() => {
    return _sum.value;
  });

  return {
    x,
    y,
    _sum,
    sum,
    total,
  };
}
