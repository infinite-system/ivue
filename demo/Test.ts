
import { onMounted, onUnmounted, watch } from 'vue';
import { init, Traits } from '../src';
import { Appable } from '../src/Classes/Traits/Appable';
import { Capsuleable } from '../src/Classes/Traits/Capsuleable';
import { Quasarable } from '@/Classes/Traits/Quasarable';

export class $Mouse {

  constructor (public self: Mouse) {}

  init () {
    const update = (event: MouseEvent) => {
      this.self.x = event.pageX
      this.self.y = event.pageY
    }
    onMounted(() => window.addEventListener('mousemove', update))
    onUnmounted(() => window.removeEventListener('mousemove', update))
  }
}

export class Mouse {

  capsule = $Mouse
  constructor () {
    this.encapsulate(arguments)
  }

  x = 0
  y = 0
}

export interface Mouse extends Capsuleable {}
Traits(Mouse, [Capsuleable])

export class $Test {

  mouse: Mouse

  constructor (public self: Test) {
    this.mouse = init(Mouse)
  }

  get x () {
    return this.mouse.x
  }

  get y () {
    return this.mouse.x
  }
}

export interface $Test extends Appable {}
Traits($Test, [Appable])

export class Test {

  capsule = $Test

  constructor (emit: any) {
    this.encapsulate(arguments)
    this.$emit = emit
  }

  init () {
    watch(this, newValue => {
      console.log(newValue)
    })
  }

  get x () {
    return ''//this.$.x
  }

  get y () {
    return ''//this.$.y
  }

  get email () {
    return this.$.app.router.userModel.email
  }

  onBeforeMount(){

  }
}

export interface Test extends Capsuleable, Quasarable {}
Traits(Test, [Capsuleable, Quasarable])