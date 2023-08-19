// import { UseRouting } from '@/tests/Helpers/Traits/UseRouting';
import { Appable } from '@/Classes/Traits/Appable';
import { init, use } from '@/kernel';
import { Traits } from '@/utils';
import { watch, type UnwrapRef, type ComputedRef, onMounted, onUnmounted, ref } from 'vue'
import { TestClass, Mouse } from '@/Classes/Test/TestClass';
import { Routable } from '@/Classes/Traits/Routable';
import { Router } from '@/Classes/Routing/Router';

export function useMouse() {
  // state encapsulated and managed by the composable
  const x = ref(0)
  const y = ref(0)

  // a composable can update its managed state over time.
  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  // a composable can also hook into its owner component's
  // lifecycle to setup and teardown side effects.
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // expose managed state as return value
  return { x, y }
}

export class TestClass2 {

  get testClass () { return use(TestClass) }

  val = 1

  router!: Router // TODO: convert to routable

  init () {

    if (this.app.router){

    }

    ({ x: this.x, y: this.y, b: this.b } = init(Mouse, 1).toRefs());
    // this.b.test
    // ({ x: this.x, y: this.y } = useMouse())
  }

  x: Mouse['x']
  y: Mouse['y']
  b: Mouse['b']

  alert () {
    console.log('alert')
  }

  rest: UnwrapRef<ComputedRef>
}

// Enables traits IDE support & functionality
export interface TestClass2 extends Appable {}
Traits(TestClass2, [Appable])
