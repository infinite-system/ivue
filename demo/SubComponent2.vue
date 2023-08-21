<script lang="ts">
// use normal <script> to declare options
export default {
  inheritAttrs: false,
};
</script>
<script setup lang="ts">
import { init } from '@/index';
import { Test } from './tests/Test' 
import { reactive, toRaw } from 'vue'
const emit = defineEmits<{
  (event: 'testEmit'): void
}>()

const v = init(Test, emit, 1)
const v2 = init(Test, emit, 2)
const v3 = init(Test, emit, 3)
const obj = {test:1}
const react = reactive(obj)
setTimeout(() => {
  console.log('obj === react', obj === toRaw(react))
},100)
</script>
<template>

<!--  {{ t.app.i }}-->
  <div>Sub Component: Hello: 
    Inner: {{ v.$.x}} {{ v.$.y }},<br /> 
    Outer: {{ v.x}} {{ v.y }},
    
    {{ v.email }}</div>
  <button @click="v.$emit('testEmit')">Emit</button>
  <button @click="v.$.say(1)">Say</button>
</template>./tests/Test