import { watch, onMounted, onUnmounted } from "vue";
import { IVUE } from "@/index";
import { use, init } from "@/index";
import { App } from "@/App/App";
import { TRouter } from "./TRouter";

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

  app = use(App)

  router = use(TRouter)

  static behavior: any = {
    init: IVUE.SCOPED_INTERCEPT,
    runWithIntercept: IVUE.INTERCEPT
  }

  constructor (private _prop: number, private buildMouse = true) {}

  get prop () {
    return this._prop
  }

  set prop (v) {
    this._prop = v
  }

  get email () {
    return this.app.router.$.user.email
  }

  x: number

  y: number

  update: (event) => {}

  mouse: Mouse

  init () {

    // if (this.buildMouse) {
    //
    //   // console.log('init')
    //   watch(() => this.prop, newVal => {
    //     console.log('newVal', newVal)
    //   })
    //
    //   // eslint-disable-next-line no-unexpected-multiline
    //   const mouse = init(Mouse).toRefs();
    //
    //   ({
    //     x: this.x,
    //     y: this.y,
    //   } = mouse)
    //
    // }
    // const { update, x } = mouse
    // // console.log('/**/iRefs(UseMouse)', iRefs(UseMouse).update({x:0,y:0}))
    //
    // setTimeout(() => {
    //   update({ pageX: 1000, pageY: 1000 })
    // }, 1000)

    return this
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