import { useMouse } from '@vueuse/core';
import { iuse,  type UseComposable } from 'ivue';

type UseMouse = UseComposable<typeof useMouse>

export class CustomMouse {
  
  x: UseMouse['x'];
  y: UseMouse['y'];

  constructor(public test: number) {
    ({ x: this.x, y: this.y } = iuse(useMouse()))
  }
  
  get total() {
    return this.x + this.y;
  }
}