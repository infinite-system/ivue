import { ref } from 'vue';

export default class Counter {
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
  decrement() {
    this.count--;
  }
}
