import { watch } from "vue";
import { Behavior } from "@/";
import { Store } from "@/tests/Helpers/Core/Store";
import type { AppPresenter } from "@/tests/Helpers/AppPresenter";
import { container } from '@/tests/Helpers/AppIOC'
import type { RouterGateway } from "@/tests/Helpers/Routing/RouterGateway";

export class Field {

  app: AppPresenter
  router$: RouterGateway

  behavior = {
    init: Behavior.SCOPED_INTERCEPT,
    runWithIntercept: Behavior.INTERCEPT
  }

  constructor (private _prop: number) {
    console.log('constructing field', this._prop)
    this.app = container.get(Store.AppPresenter);
    this.router$ = container.get(Store.RouterGateway);
  }
  get prop () {
    return this._prop
  }
  set prop (v) {
    this._prop = v
  }
  get email() {
    return this.app.router.userModel.email
  }
  init () {
    console.log('init')
    watch(() => this.prop, newVal => {
      console.log('newVal', newVal)
    })
    return this
  }
  interceptableValue = 'testing'
  runWithInterceptResult = ''
  runWithIntercept(variable = '') {
    return this.interceptableValue
  }
}