// @filename: node_modules/@types/ivue/index.d.ts
// @include: ivue
// @include: useMouse
// ---cut---
import { defineProps, defineEmits, onMounted, watch } from 'vue';
import { type Use, ivue, iref, iuse } from 'ivue';
import { useMouse } from './useMouse';

// Properly declared unwrapped composable. 
type UseMouse = Use<typeof useMouse>;

interface CounterProps {
  initialCount: number;
}

interface CounterEmits {
  (e: 'increment', count: number): void;
}

const props = defineProps<CounterProps>();
const emit = defineEmits<CounterEmits>();

/**
 * Example of a properly defined ivue class.
 */
class Counter {
  // Properly declared unwrapped composable. 
  mouse: UseMouse;

  // Properly declared DOM Ref. 
  spanElementRef = iref<HTMLElement | null>(null);

  constructor(public props: CounterProps, public emit: CounterEmits) {
    // Properly declared auto-unwrapped composable.
    this.mouse = iuse(useMouse);
  }

  /**
   * Properly declared ivue init() function 
   * used to initialize Vue lifecycle hooks.
   */
  init() {
    // Properly set lifecycle hook.
    onMounted(() => {
      this.count = 4;
    });

    // Properly set watch function.
    watch(
      () => this.count,
      (newCount: number) => {
        if (newCount === 5) {
          alert('You reached the count of ' + newCount + '!');
        }
      }
    );
  }

  count = iref(0); // Properly declared Ref with auto inferred type -> number 

  timesClicked = iref(0); // Properly declared Ref with auto inferred type -> number 

  // Properly declared function (not arrow function).
  increment() {
    this.count++;
  }

  // Properly declared function (not arrow function).
  click() {
    this.increment();
    this.timesClicked++;
  }

  // Properly declared computed getter.
  get doubleCount() {
    return this.count * 2;
  }
}

// Properly initialized ivue class.
const counter = ivue(Counter, props, emit);

counter.count;
//     ^|