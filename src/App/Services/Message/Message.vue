<script setup lang="ts">
import { use } from '@/index'
import { Message } from './Message'

const v = use(Message);
</script>
<template>
  <div v-for="message in v.appMessages" :style="{ backgroundColor: 'red' }">
    - {{ message }}
  </div>

  <div v-for="message in v.clientMessages" :style="{ backgroundColor: 'orange' }">
    - {{ message }}
  </div>
</template>