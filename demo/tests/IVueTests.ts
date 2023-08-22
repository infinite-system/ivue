
import { TAuth } from './TAuth'
import { TApp } from "./TApp";
import { TMessage } from './TMessage'
import { TRouter } from './TRouter'
import { ParentIVueTests } from "./ParentIVueTests";
import { watch } from "vue";
import { generateHugeArray } from "@/App/Generators/generators";
import { TField } from "./TField";
import { use, init, Behavior, unraw, before } from "@/index";

export class IVueTests extends ParentIVueTests {

  static behavior = {
    init: Behavior.SCOPED_INTERCEPT,
    nonReactiveProp: Behavior.DISABLED
  }

  get auth () { return use(TAuth) }

  get app () { console.log('changing'); return use(TApp) }

  get message () { return use(TMessage) }

  get router () { return use(TRouter) }


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

  constructor (public primitive = 100) {
    super()
  }

  transientField1!: TField

  transientField2!: TField

  transientField3!: TField

  transientFields: TField[] = []

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

    TField.behavior = {
      // ...Field.behavior,
      // interceptable: Behavior.INTERCEPT
    }

    this.transientField3 = init(TField, 11)
    console.log('this.transientField3', this.transientField3)

    this.transientField1 = init(TField, 23)
    this.transientField2 = init(TField, 5)

    this.timeTaken = 0

    const start = Date.now();

    setTimeout(() => {


      for (let i = 0; i < 500000; i++) {
        // this.transientFields.push(ivueMake(new Field(i)))
        this.transientFields.push(init(TField, i, false))
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


    // watch(this, (state) => {
      // console.log('changed', state)
    // })

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
    return this.auth.originalVariable.map(el => ({
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
    this.auth.originalVariable = value
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
    //console.log('app', this.app)
    return String(this.app.router.$.user.app.router.$.user.email).split('').join('+')
  }

  pushToOriginalVariableInAuthRepo () {
    this.auth.originalVariable.push({
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

  msToTime (ms: number) {
    const seconds = (ms / 1000)
    const minutes = (ms / (1000 * 60));
    const hours = (ms / (1000 * 60 * 60));
    const days = (ms / (1000 * 60 * 60 * 24));

    if (seconds < 60) return seconds.toFixed(3) + " Seconds";
    else if (minutes < 60) return minutes.toFixed(1) + " Minutes";
    else if (hours < 24) return hours.toFixed(1) + " Hrs";
    else return days.toFixed(1) + " Days"
  }
}
