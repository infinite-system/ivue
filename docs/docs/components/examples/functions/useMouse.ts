import { computed, ref } from 'vue';
import { useMouse as _useMouse } from '@vueuse/core';

export function useMouse() {
  const { x, y } = _useMouse();
  const _sum = ref(0);

  function sum() {
    _sum.value = x.value + y.value;
  }

  const total = computed(() => {
    return _sum;
  });

  return {
    x,
    y,
    sum,
    total,
  };
}
