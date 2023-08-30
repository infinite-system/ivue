import { watch, onMounted, onUnmounted } from "vue";
import { IVUE } from "@/index";
import { use, init } from "@/index";
import { App } from "@/App/App";
import { TRouter } from "./TRouter";
import { TApp } from "./TApp";

export class Mouse {

  x = 0
  y = 0

  init () {
    const update = (e) => this.update(e)
    onMounted(() => window.addEventListener('mousemove', update))
    onUnmounted(() => window.removeEventListener('mousemove', update))
    return this
  }

  update (event) {
    this.x = event.pageX
    this.y = event.pageY
  }
}

export class TField {

  get app () { return  use(TApp) }

  get router () { return  use(TRouter) }

  _prop = 0
  // static behavior: any = {
  //   init: IVUE.SCOPED_INTERCEPT,
  //   runWithIntercept: IVUE.INTERCEPT
  // }

  // constructor (private _prop: number, private buildMouse = true) {}


  get prop () {
    return this._prop
  }

  set prop (v) {
    this._prop = v
  }

  get email () {
    return this.app.user.email
  }

  x: number = 0

  y: number = 0

  update: (event) => {}


  init() {
    watch(() => this.x, n => {
      console.log('n', n)
    })
  }

  interceptableValue = 'testing'
  runWithInterceptResult = ''

  runWithIntercept (variable = '') {
    return this.interceptableValue
  }

  interceptable () {
    console.log('interceptable')
  }

  increase () {
    this._prop++
  }

  private privateFunc () {
    alert('hey')
  }
}