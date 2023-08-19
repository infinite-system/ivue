<script setup lang="ts">
import { watch, computed, toRefs, onMounted, onUnmounted, ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { XVueTestClass } from "../src/Classes/Authentication/XVueTestClass";
import { use, init, raw, Traits, Behavior } from '@/index'
import { TestClass } from '../src/Classes/Test/TestClass';
import { Mouse } from '../src/Classes/Test/TestClass';
import { UserModel } from '../src/Classes/Authentication/UserModel';
import { iobj } from '../src/index';
import { AppPresenter } from '../src/Classes/AppPresenter';
import { Capsuleable } from '../src/Classes/Traits/Capsuleable';
import { Appable } from '../src/Classes/Traits/Appable';
import { Mountable } from '../src/Classes/Traits/Mountable';
import { Vueable } from '../src/Classes/Traits/Vueable';
import SubComponent from './SubComponent.vue'
import SubComponent2 from './SubComponent2.vue'

const vm: XVueTestClass = use(XVueTestClass)
const vt: TestClass = use(TestClass)
//
function useMouse (a) {
  // state encapsulated and managed by the composable
  const x = ref(0)
  const y = ref(0)

  // a composable can update its managed state over time.
  function update (event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  // a composable can also hook into its owner component's
  // lifecycle to setup and teardown side effects.
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // expose managed state as return value
  return { x, y, a }
}


const ctx = iobj({
  test: 1,
  get user () { return use(UserModel) },
  get mouse () { return init(Mouse, 1) }
})

const __Test__ = ($ = Test.prototype) => ({
  public: {
    data: {
      x: $.x,
      y: $.y,
    }
  }
})

class TestPrivate {

  mouse: Mouse

  constructor (public self: Test, private i) {
    this.mouse = init(Mouse, i)
    this.self.b = i + 'hey'
  }

  get y () { return this.self.b }

  doSomething () {
    console.log('self.b', this.self.b)
  }
}
// eslint-disable-next-line no-redeclare
interface TestPrivate extends Appable {}
Traits(TestPrivate, [Appable])

class Test {

  static emits = ['test']

  capsule = TestPrivate

  constructor (i: number) {
    this.encapsulate(arguments)
  }

  b = 'hey'
  // n = []
  // m = {}
  // get email () {
  //   return this.ctx().user.email
  // }
  // private init () {
  //
  //
  //   // watch(() => this.n.length, (val, old) => {
  //   //   console.log(val, old, Object.is(val, old))
  //   // })
  //   watch(this, (val) => {
  //     console.log('change', val)
  //   })
  //   // watch(() => {
  //   //   let j = 0
  //   //   for (const i in this.m) {
  //   //     j++
  //   //   }
  //   //   return j
  //   // }, (val, old) => {
  //   //   console.log('size', val, old, Object.is(val, old))
  //   // })
  // }

  get a () {
    return this.$.mouse.a
  }

  get x () {
    return this.$.mouse.x
  }

  get y () {
    return this.$.mouse.y
  }

  mounted () {
    console.log('mounted')
    console.log('route', this.$route, 'router', this.$router, 'refs.test', this.$refs)
    // this.$emit('test')
    // console.log('this.$emit', this.$emit('test'))
  }

  // exports() {
  //   return { n, init } = this
  // }
}
// eslint-disable-next-line no-redeclare
interface Test extends Capsuleable, Vueable {}
Traits(Test, [Capsuleable, Vueable])

console.log('$ in proto', '$$' in Test.prototype, 'a' in Test.prototype, Test.prototype)

// __Test__()
const t = init(Test, 2)
console.log('t.p', t, t.p, t.$)
let j = 0
// setInterval(() => {
//   t.m[j] = 1
//   j++
// }, 1000)
const t2 = init(Test, 4)
// watch(t, (newT) => {
//   console.log('changed', newT.a)
// })
// watch(t2, (newT) => {
//   console.log('changed', newT.a)
// })
const { x: o } = t.toRefs()
const mouse1 = use(Mouse, 1).toRefs()
const mouse2 = init(Mouse, 2).toRefs()
const mouse3 = use(Mouse, 1).toRefs()
const mouse4 = mouse2
// const { primitive } = toRefs(container.get(XVueTestClass))

watch(() => vm.computedVariable?.[0]?.test, newVal => {
  console.log('new computedVariable:', newVal)
}, { deep: true })

setTimeout(() => {
  // array.value = [1]
}, 1000)

let i = 2
// setInterval(() => {
//   // array.value = [1]
//   mouse1.b.value.test++
//   mouse1.c.value.push(i++)
// }, 1000)

const localComputedValue = computed(() => {
  return vm.computedVariable?.[0]?.test + ' + local append'
})
const { x, y } = init(Mouse, 1).toRefs()

setInterval(() => {
  vm.app.i++
})

const hugeId = 2646049

function hey() {
  console.log('yo')
}

</script>

<template>
<!--  <SubComponent />-->
  <SubComponent2 @testEmit="hey" />
  <br />
  <br />
  <br />
<!--  {{ o }}<br/>-->
  Yo:
  {{ t.$.mouse.x }}, {{ t.$.mouse.y }}
  <br/>
  <br/>
  {{ t2.x }}, {{ t2.y }}
  <br/>

  {{ t.x }}, {{ t.y }}

<!--  {{ t._.doSomething() }}-->
<!--  {{ t2._.doSomething() }}-->
  <br/>
  <br/>

<!--  {{ mouse1 }}<br/>-->
<!--  {{ mouse2 }}<br/>-->
<!--  {{ mouse3 }}<br/>-->
<!--  {{ mouse4 }}<br/>-->
  <!--  {{ array}}-->
  <div style="width:900px; margin:0 auto;">
    <!--    {{x}}, {{y}}-->
    <br/>
    <br/>
<!--    {{ vt.testClass2.x }},-->
<!--    {{ vt.testClass2.y }}-->
    <br/>
    <br/>
    {{ vt.testClass2.val }}
    <button @click="vt.testClass2.val++">vt.testClass2.val++</button>
    <br/>
    {{ vm.transientField1.x }} ,
    {{ vm.transientField1.y }}


    <h1>ivue - Infinite Vue - Implementation Tests</h1>
    <!--  <vue-dd v-model="vm" get-all-properties/>-->


    <div ref="test">Hello</div>

    <h2>Class Inheritance Tests</h2>

    vm.parentValue: <input v-model="vm.parentValue"/><br/>
    <button @click="vm.parentValueAlert()">vm.parentValueAlert()</button>

    <h2>Computed Resolution Tests</h2>
    <hr/>
    <h3>Primitive Computed Tests</h3>
    <table>
      <tr>
        <td class="label"><strong>vm.computedPrimitive</strong></td>
        <td class="value">{{ vm.computedPrimitive }}
          <button @click="vm.primitive++">Change Primitive</button>
        </td>
      </tr>
      <tr>
        <td class="label"><strong>localComputedValue</strong> (refers to vm.computedVariable.[0].test):</td>
        <td class="value">{{ localComputedValue }}</td>
      </tr>
      <tr>
        <td class="label"><strong>vm.authRepo.userModel.email:</strong></td>
        <td class="value"><input type="text" style="width:250px;" v-model="vm.authRepo.userModel.email"/></td>
      </tr>
      <tr>
        <td class="label"><strong>vm.authRepo.userModel.upperCaseEmail:</strong></td>
        <td class="value">{{ vm.authRepo.userModel.upperCaseEmail }}</td>
      </tr>
      <tr>
        <td class="label">vm.authRepo.userModel.dashedUppercaseEmail</td>
        <td class="value">
          <span v-for="i in vm.authRepo.userModel.dashedUppercaseEmail">
            <span>{{ i }}</span>-
          </span>
        </td>
      </tr>
      <tr>
        <td class="label">vm.authRepo.userModel.dashedUppercaseEmail (colored):</td>
        <td class="value">
          <span v-for="i in vm.authRepo.userModel.dashedUppercaseEmail">
            <span style="color:green">{{ i }}</span>-
          </span>
        </td>
      </tr>
      <tr>
        <td class="label">Deep circular resolution test of vm.deepEmail:</td>
        <td class="value">{{ vm.deepEmail }}</td>
      </tr>
    </table>

    <h3>Complex (Objects/Arrays from other stores) Computed Tests</h3>
    <button @click="vm.pushToOriginalVariableInAuthRepo()">vm.pushToOriginalVariableInAuthRepo()</button>
    <br/>
    <button @click="vm.computedVariable = [{
      test: 'set 1', test2: 'set 2'
    }]">Setter on a computed vm.computedVariable (resets vm.authRepo.originalVariable)
    </button>
    <br/>
    <strong>vm.authRepo.originalVariable:</strong><br/>

    <div v-for="el in vm.authRepo.originalVariable">
      test:<input v-model="el.test"/> test2: <input v-model="el.test2"/>
    </div>
    <!--  <vue-dd v-model="pres.reactiveVar" />-->
    <br/>
    <strong>vm.computedVariable:</strong>
    <div v-for="el in vm.computedVariable">
      test:<input v-model="el.test"/> test2: <input v-model="el.test2"/>
    </div>
    <br/>
    <strong>vm.computedUponComputedVariable:</strong>
    <div v-for="el in vm.computedUponComputedVariable">
      test:<input v-model="el.test"/> test2: <input v-model="el.test2"/>
    </div>
    <br/>
    <h2>Aync Function Test</h2>
    <hr/>
    <span>Loader: <span v-if="vm.loading">loading...</span></span><br/>
    <span>Result: {{ vm.result }}</span><br/>
    <button @click="vm.runAsyncFunction">runAsyncFunction() (wait for 2 seconds)</button>
    <h2>Huge Data Test</h2>
    <hr/>
    <input v-model="vm.numberOfRecords"/>
    <button @click="vm.loadHugeData(vm.numberOfRecords)">Load Huge Data
      ({{ vm.numberOfRecords.toLocaleString("en-US") }} records)
    </button>
    <br/> Loader: <strong>{{
      vm.loadingHugeData ?
          'loading ' + vm.numberOfRecords.toLocaleString("en-US") + ' records ...'
          : ''
    }}</strong>
    <div style="color:green" v-if="vm.timeTaken">Loaded in {{ vm.msToTime(vm.timeTaken) }}.</div>

    <div v-if="hugeId in vm.hugeArray">
      <h3>Editing Record #{{ hugeId.toLocaleString("en-US") }}</h3>
      user: <input v-model="vm.hugeArray[hugeId].struct.user"/><br/>
      text: <input v-model="vm.hugeArray[hugeId].struct.text"/>
      <pre style="font-size:10px; line-height:10px;">{{ vm.hugeArray[hugeId] }}</pre>
    </div>
    <h2>markRaw Tests</h2>
    <div>nonReactiveProp is disabled:</div>
    <vue-dd name="nonReactiveProp" v-model="vm.nonReactiveProp" :preview="0" :dark="false" :open-level="2"/>

    <h2>Private prop test</h2>
    <div>vm.x: {{ vm.x }}
      <button @click="vm.x++">Increase</button>
    </div>
    <br/>

    <h2>Transients Test</h2>
    <div>vm.transientField1.prop: {{ vm.transientField1.prop }}
      <button @click="vm.transientField1.prop++">Increase++</button>
    </div>
    <div>vm.transientField2.prop: {{ vm.transientField2.prop }}
      <button @click="vm.transientField2.prop++">Increase++</button>
    </div>
    <div>Computed vm.propTransient: {{ vm.propTransient }}</div>
    <h2>Intercepts Test</h2>
    <div>vm.transientField2.runWithIntercept(): {{ vm.transientField2.runWithInterceptResult }}
      <button @click="vm.transientField2.runWithInterceptResult = vm.transientField2.runWithIntercept('test')">
        vm.transientField2.runWithIntercept()
      </button>
    </div>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
  </div>
