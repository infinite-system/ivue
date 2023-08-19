<script lang="ts">
// use normal <script> to declare options
export default {
  inheritAttrs: false,
};
</script>
<script setup lang="ts">
import { init } from '../src';
import { Test } from './Test' 

const emit = defineEmits<{
  (event: 'testEmit'): void
}>()
const v = init(Test, emit)
</script>
<template>

<!--  {{ t.app.i }}-->
  <div>Sub Component: Hello: 
    {{ v.$.x}} {{ v.$.y }}, {{ v.email }}</div>
  <button @click="v.$emit('testEmit')">Emit</button>
  <button @click="v.$.say(1)">Say</button>
</template>