<script setup lang="ts">
import { computed, provide, onUnmounted, onBeforeUnmount, getCurrentInstance, onMounted, markRaw } from 'vue';
import { IVueTests } from "../tests/IVueTests";
import { bind, ivue, use, init, pre, kernel } from '@/index'
import SubComponent2 from './SubComponent2.vue'
import TraitsComponent from './TraitsComponent.vue'
import { Mouse } from '../tests/Mouse';
import { getPrototypeGetters } from '../../src/utils/getters';

console.log('loaded')
let vm: IVueTests = use(IVueTests)
provide('mouse', ivue(Mouse))
const localComputedValue = computed(() => {
  return vm.computedVariable?.[0]?.test + ' + local append'
})

vm.setTest('yes')
console.log(vm.test)
const hugeId = 2646049

function hey () {
  console.log('yo')
}
// onMounted(() => console.log('kernel.instances.get(IVueTests)', kernel.instances.get(IVueTests)))
// onBeforeUnmount(() => {
  
  
// })
// onUnmounted(() => console.log('kernel.instances.get(IVueTests)', kernel.instances.get(IVueTests)))
</script>
<template>

<h2>Sub Component Test</h2>
    <router-view @testEmit="hey"></router-view>
  <div style="width:900px; margin:0 auto;">

    <h1>ivue - Infinite Vue - Implementation Tests</h1>
<!-- <vue-dd v-model="vm" get-all-properties/> -->

    <h2>Class Inheritance Tests</h2>

    vm.parentValue: <input v-model="vm.parentValue" /><br />
    <button @click="vm.parentValueAlert()">vm.parentValueAlert()</button>

    <h2>Computed Resolution Tests</h2>
    <hr />
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
        <td class="label"><strong>vm.auth.user.email:</strong></td>
        <td class="value"><input
            type="text"
            style="width:250px;"
            v-model="vm.auth.user.email"
          /></td>
      </tr>
      <tr>
        <td class="label"><strong>vm.auth.user.upperCaseEmail:</strong></td>
        <td class="value">{{ vm.auth.user.upperCaseEmail }}</td>
      </tr>
      <tr>
        <td class="label">vm.auth.user.dashedUppercaseEmail</td>
        <td class="value">
          <span v-for="i in vm.auth.user.dashedUppercaseEmail">
            <span>{{ i }}</span>-
          </span>
        </td>
      </tr>
      <tr>
        <td class="label">vm.auth.user.dashedUppercaseEmail (colored):</td>
        <td class="value">
          <span v-for="i in vm.auth.user.dashedUppercaseEmail">
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
    <br />
    <button @click="vm.computedVariable = [{
      test: 'set 1', test2: 'set 2'
    }]">Setter on a computed vm.computedVariable (resets vm.auth.originalVariable)
    </button>
    <br />
    <strong>vm.auth.originalVariable:</strong><br />

    <div v-for="el in vm.auth.originalVariable">
      test:<input v-model="el.test" /> test2: <input v-model="el.test2" />
    </div>

    <br />
    <strong>vm.computedVariable:</strong>
    <div v-for="el in vm.computedVariable">
      test:<input v-model="el.test" /> test2: <input v-model="el.test2" />
    </div>
    <br />
    <strong>vm.computedUponComputedVariable:</strong>
    <div v-for="el in vm.computedUponComputedVariable">
      test:<input v-model="el.test" /> test2: <input v-model="el.test2" />
    </div>
    <br />
    <h2>Async Function Test</h2>
    <hr />
    <span>Loader: <span v-if="vm.loading">loading...</span></span><br />
    <span>Result: {{ vm.result }}</span><br />
    <button @click="vm.runAsyncFunction">runAsyncFunction() (wait for 2 seconds)</button>
    <h2>Huge Data Test</h2>
    <hr />
    <input v-model="vm.numberOfRecords" />
    <button @click="vm.loadHugeData(vm.numberOfRecords)">Load Huge Data
      ({{ vm.numberOfRecords.toLocaleString("en-US") }} records)
    </button>
    <br /> Loader: <strong>{{
      vm.loadingHugeData ?
      'loading ' + vm.numberOfRecords.toLocaleString("en-US") + ' records ...'
      : ''
    }}</strong>
    <div
      style="color:green"
      v-if="vm.timeTaken"
    >Loaded in {{ vm.msToTime(vm.timeTaken) }}.</div>

    <div v-if="hugeId in vm.hugeArray">
      <h3>Editing Record #{{ hugeId.toLocaleString("en-US") }}</h3>
      user: <input v-model="vm.hugeArray[hugeId].struct.user" /><br />
      text: <input v-model="vm.hugeArray[hugeId].struct.text" />
      <pre style="font-size:10px; line-height:10px;">{{ vm.hugeArray[hugeId] }}</pre>
    </div>
    <h2>markRaw Tests</h2>
    <div>nonReactiveProp is disabled:</div>
    <vue-dd
      name="nonReactiveProp"
      v-model="vm.nonReactiveProp"
      :preview="0"
      :dark="false"
      :open-level="2"
    />
    <div v-if="vm.transientFields?.[0]">
Email: {{ vm.transientFields?.[0]?.email }}<br /> {{ vm.transientFields[10].x }}
</div>
    <input type="text" v-model="vm.app.user.email" />
    <h2>Private prop test</h2>
    <div>vm.x: {{ vm.x }}
      <button @click="vm.x++">Increase</button>
    </div>
    <br />

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
    <br />
    <br />
    <br />
    <TraitsComponent />
    <br />
    <br />
    <br />
    <br />
  </div>
</template>
<style>
.rendererParent {
  width: 100%;
  height: 580px;
  border: 1px solid black;
}

h1,
h2,
h3,
h4 {
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
}</style>