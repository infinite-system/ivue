<script lang="ts">
// use normal <script> to declare options
export default {
  inheritAttrs: false,
};
</script>
<script setup lang="ts">
import { defineEmits } from 'vue'
import { init } from '../src';
import { Test } from './Test' 

const emit = defineEmits<{
  (event: 'testEmit'): void
}>()
const a = init(Test, emit)
</script>
<template>

<!--  {{ t.app.i }}-->
  <div>Sub Component: Hello: 
    {{ a.$.mouse.x}} {{ a.$.mouse.y }}, 
    {{ a.x }}, {{ a.y }}, {{ a.email }}</div>
  <button @click="a.$emit('testEmit')">Emit</button>
</template>