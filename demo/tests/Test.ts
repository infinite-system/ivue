
import { onMounted, onUnmounted, watch } from 'vue';
import { init, Traits } from '@/index';
import { UseApp } from '@/Classes/Traits/UseApp';
import { UseCapsule } from '@/Classes/Traits/UseCapsule';
import { UseQuasar } from '@/Classes/Traits/UseQuasar';
import { UseEmit } from '@/Classes/Traits/UseEmit';
import { UseMounting } from '@/Classes/Traits/UseMounting';
import { UseVue } from '@/Classes/Traits/UseVue';
import { UseRouting } from '@/Classes/Traits/UseRouting';
import { UseRouter } from '@/Classes/Traits/UseRouter';

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
    this.useCapsule(arguments)
  }

  get x () { return this.$.x }

  get y () { return this.$.y }
}
Traits(Mouse, [UseCapsule])
export interface Mouse extends UseCapsule {}


export class $Test {

  constructor (public self: Test) {}

  init () {
    ({ x: this.x, y: this.y } = init(Mouse).toRefs('x', 'y'))
  }

  words = 'saying some words...'

  say (i: number) {
    console.log(this.words)
  }

  x = 0
  y = 0
}
Traits($Test, [UseApp])
export interface $Test extends UseApp {}


export class Test {

  capsule = $Test // detached
  constructor (emit: any, private n: number) {
    this.useCapsule(arguments)
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
    return this.$.app.router.$.user.email
  }


  beforeMount () {
    console.log('# ' + this.n + ' before mounting...')
  }

  mounted () {
    console.log('mounted!!!')
  }
}
Traits(Test, [UseCapsule, UseMounting, UseEmit])
export interface Test extends UseCapsule, UseMounting, UseEmit {}