
import { onActivated, onDeactivated, onMounted, onUnmounted, onUpdated, watch } from 'vue';
import { init, use, Traits } from '@/index';
import { UseApp } from '@/App/Traits/UseApp';
import { UseCapsule } from '@/traits/UseCapsule';
import { UseQuasar } from '@/App/Traits/UseQuasar';
import { UseEmit } from '@/traits/UseEmit';
import { UseMounting } from '@/traits/UseMounting';
import { UseVue } from '@/traits/UseVue';
import { UseRouting } from '@/traits/UseRouting';
import { UseRouter } from '@/traits/UseRouter';
import { Mouse } from './Mouse'


export class $Test {

  constructor (public self: Test) {}

  mouse!: Mouse
  init () {

    // const { x, y } = useMouse()

    ({ x: this.x, y: this.y } = use(Mouse).toRefs())

    // this.mouse = use(Mouse)
  }

  words = 'saying some words...'

  say (i: number) {
    console.log(this.words)
  }


  // get x () { return this.mouse.x }

  // get y () { return this.mouse.y }

  x = 0
  y = 0
}
Traits($Test, [UseApp])
export interface $Test extends UseApp {}


export class Test {

  capsule = $Test // detached
  constructor (emit: any, private n: number) {
    this.initCapsule(arguments)
    this.$emit = emit
  }

  async init () {
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