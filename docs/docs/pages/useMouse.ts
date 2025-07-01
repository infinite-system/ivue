import { ref, onMounted, onUnmounted } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);
  const sourceType = ref<'mouse' | 'touch'>('mouse');

  function updateMouse(event: MouseEvent) {
    sourceType.value = 'mouse';
    x.value = event.clientX;
    y.value = event.clientY;
  }

  function updateTouch(event: TouchEvent) {
    sourceType.value = 'touch';
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      x.value = touch.clientX;
      y.value = touch.clientY;
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', updateMouse);
    window.addEventListener('touchstart', updateTouch);
    window.addEventListener('touchmove', updateTouch);
  });

  onUnmounted(() => {
    window.removeEventListener('mousemove', updateMouse);
    window.removeEventListener('touchstart', updateTouch);
    window.removeEventListener('touchmove', updateTouch);
  });

  return {
    x,
    y,
    sourceType,
  };
}
