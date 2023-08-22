<script setup lang="ts">
import { use } from '@/index'
import { Auth } from './Auth'

const v = use(Auth)
</script>
<template>
    <div @click="() => v.logout()"
      class="navigation-item"
      :style="{ backgroundColor: '#5BCA06' }"
    >
      <span>☯ Logout</span>
    </div>
</template>