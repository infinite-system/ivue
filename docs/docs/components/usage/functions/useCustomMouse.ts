import { computed, ref } from 'vue';
import { useMouse } from '@vueuse/core';

export function useCustomMouse() {
  const { x, y } = useMouse();

  const _sum = ref(0);

  function sum() {
    _sum.value = x.value + y.value;
  }

  const _total = computed(() => {
    // Returning without .value, not entirely correctly, but will still work in Vue template.
    // This is to test the impressive IVue unwrapping capabilities of deeply nested and confusing Refs
    return _sum;
  });

  const total = computed(() => {
    // Returning without .value, not entirely correctly, but will still work in Vue template.
    // This is to test the impressive IVue unwrapping capabilities of deeply nested and confusing Refs
    return _total;
  });

  return {
    x,
    y,
    sum,
    total,
  };
}
