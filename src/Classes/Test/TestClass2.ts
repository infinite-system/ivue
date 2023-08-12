// import { UseRouting } from '@/tests/Helpers/Traits/UseRouting';
import { UseApp } from '@/Classes/Traits/UseApp';
import { use, $init, $use } from '@/Kernel';
import { Behavior, mix } from '@/utils';
import { watch, UnwrapRef, ComputedRef, onMounted, onUnmounted, ref } from 'vue'
import { TestClass, Mouse } from '@/Classes/Test/TestClass';
import { UseRouting } from '@/Classes/Traits/UseRouting';
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

  router: Router

  init () {
    // ({ $router: this.router } = $use(UseRouting));

    ({ x: this.x, y: this.y } = $init(Mouse));
    // ({ x: this.x, y: this.y } = useMouse())
  }

  x: number
  y: number

  alert () {
    console.log('alert')
  }

  rest: UnwrapRef<ComputedRef>
}

// Enables traits IDE support & functionality
export interface TestClass2 extends UseApp {}
mix(TestClass2, [UseApp])
