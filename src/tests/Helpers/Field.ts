import { watch } from "vue";
import { Override } from "@/";

export class Field {
  overrides = {
    init: Override.SCOPED_INTERCEPT
  }
  constructor (private _prop) {
    console.log('constructing field', this._prop)
  }
  get prop () {
    return this._prop
  }
  set prop (v) {
    this._prop = v
  }
  init () {
    console.log('init')
    watch(() => this.prop, newVal => {
      console.log('newVal', newVal)
    })
    return this
  }
}