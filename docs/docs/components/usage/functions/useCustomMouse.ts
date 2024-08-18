import { computed, ref } from 'vue';
import { useMouse } from '@vueuse/core';

export function useCustomMouse() {
  const { x, y } = useMouse();
  const _sum = ref(0);

  function sum() {
    _sum.value = x.value + y.value;
  }

  const total2 = computed(() => {
    return _sum; // Returning with .value
  });

  const total = computed(() => {
    return total2; // Returning with .value
  });

  return {
    x,
    y,
    sum,
    total,
  };
}
