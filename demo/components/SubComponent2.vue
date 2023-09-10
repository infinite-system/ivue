<script lang="ts">
// use normal <script> to declare options
export default {
  inheritAttrs: false,
};
</script>
<script setup lang="ts">
import { getCurrentScope } from 'vue'
import { init } from '@/index';
import { Test } from '../tests/Test'
import { Mouse } from '../tests/Mouse';
import { inject, reactive, toRaw } from 'vue'
import { ivue } from '../../src/ivue';
const emit = defineEmits<{
  (event: 'testEmit'): void
}>()
// mouse.js

const mouse: Mouse = inject('mouse') as Mouse

console.log('getCurrentScope', getCurrentScope())
const v = ivue(Test, emit, 1)
const v2 = ivue(Test, emit, 2)
const v3 = ivue(Test, emit, 3)
const obj = { test: 1 }
const react = reactive(obj)
// setTimeout(() => {
//   console.log('obj === react', obj === toRaw(react))
// },100)
</script>
<template>
  <!--  {{ t.app.i }}-->
<div>
  Injected mouse: {{ mouse }} <br />

  <div>Sub Component: Hello:
    Inner: {{ v.$.x }} {{ v.$.y }},<br />
    Outer: {{ v.x }} {{ v.y }},
    <br />
    {{ v.email }}
  </div>
  <button @click="v.$emit('testEmit')">Emit</button>
  <button @click="v.$.say(1)">Say</button>
</div>
</template>