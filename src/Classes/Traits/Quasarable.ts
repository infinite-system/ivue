import { Traits } from '@/utils';
import type { Class } from '@/types/core'
import { vueable, Vueable } from '@/Classes/Traits/Vueable';
import { QuasarRoutable } from './QuasarRoutable';

const $q = {
  dialog: () => {},
  notify: () => {}
}

export function quasarable (self: Quasarable, mainClass: Class) {
  vueable(self, mainClass)
}

export class Quasarable {
  public $q = $q
  constructor (mainClass: Class) {
    quasarable(this, mainClass)
  }
}
Traits(Quasarable, [QuasarRoutable, Vueable])
export interface Quasarable extends QuasarRoutable, Vueable {}
