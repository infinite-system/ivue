import { Traits, type Class } from '@/utils';
import { vueable, Vueable } from '@/Classes/Traits/Vueable';
import { QuasarRoutable } from './QuasarRoutable';

const $q = {
  dialog: () => {},
  notify: () => {}
}

export function quasarable (self: Quasarable, baseClass: Class) {
  vueable(self, baseClass)
}

export class Quasarable {
  public $q = $q
  constructor (baseClass: Class) {
    quasarable(this, baseClass)
  }
}

export interface Quasarable extends QuasarRoutable, Vueable {}
Traits(Quasarable, [QuasarRoutable, Vueable])
