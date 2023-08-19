
import { onMounted, onUnmounted, watch } from 'vue';
import { init, Traits } from '../src';
import { Appable } from '../src/Classes/Traits/Appable';
import { Capsuleable } from '../src/Classes/Traits/Capsuleable';
import { Quasarable } from '@/Classes/Traits/Quasarable';

export class $Mouse {
  x = 0
  y = 0
  init () {
    const update = (event: MouseEvent) => {
      this.x = event.pageX
      this.y = event.pageY
    }
    onMounted(() => window.addEventListener('mousemove', update))
    onUnmounted(() => window.removeEventListener('mousemove', update))
  }
}

export class Mouse {

  capsule = $Mouse // detached
  constructor () {
    this.encapsulate(arguments)
  }

  get x () { return this.$.x }

  get y () { return this.$.y }
}
Traits(Mouse, [Capsuleable])
export interface Mouse extends Capsuleable {}


export class $Test {

  init() {
    ({
      x: this.x,
      y: this.y
    } = init(Mouse).toRefs('x', 'y'))
  }
  
  words = 'saying some words...'

  say (i:number) {
    console.log(this.words)
  }

  x = 0
  y = 0
}
Traits($Test, [Appable])
export interface $Test extends Appable {}


export class Test {

  capsule = $Test // detached
  constructor (emit: any) {
    this.encapsulate(arguments)
    this.$emit = emit
  }

  init () {
    watch(this, newValue => {
      console.log('newValue', newValue)
    })
  }

  get x () {
    console.log('this.$.x', this.$.x)
    return this.$.x
  }

  get y () {
    console.log('this.$.y', this.$.y)
    return this.$.y
  }

  get email () {
    return this.$.app.router.userModel.email
  }

  beforeMount () {
    console.log('before mounting...')
  }
}
Traits(Test, [Capsuleable, Quasarable])
export interface Test extends Capsuleable, Quasarable {}