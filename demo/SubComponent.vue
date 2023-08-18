<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Behavior, init, Traits } from '../src';
import { Appable } from '../src/Classes/Traits/Appable';
import { Capsuleable } from '../src/Classes/Traits/Capsuleable';
import { Vueable } from '../src/Classes/Traits/Vueable';

class MouseA {
  x = 0
  y = 0
  init () {

    const update = (event) => {
      this.x = event.pageX
      this.y = event.pageY
    }
    console.log('this', this.x)
    onMounted(() => {
    //
    //
    console.log('yooooooooo')


    window.addEventListener('mousemove', update)
    })

    // onUnmounted(() => {
    //
    //   window.removeEventListener('mousemove', update)
    // })
    return this
  }
}
class TestPrivateA {
  mouse: MouseA
  constructor (public self: TestA) {

  }
  init() {
    this.mouse = init(MouseA)
  }
}


class TestA {

  behavior: {
    $: Behavior.DISABLED
  }
  static emits = ['test']

  $: TestPrivateA
  capsule = TestPrivateA

  mouse: MouseA

  constructor (i:number) {
    this.encapsulate(arguments)
    this.mouse = init(MouseA)
  }

  init () {
    console.log('t.$.mouse', this.$.mouse)
  }

  get x () {
    return this.mouse.x
  }

  get y () {
    return this.mouse.y
  }

}
// eslint-disable-next-line no-redeclare
export interface TestA extends Capsuleable, Appable {}
Traits(TestA, [Capsuleable, Appable])

const t = init(TestA)
setInterval(() => {
  t.app.i++
}, 100)
// setInterval(() => {
//   t.$.mouse.x++
// }, 100)

console.log('t', t)
</script>
<template>

  {{ t.app.i }}
  <div>Sub Component: Hello: {{ t.$.mouse.x}} {{ t.x }}, {{ t.y }}</div>
</template>../src/Classes/Traits/Capsuleable