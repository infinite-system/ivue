import { iref } from 'ivue';

export default class Counter {
  count = iref(0);
  increment() {
    this.count++;
  }
  decrement() {
    this.count--;
  }
}
