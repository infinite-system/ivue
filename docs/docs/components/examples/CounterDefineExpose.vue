<script lang="ts" setup>
import { ivue } from 'ivue';

import Counter from './CounterDefineExposeClass'

const counter = ivue(Counter);

defineExpose<Counter>(counter);
</script>
<template>
  Count: {{ counter.count }}
</template>