</template>
<style>
.rendererParent {
  width: 100%;
  height: 580px;
  border: 1px solid black;
}

h1, h2, h3, h4 {
  font-family: Arial;
  margin: 10px 0;
  padding: 0;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 18px;
}

h3 {
  font-size: 16px;
}

h4 {
  font-size: 14px;
  margin: 0 5px;
}

body {
  font-family: Arial;
  font-size: 14px;
  line-height: 200%;
}

.body {
  max-width: 1000px;
  margin: 0 auto;
}

.section {
  padding: 5px 0;
}

.section-alt {
  padding: 15px;
  background: #edf1f6;
  border-radius: 10px;
}

button {
  color: #eee;
  border-radius: 5px;
  border: 0;
  font-size: 16px;
  background: #0075d3;
  margin: 1px 3px;
  padding: 4px 7px;
  display: inline-block;
  cursor: pointer;
}

button:hover {
  background: #08277a;
}

button.pass:hover {
  background: green;
}

button.fail:hover {
  background: red;
}

button:active {
  background: #294dab;
}

input {
  color: #333;
  border-radius: 5px;
  border: 0;
  width: 250px;
  font-size: 16px;
  background: #eee;
  border: 1px solid #0075d3;
  margin: 1px 3px;
  padding: 4px 7px;
  display: inline-block;
}

.mr-10 {
  margin-right: 10px;
}

.pass {
  background: #00c200;
}

.fail {
  background: #c00606
}

td.label {
  text-align: right;
}

td.value {
  padding-left: 20px;
}
</style>

../src/Classes/Traits/Capsuleable../src/kernel