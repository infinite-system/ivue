<script setup lang="ts">
import { use } from '@/index'
import { App } from "@/App/App";

import Navigation from '@/App/Navigation/Navigation.vue'

const app = use(App)
</script>
<template>
  <vue-dd v-model="app" />
  <div class="w3-row">
    <div class="w3-col s4 w3-center">
      <Navigation />
    </div>
    <div class="w3-col s8 w3-left">
      <router-view />
    </div>
  </div>
</template>