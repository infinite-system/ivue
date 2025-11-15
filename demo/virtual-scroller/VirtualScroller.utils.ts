/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ref, Ref, watch } from 'vue';

/**
 * Determine scroll direction.
 */
export function useScrollDirection(scrollPosition: Ref<string | number>) {
  const scrollDirection = ref<'up' | 'down'>('up');

  watch(scrollPosition, (newValue, oldValue) => {
    if (typeof newValue === 'string') return;
    if (
      parseFloat(newValue as unknown as string) > parseFloat(oldValue as string)
    ) {
      scrollDirection.value = 'down';
    } else if (
      parseFloat(newValue as unknown as string) < parseFloat(oldValue as string)
    ) {
      // alert(`Scroll Up newValue: ${newValue}, oldValue: ${oldValue}`);
      scrollDirection.value = 'up';
    }
  });

  return {
    scrollDirection,
  };
}

/**
 * Super fast binary search for closest element index,
 * based on number provided.
 * @see https://gist.github.com/robertleeplummerjr/1cc657191d34ecd0a324
 */
export function binaryClosest(
  arr: Record<number | 'length', number>,
  num: number
) {
  let high = arr.length - 1,
    low = 0,
    mid = 0,
    item = null,
    target = -1;

  if (arr[high] < num) return high;

  while (low <= high) {
    mid = (low + high) >> 1;
    item = arr[mid]!;

    switch (true) {
      case item > num:
        high = mid - 1;
        break;
      case item < num:
        target = mid;
        low = mid + 1;
        break;
      case item === num:
        return mid;
      default:
        return low;
    }
  }

  return target;
}

export type ArrayLike<T> = {
  length: number;
  [index: number]: T;
};
