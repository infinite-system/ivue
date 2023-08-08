import { watch, onMounted, onUnmounted } from "vue";
import { Behavior } from "@/index";
import { $, instance, init } from "@/tests/Helpers/IOC/IOC";
import type { AppPresenter } from "@/tests/Helpers/AppPresenter";
import type { RouterGateway } from "@/tests/Helpers/Routing/RouterGateway";

export class UseMouse {

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

export class Field {

  app: AppPresenter
  _router_: RouterGateway

  static behavior: Object = {
    init: Behavior.SCOPED_INTERCEPT,
    runWithIntercept: Behavior.INTERCEPT
  }

  constructor (private _prop: number) {
    // console.log('constructing field', this._prop)
    this.app = instance($.AppPresenter);
    this._router_ = instance($.RouterGateway);
  }

  get prop () {
    return this._prop
  }

  set prop (v) {
    this._prop = v
  }

  get email () {
    return this.app.router.userModel.email
  }

  x: number

  y: number

  update: (event) => {}

  mouse: UseMouse

  init () {
    // console.log('init')
    watch(() => this.prop, newVal => {
      console.log('newVal', newVal)
    })

    // eslint-disable-next-line no-unexpected-multiline
    const mouse = init(UseMouse).toRefs();

    ({
      x: this.x,
      y: this.y,
    } = mouse)

    const { update, x } = mouse
    // console.log('/**/iRefs(UseMouse)', iRefs(UseMouse).update({x:0,y:0}))

    setTimeout(() => {
      update({ pageX: 1000, pageY: 1000 })
    }, 1000)

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
    this.mouse.x++
  }
  private privateFunc () {
    alert('hey')
  }
}