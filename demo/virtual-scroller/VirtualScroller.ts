import type { Ref } from 'vue';
import {
  toRefs,
  watch,
  nextTick,
  ref,
  computed,
  onBeforeUnmount,
  onMounted,
  onUnmounted
} from 'vue';
import debounce from 'debounce';

import type {
  ItemContext,
  ItemsChangeEmitArgs,
  VirtualScrollerEmits,
  VirtualScrollerProps
} from './VirtualScroller.vue';
import { binaryClosest } from './VirtualScroller.utils';
import { useScrollDirection, type ArrayLike } from './VirtualScroller.utils';
import { useElementSize } from '@vueuse/core';
import type { BaseItem } from './VirtualScroller.types';
import { Lenis } from '../lenis/lenis';

export function useVirtualScroller<T extends BaseItem>(
  props: VirtualScrollerProps<T>,
  emit: VirtualScrollerEmits
) {

  /** Ref Element */
  const scrollElement: Ref<HTMLElement | null> = ref(null);
  const scrollElementInner: Ref<HTMLElement | null> = ref(null);

  /** Constants. */
  /** @private */
  const OFFSET_DEBOUNCE_INTERVAL = 1;

  /** Refs from composables. */
  const scrollPosition = ref<string | number>(0);
  const positions = ref<ArrayLike<number>>({ length: 0 });

  const {
    modelValue: items,
    assumedHeight,
    paddingQuantity,
    autoPlay
  } = toRefs(props);
  const { height: containerHeight, width: containerWidth } =
    useElementSize(scrollElement);
  // const { scrollDirection } = useScrollDirection(scrollPosition);
  const scrollDirection = ref('down');

  const measuredHeights = ref<Record<number, number>>({});

  const scrollHeight = computed(() => {
    const len = items.value.length;

    if (len === 0) return 0;

    /** Account for padding top and bottom of virtual scroller. */
    let paddingTop = 0;
    let paddingBottom = 0;
    if (scrollElement.value) {
      const computedStyle = window.getComputedStyle(scrollElement.value, null);
      paddingTop = parseInt(computedStyle.getPropertyValue('padding-top'));
      paddingBottom = parseInt(
        computedStyle.getPropertyValue('padding-bottom')
      );
    }

    return (
      positions.value[len - 1] +
      (measuredHeights.value[len - 1] ?? assumedHeight.value) +
      paddingTop +
      paddingBottom
    );
  });

  function updatePositionsImmediately(immediate = false) {
    const sums: ArrayLike<number> = {
      length: items.value.length
    };

    sums[0] = 0;
    for (let i = 1; i < sums.length; i++) {
      sums[i] =
        sums[i - 1] + (measuredHeights.value[i - 1] ?? assumedHeight.value);
    }

    /** Remove the measurements of the items that no longer exist. */
    let beyondLastIndex = sums.length;
    if (beyondLastIndex in measuredHeights.value) {
      while (measuredHeights.value?.[beyondLastIndex]) {
        delete measuredHeights.value?.[beyondLastIndex];
        beyondLastIndex++;
      }
    }

    positions.value = sums;
  }

  /** @private */
  const halfPaddingQuantity = computed(() => {
    return Math.ceil(paddingQuantity.value / 2);
  });

  const visibleIndex = ref({
    start: 0,
    end: 0
  });

  const visibleItems = computed(() => {
    // Since `positions` is sorted, we can use a binary search instead of a linear search
    let start = binaryClosest(
      positions.value,
      parseFloat(scrollPosition.value as string)
    );
    let end = start;

    while (
      positions.value[end] <
      positions.value[start] + containerHeight.value
    ) {
      end++;
    }

    start = Math.max(0, start - halfPaddingQuantity.value);
    end += halfPaddingQuantity.value + 1;

    if (visibleIndex.value.start !== start || visibleIndex.value.end !== end) {
      visibleIndex.value.start = start;
      visibleIndex.value.end = end;
      nextTick(() => onItemsChanged({ start, end }));
    }

    return items.value.slice(start, end).map((item, index): ItemContext<T> => {
      const newIndex = index + start;
      return {
        item: item,
        id: item.id,
        index: newIndex,
        position: positions.value[newIndex] ?? 0
      };
    });
  });

  /** @private */
  function onItemsChanged(args: ItemsChangeEmitArgs) {
    emit('itemsChanged', args);
  }

  /** @private */
  function onTotalHeightChanged(delta: number) {
    if (
      !scrollElement.value ||
      scrollDirection.value !== 'up' ||
      scrollPosition.value === 0
    ) {
      return;
    }
    /** This will only happen on scroll upwards. */
    // setScrollPosition(getScrollPosition() - delta, false, true);
  }
  // let isTouchpad = false;
  function getTranslateY(element) {
    const transform = element.style.transform;

    if (transform === 'none' || !transform) {
      return 0;
    }

    // Use the same matrix parsing logic
    const matrixValues = transform.slice(7, -1).split(',');
    return parseFloat(matrixValues[5]) || 0;
  }

  let currentTrasitionDuration;
  function setScrollTransitionDuration(duration: string) {
    if (currentTrasitionDuration !== duration) {
      currentTrasitionDuration = duration;
      scrollElementInner.value.style.transitionDuration = duration;
    }
  }
  // --- DEPENDENCIES (Assumed to be defined in your component's scope) ---
  // const scrollElementInner = ref(null); // A Vue ref to the scrollable element
  // const scrollDirection = ref('down');  // A Vue ref for tracking scroll direction
  // const $q = useQuasar();               // The Quasar Framework instance for platform detection
  // ---

  // --- STATE VARIABLES ---
  function scrollByDeltaY(deltaY: number) {
    setScrollPosition(getScrollPosition() + deltaY);
  }

  const preventScrollEvent = ref(false);

  const scrollAdjustment = ref(0);
  function onScroll(e: Event) {
    // IMPORTANT: Prevent default scroll behavior
    // Prevents scrolling on focus of contenteditable elements
    if (preventScrollEvent.value) {
      e.preventDefault();
      // scrollAdjustment.value = scrollElement.value.scrollTop;
      scrollElement.value.scrollTop = 0;
    }
  }

  function disableScrollEvent() {
    preventScrollEvent.value = true;
  }

  function enableScrollEvent() {
    preventScrollEvent.value = false;
  }

  /** @private */
  let currentScrollPosition = 0;

  function getScrollPosition() {
    return currentScrollPosition;
  }

  let startX = 0;
  let startY = 0;
  function touchstart(e: TouchEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }

  function touchmove(e: TouchEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const deltaX = e.touches[0].clientX - startX,
      deltaY = e.touches[0].clientY - startY;

    scrollByDeltaY((deltaY / 10) * 2);
    // console.log('Delta x,y', startX, startY, deltaX, deltaY);
  }

  function touchend(e: TouchEvent) {
    // const deltaX = e.touches[0].clientX - startX,
    // deltaY = e.touches[0].clientY - startY;
    // scrollByDeltaY(deltaY);
    // console.log('Delta x,y', deltaX, deltaY);
  }

  function setScrollPosition(
    position: number,
    animate = true,
    translateY = true
  ) {
    if (
      position > 0 ||
      scrollHeight.value < (scrollElement.value?.offsetHeight ?? 0)
    )
      position = 0;

    // Prevent scrolling down beyond last paragraph
    if (
      Math.abs(position) +
        (scrollElement.value?.offsetHeight ?? 0) +
        (scrollElement.value?.scrollTop ?? 0) >
        scrollHeight.value &&
      scrollHeight.value > (scrollElement.value?.offsetHeight ?? 0)
    ) {
      position = -(
        // Must be negative
        (
          scrollHeight.value -
          (scrollElement.value?.offsetHeight ?? 0) -
          (scrollElement.value?.scrollTop ?? 0)
        )
      );
    }

    const absolutePosition = Math.abs(
      /**
       * Math.round because in Chrome when position is greater than 100000,
       * translateY does not accept a number with decimals, only integers!
       */
      position
    );

    scrollPosition.value = absolutePosition;
    // const duration = String(animate ? 0.1 : 0) + 's';
    if (scrollElementInner.value) {
      if (!animate) {
        scrollElementInner.value.style.transitionDuration = '0s';
      } else {
        scrollElementInner.value.style.transitionDuration = '0.45s';
      }
    }

    if (position == 0 && scrollElement.value?.scrollTop) {
      scrollElement.value!.scrollTop = 0;
    }

    if (translateY && scrollElementInner.value) {
      scrollElementInner.value!.style.transform =
        'translateY(' + position + 'px)';
    }

    lenis.targetScroll = absolutePosition;
    // lenis.animatedScroll = absolutePosition;
    currentScrollPosition = position;
  }

  function syncItemHeight(
    index: number,
    height: number,
    doUpdatePositions = true
  ) {
    measuredHeights.value[index] = height;
    // console.log('syncItemHeight', index, height);
    if (doUpdatePositions) updatePositions();
  }

  function getIndexPosition(index: number) {
    return positions.value[index];
  }

  function scroll(pixels: number) {
    const currentScrollTop = getScrollPosition();
    const newScrollTop = currentScrollTop + pixels * -1;
    setScrollPosition(newScrollTop);
  }

  function resetScrollTop() {
    scrollElement.value.scrollTop = 0;
  }

  function scrollToIndex(index: number, afterCallback?: () => void) {
    const position = getIndexPosition(index);

    if (position === undefined || !scrollElement.value) return;

    resetScrollTop();

    setScrollPosition(-position);

    function setScroll() {
      nextTick(() => {
        const position = getIndexPosition(index);
        setScrollPosition(-position);
        nextTick(() => {
          afterCallback?.();
        });
      });
    }

    setScroll();

    const watcher = watch(
      () => positions.value[index],
      () => {
        setScroll();
        setTimeout(() => {
          watcher();
        }, 1000);
      }
    );
  }

  // =============== INITIALIZE ================= //

  const updatePositions = debounce(
    updatePositionsImmediately,
    OFFSET_DEBOUNCE_INTERVAL
  );
  updatePositions();
  updatePositions.flush();

  // watch(scrollHeight, (newValue, oldValue) => {
  //   if (newValue !== oldValue) {
  //     onTotalHeightChanged(newValue - oldValue);
  //   }
  // });

  // =============== DRAG AND DROP =============== //

  /** @private */
  let startIndex = 0;

  function onStart(evt: any) {
    startIndex = evt.item.__draggable_context.element.index;
  }

  function onDrop(evt: any) {
    const dropIndex =
      evt.target
        .closest('.virtual-scroller__item')
        .getAttribute('aria-rowindex') - 1;
    emit('drop', startIndex, dropIndex);
  }

  function onMove(evt: any, originalEvent: any) {
    emit('move', evt);
    return true; // — keep default insertion point based on the direction
  }

  const scrollHeightPx = computed(() => {
    return scrollHeight.value + 'px';
  });

  let lenis: Lenis | null = null;
  let frame: number;

  const enableLenis = true; // isIOSWebkit;

  let virtualScrolling = false;
  let virtualScrollTimeout;

  const pixelDistance = 100; // Distance to scroll in pixels
  const seconds = 12.5;
  const duration = seconds * 1000;
  const baseSpeed = (pixelDistance / duration) * 18.5; // Base speed in milliseconds per pixel

  let autoscrollTimeout;

  function onVirtualScroll({ deltaY }) {
    virtualScrolling = true;
    clearTimeout(virtualScrollTimeout);
    scrollElementInner.value.style.transitionDuration = '0s';
    scrollDirection.value = deltaY < 0 ? 'up' : 'down';
    if (!frame) {
      frame = requestAnimationFrame(loop);
    }
    clearTimeout(autoscrollTimeout);
    autoscrollTimeout = setTimeout(play, 3);

    virtualScrollTimeout = setTimeout(() => {
      virtualScrolling = false;
    }, 3);
  }

  const loop = (now: number) => {
    lenis.raf(now); // keep Lenis in sync

    // if (isIOSWebkit) {
    //   const remainder = lenis.targetScroll - Math.floor(lenis.targetScroll);
    //   scrollElementInner.value.style.transform =
    //     Math.abs(remainder) > 0.005 ? `translateY(${-remainder}px)` : '';
    // } else {
    //   if (Math.abs(lenis.lastVelocity) < baseSpeed && !virtualScrolling) {
    //     const remainder = lenis.targetScroll - lenis.actualScroll;
    //     if (Math.abs(remainder) < 1) {
    //       // Apply the transform only if there's a significant remainder
    //       scrollElementInner.value.style.transform = `translateY(${-remainder}px)`;
    //     }
    //   }
    // }
    frame = requestAnimationFrame(loop);
    // scrollPosition.value = lenis.targetScroll;
    setScrollPosition(-lenis.targetScroll, false, false);
  };

  const startAutoPlay = (delay = 500, callback = () => {}) => {
    frame = requestAnimationFrame(loop);
    autoscrollTimeout = setTimeout(() => {
      play();
      callback();
    }, delay);
  };
  if (autoPlay.value) startAutoPlay(props.autoPlayDelay);

  const stopAutoPlay = (callback = () => {}) => {
    cancelAnimationFrame(frame);
    frame = null;
    clearTimeout(autoscrollTimeout);
    callback();
  };

  let autoRepeatTimeout;
  function play() {
    if (virtualScrolling || lenis.isScrolling) {
      clearTimeout(autoscrollTimeout);

      return (autoscrollTimeout = setTimeout(play, 3));
    }

    const actualHeight = 637;
    const baseHeight = 637;
    const baseSpeed = 150;
    const actualSpeed = (actualHeight / baseHeight) * baseSpeed;

    clearTimeout(autoscrollTimeout);

    lenis.targetScroll += 1;

    // console.log(
    //   'lenis.actualScroll + (scrollElement.value?.offsetHeight ?? 0)',
    //   lenis.actualScroll + (scrollElement.value?.offsetHeight ?? 0),
    //   'scrollHeight.value',
    //   scrollHeight.value
    // );
    if (
      props.autoRepeat &&
      lenis.actualScroll + (scrollElement.value?.offsetHeight ?? 0) >=
        scrollHeight.value - 10
    ) {
      clearTimeout(autoRepeatTimeout);
      autoRepeatTimeout = setTimeout(() => {
        setScrollPosition(0, true, true);
        autoscrollTimeout = setTimeout(() => {
          cancelAnimationFrame(frame);
          frame = null;
          if (scrollDirection.value === 'down') {
            play();
          }
        }, props.autoPlayDelay);
      }, 10000);
    } else {
      clearTimeout(autoRepeatTimeout);
      setScrollPosition(-lenis.targetScroll, true, true);

      autoscrollTimeout = setTimeout(() => {
        cancelAnimationFrame(frame);
        frame = null;
        if (scrollDirection.value === 'down') {
          play();
        }
      }, actualSpeed);
    }
  }

  let startTouchY = 0;

  const setupChainedScrolling = () => {
    // const element = scrollerRef.value;
    // if (!element) return;
    let lastWheelEvent = null;
    let rAFid = null;

    // --- DESKTOP SUPPORT (WHEEL) ---
    let timeout;
    const handleWheel = (e) => {
      lastWheelEvent = e;

      // clearTimeout(timeout);
      // timeout = setTimeout(() => {
      // Check if a rAF is already scheduled
      if (!rAFid) {
        rAFid = requestAnimationFrame(processWheelEvent);
      }
    };

    const processWheelEvent = () => {
      if (lastWheelEvent) {
        const currentPosition = lenis.isStopped
          ? scrollPosition.value
          : lenis.actualScroll;
        // const isAtTop = scrollPosition.value === 0;
        const isAtBottom =
          Math.abs(currentPosition) +
            (scrollElement.value?.offsetHeight ?? 0) >=
          (scrollHeight.value ?? 0);
        // consol
        // console.log(
        //   'scrollPosition',
        //   Math.abs(scrollPosition.value),

        //   'scrollHeight',
        //   scrollHeight.value
        //   // Math.abs(scrollPosition.value) +
        //   // (scrollElement.value?.offsetHeight ?? 0) >
        //   // (scrollHeight.value ?? 0)
        // );

        const isAtTop = currentPosition === 0;

        if ((isAtBottom && e.deltaY > 0) || (isAtTop && e.deltaY < 0)) {
          // Prevents Lenis from handling the event
          // console.log('yoo', e);
          e.stopImmediatePropagation();
          e.stopPropagation();
          lenis.stop();
          // setTimeout(() => {

          // }, 300)
        } else {
          // setTimeout(() => {

          lenis.start();
        }
      }
      // Reset for the next frame
      rAFid = null;
      lastWheelEvent = null;
    };

    scrollElementInner.value.addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false
    });

    // --- MOBILE SUPPORT (TOUCH) ---
    const handleTouchStart = (e) => {
      startTouchY = e.touches[0].clientY;
    };

    // const handleTouchMove = (e) => {
    //   const currentTouchY = e.touches[0].clientY;
    //   const deltaY = startTouchY - currentTouchY;

    //   const isAtTop = element.scrollTop === 0;
    //   const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight;

    //   // Stop propagation only if the scroll gesture would go past the boundary
    //   if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
    //     // Prevents Lenis from handling the event
    //     e.stopImmediatePropagation();
    //   }
    // };

    // element.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    // element.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });

    onUnmounted(() => {
      scrollElementInner.value.removeEventListener('wheel', handleWheel, {
        capture: true
      });
      // element.removeEventListener('touchstart', handleTouchStart, { capture: true });
      // element.removeEventListener('touchmove', handleTouchMove, { capture: true });
    });
  };

  onMounted(() => {
    if (!scrollElement.value || !scrollElementInner.value) return;

    lenis = new Lenis({
      wrapper: scrollElement.value,
      content: scrollElementInner.value,
      syncTouch: true, // Sync touch events
      smoothWheel: true,
      autoRaf: false, // we drive it ourselves
      syncTouchLerp: 0.1,
      touchInertiaMultiplier: 30,
      touchMultiplier: 1.3 // Adjust this value to control the sensitivity of touch scrolling
      // easing: (x) =>Math.sin((x * Math.PI) / 2)
    });
    // setupChainedScrolling();
    lenis.on('virtual-scroll', onVirtualScroll);
    // Set up custom event handling for chained scrolling
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    lenis?.stop();
    lenis?.destroy();
  });

  return {
    /* Ref */
    scrollElement,
    scrollElementInner,
    /* Data */
    items,
    positions,
    visibleItems,
    visibleIndex,
    /* Scroll Data */
    scrollDirection,
    scrollPosition,
    scrollHeight,
    scrollHeightPx,
    /* Container Data */
    containerHeight,
    containerWidth,
    measuredHeights,
    /* Methods */
    resetScrollTop,
    getScrollPosition,
    setScrollPosition,
    setScrollTransitionDuration,
    getIndexPosition,
    scrollAdjustment,
    scrollToIndex,
    scroll,
    scrollByDeltaY,
    updatePositions,
    updatePositionsImmediately,
    /** Autoscroll */
    startAutoPlay,
    stopAutoPlay,
    play,
    /* Callbacks */
    onScroll,
    enableScrollEvent,
    disableScrollEvent,
    syncItemHeight,
    touchstart,
    touchmove,
    touchend,
    /* Drag and Drop */
    onStart,
    onDrop,
    onMove
  };
}

export type VirtualScrollerReturn<T extends BaseItem> = ReturnType<
  typeof useVirtualScroller<T>
>;
