import { onActivated, onBeforeUpdate, onDeactivated, onMounted, onUnmounted, onUpdated, watch } from 'vue';
import { init, Traits } from '@/index';
import { UseCapsule } from '@/traits/UseCapsule';
import { UseMounting } from '@/traits/UseMounting';
import { Auth } from '@/App/Auth/Auth';
import { onBeforeRouteUpdate } from 'vue-router';

export class $Mouse {
  x = 0
  y = 0
  init () {
    const update = (event: MouseEvent) => {
      this.x = event.pageX
      this.y = event.pageY
      // console.log('x', this.x, 'y', this.y)
    }
    // console.log('mouse inited')
    
    onMounted(() => {
      console.log('---mounted')
      window.addEventListener('mousemove', update)
    })
    onUnmounted(() => {
      console.log('unmounted', update.bind(this) === update.bind(this))
      window.removeEventListener('mousemove', update)
    })

    // watch(() => this.x, n => {
    //   console.log('this.x new', n)
    // })
  }
  // update (event: MouseEvent) {
  //   this.x = event.pageX
  //   this.y = event.pageY
  // }
  // mounted () {
  //   console.log('mounted---')
  //   window.addEventListener('mousemove', this.update.bind(this))
  // }
  // unmounted () {
  //   console.log('unmounted---', this.update.bind(this) === this.update.bind(this))
  //   window.removeEventListener('mousemove', this.update.bind(this))
  // }
}
Traits($Mouse, [UseMounting])
export interface $Mouse extends UseMounting {}

export class Mouse {

  capsule = $Mouse // detached
  constructor () {
    this.initCapsule(arguments)
  }

  get x () { return this.$.x }

  get y () { return this.$.y }
}
Traits(Mouse, [UseCapsule])
export interface Mouse extends UseCapsule {}