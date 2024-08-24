import { useMouse } from '@vueuse/core';
import { iref, iuse, type Use } from 'ivue';

type UseMouse = Use<typeof useMouse>;

export class CustomMouse {
  x: UseMouse['x'];
  y: UseMouse['y'];

  _sum = iref(0);

  constructor(public requiredProp: number) {
    ({ x: this.x, y: this.y } = iuse(useMouse));
  }

  sum() {
    this._sum = this.x + this.y + this.requiredProp;
  }

  get total() {
    return this._sum;
  }
}
