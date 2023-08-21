<script setup lang="ts">
import { Messages } from './Messages'
import { use } from '@/index'
const v = use(Messages);
</script>
<template>
  <div v-for="message in v.appMessages" :style="{ backgroundColor: 'red' }">
    - {{ message }}
  </div>

  <div v-for="message in v.clientMessages" :style="{ backgroundColor: 'orange' }">
    - {{ message }}
  </div>
</template>