import { injectable } from 'inversify';
import { TestClass2 } from './TestClass2'
import { use } from '@/kernel';
import { onMounted, onUnmounted } from 'vue';

export class Mouse {
  x = 0
  y = 0
  constructor(public a:number){}
  init () {
    const update = (event: MouseEvent) => {
      this.x = event.pageX
      this.y = event.pageY
    }
    this.x =1
    onMounted(() => window.addEventListener('mousemove', update))
    onUnmounted(() => window.removeEventListener('mousemove', update))
    return this
  }
  b= {
    test: 1
  }
  c = [1]
  get xx () {
    return this.x
  }
}


export class TestClass {

  testClass2 = use(TestClass2)

  test = 1

  mouse: Mouse

  constructor () {
    console.log('constructed')
  }

  x
  y

  init () {
    // (this.testClass2) // initialize getter
  }

  doTest () {
    this.test = 2
  }
}

