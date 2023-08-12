
import { AuthRepository } from './AuthRepository'
import { AppPresenter } from "@/Classes/AppPresenter";
import { MessagesRepository } from '../Core/Messages/MessagesRepository'
import { Router } from '../Routing/Router'
import { ParentXVueTestClass } from "@/Classes/Authentication/ParentXVueTestClass";
import { watch } from "vue";
import { generateHugeArray } from "@/Classes/Generators/generators";
import { Field } from "@/Classes/Field";
import { iVue, Behavior, unraw, before } from "@/index";
import { use, init } from '@/index'

export class XVueTestClass extends ParentXVueTestClass {

  static behavior = {
    init: Behavior.SCOPED_INTERCEPT,
    nonReactiveProp: Behavior.DISABLED
  }

  get authRepo () { return use(AuthRepository) }

  get app () { return use(AppPresenter) }

  get messagesRepository () { return use(MessagesRepository) }

  get router () { return use(Router) }

  private _x = 1

  get x () {
    return this._x
  }

  set x (v) {
    this._x = v
  }

  array = [1, 2, 3]

  object = {
    prop: {
      prop: {
        prop: 1
      }
    }
  }

  constructor (private primitive = 100) {
    super()
  }

  transientField1: Field

  transientField2: Field

  transientField3: Field

  transientFields: Field[] = []

  init () {

    watch(() => this.primitive, newValue => {
      if (newValue === 10) {
        console.log('watch matched value: 10 =', newValue)
      }
    })

    // before(Field.prototype.init, (intercept, self) => {
    //   console.log('before init of prototype of Field', 'this', self)
    //   // return false
    // })

    Field.behavior = {
      // ...Field.behavior,
      // interceptable: Behavior.INTERCEPT
    }

    this.transientField3 = iVue(Field, 11)
    console.log('this.transientField3', this.transientField3)

    this.transientField1 = iVue(Field, 23)
    this.transientField2 = iVue(Field, 5)

    this.timeTaken = 0

    const start = Date.now();

    setTimeout(() => {


      for (let i = 0; i < 100000; i++) {
        // this.transientFields.push(iVueMake(new Field(i)))
        this.transientFields.push(init(Field, i, false))
      }


      this.timeTaken = Date.now() - start;
    })
    console.log('this.transientField1', this.transientField1)
    console.log('this.transientField2', this.transientField2)

    before(this.transientField1.init, (intercept, self) => {
      console.log('before init of Field', self)
    })

    // before(Field.prototype.interceptable, (intercept, self) => {
    //   console.log('before interceptable of Field', self)
    // })

    this.transientField1.interceptable()

    this.transientField1.init()
    this.transientField2.init()



    //
    // before(Field.prototype.runWithIntercept, (intercept, self, ...[var1]) => {
    //
    //   intercept.return = 'Prototype intercept'
    //
    //   self.prop++
    //   console.log('var1', var1)
    //   return false
    // })

    // before(this.transientField2.runWithIntercept, (intercept, self: Field) => {
    //   intercept.return = 'Awesome'
    //   return false
    // })
    //
    // after(this.transientField2.runWithIntercept, (intercept, self: Field) => {
    //
    //   intercept.return = intercept.return + 'Awesome!!'
    //   // return false
    // })
    //
    // after(this.transientField2.runWithIntercept, (intercept, self: Field) => {
    //   // console.log('running...')
    //   intercept.return = 'Awesome2'
    // })

  }

  get propTransient () {
    return this.transientField1.prop
  }

  get computedVariable () {
    console.log('computedVariable')
    return this.authRepo.originalVariable.map(el => ({
      test: el.test + ' computed 1', test2: el.test2 + ' computed 1'
    }))
  }

  get computedUponComputedVariable () {
    console.log('computedUponComputedVariable')
    return this.computedVariable.map(el => ({
      test: el.test + ' computed 2', test2: el.test2 + ' computed 2'
    }))
  }

  set computedVariable (value) {
    this.authRepo.originalVariable = value
  }

  get getComputedButMakeReactiveAgain () {
    unraw(this.computedVariable[0])
    return this.computedVariable[0]
  }

  get computedPrimitive () {
    // console.log('compute3', this.primitive)
    return this.primitive
  }

  /**
   * Circular computed store connectivity test.
   */
  get deepEmail () {
    console.log('app', this.app)
    return String(this.app.router.userModel.app.router.userModel.email).split('').join('+')
  }

  pushToOriginalVariableInAuthRepo () {
    this.authRepo.originalVariable.push({
      test: 'push-1',
      test2: 'push-2'
    })
  }

  loading = false
  result: unknown = ''

  async asyncFunction () {
    return new Promise((resolve) => {
      this.loading = true
      setTimeout(() => {
        resolve('hey! how do you do?')
        this.loading = false
      }, 2000)
    })
  }

  async runAsyncFunction () {
    this.result = ''
    this.result = await this.asyncFunction()
  }

  /**
   * Implement abstract parent function.
   */
  reset () {
  }

  numberOfRecords = 5000000
  hugeArray = []
  loadingHugeData = false
  timeTaken = 0

  loadHugeData (numberOfRecords: number) {
    this.timeTaken = 0
    this.loadingHugeData = true
    const start = Date.now();

    setTimeout(() => {
      generateHugeArray(this, numberOfRecords)
      this.loadingHugeData = false
      this.timeTaken = Date.now() - start;
    })
  }

  msToTime (ms) {
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
