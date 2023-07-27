import { inject, injectable } from 'inversify'
import { AuthenticationRepository } from './AuthenticationRepository'
import { MessagesRepository } from '../Core/Messages/MessagesRepository'
import { Router } from '../Routing/Router'
import { AppPresenter } from "@/tests/Helpers/AppPresenter";
import { lazyInject } from '@/tests/Helpers/Container'
import { ParentXVueTestClass } from "@/tests/Helpers/Authentication/ParentXVueTestClass";
import { watch } from "vue";
import { generateHugeArray } from "@/tests/Helpers/Generators/generators";
import { container } from "@/tests/Helpers/Container.ts"
import { Field } from "@/tests/Helpers/Field";
import { xVueNew, xVue, Override, unraw, beforeAction } from "@/";
import { Types } from "@/tests/Helpers/Core/Types";

@injectable()
export class XVueTestClass extends ParentXVueTestClass {

  overrides = {
    init: Override.SCOPED_INTERCEPT,
    nonReactiveProp: Override.DISABLED
  }

  @inject(AuthenticationRepository) authRepo: AuthenticationRepository
  @inject(Types.IAppPresenter) app: AppPresenter
  @inject(MessagesRepository) messagesRepository: MessagesRepository
  @inject(Router) router: Router

  private _x = 1

  get x () {
    return this._x
  }

  set x (v) {
    this._x = v
  }

  primitive = 1

  array = [1, 2, 3]

  object = {
    prop: {
      prop: {
        prop: 1
      }
    }
  }

  constructor() {
    super()
    this.primitive = 10
  }

  transientField1: Field
  transientField2: Field
  transientFields: Field[] = []

  init() {
    watch(() => this.primitive, newValue => {
      if (newValue === 10) {
        console.log('watch matched value: 10 =', newValue)
      }
    })

    // container.bind(Field).toSelf().onActivation(xVue)

    beforeAction(Field.prototype.init, vue => {
      console.log('before init of prototype of Field')
    })

    // const f =new Field(10)
    // this.transientField1 = xVueMake(new Field(10))
    this.transientField1 = xVueNew(Field, 10)
    this.transientField2 = xVueNew(Field, 10)
    for (let i = 0; i < 300000; i++) {
      // this.transientFields.push(xVueMake(new Field(i)))
      this.transientFields.push(xVueNew(Field, i))
    }

    console.log('this.transientField1', this.transientField1)

    beforeAction(this.transientField1.init, vue => {
      console.log('before init of Field', vue)
    })

    this.transientField1.init()

    // const f2 = new Field(25)
    // console.log('this.transientField1', this.transientField1)
    // this.transientField2 = xVueMake(new Field(20))
  }

  get propTransient () {
    return this.transientField1.prop
  }

  get computedVariable() {
    console.log('computedVariable')
    return this.authRepo.originalVariable.map(el => ({
      test: el.test + ' computed 1', test2: el.test2 + ' computed 1'
    }))
  }

  get computedUponComputedVariable() {
    console.log('computedUponComputedVariable')
    return this.computedVariable.map(el => ({
      test: el.test + ' computed 2', test2: el.test2 + ' computed 2'
    }))
  }

  set computedVariable(value) {
    this.authRepo.originalVariable = value
  }

  get getComputedButMakeReactiveAgain() {
    unraw(this.computedVariable[0])
    return this.computedVariable[0]
  }

  get computedPrimitive() {
    // console.log('compute3', this.primitive)
    return this.primitive
  }

  /**
   * Circular computed store connectivity test.
   */
  get deepEmail() {
    return String(this.app.router.userModel.app.router.userModel.email).split('').join('+')
  }

  pushToOriginalVariableInAuthRepo() {
    this.authRepo.originalVariable.push({
      test: 'push-1',
      test2: 'push-2'
    })
  }

  loading = false
  result: unknown = ''

  async asyncFunction() {
    return new Promise((resolve) => {
      this.loading = true
      setTimeout(() => {
        resolve('hey! how do you do?')
        this.loading = false
      }, 2000)
    })
  }

  async runAsyncFunction() {
    this.result = ''
    this.result = await this.asyncFunction()
  }

  /**
   * Implement abstract parent function.
   */
  reset() {
  }

  numberOfRecords = 5000000
  hugeArray = []
  loadingHugeData = false
  timeTaken = 0

  loadHugeData(numberOfRecords) {
    this.timeTaken = 0
    this.loadingHugeData = true
    const start = Date.now();

    setTimeout(() => {
      generateHugeArray(this, numberOfRecords)
      this.loadingHugeData = false
      this.timeTaken = Date.now() - start;
    })
  }

  msToTime(ms) {
    const seconds = (ms / 1000).toFixed(1);
    const minutes = (ms / (1000 * 60)).toFixed(1);
    const hours = (ms / (1000 * 60 * 60)).toFixed(1);
    const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

    if (seconds < 60) return seconds + " Seconds";
    else if (minutes < 60) return minutes + " Minutes";
    else if (hours < 24) return hours + " Hrs";
    else return days + " Days"
  }
}

