<script setup lang="ts">
// import { withInjection } from '../Services/Providers/Injection'
import Logout from '../Auth/Logout.vue'
import { Router } from '../Routing/Router'
import { Navigation } from './Navigation'
import { use } from '@/index'

const v = use(Navigation)
const router = use(Router)
</script>
<template>
  <div class="navigation-container">
    <div
      class="navigation-item-header"
      :style="{ backgroundColor: '#5BCA06' }"
    >
      {{ v.menu.activeName }}
    </div>
    <div
      v-for="item in v.menu.items"
      class="navigation-item"
      :style="{
        backgroundColor: '#3DE7CF',
      }"
      @click="() => router.push({ name: item.id })"
    >
      {{ item.activeName }}
    </div>

    <router-link to="/">Go Home</router-link>

  <div
    v-if="v.menu.showBack"
    class="navigation-item"
    @click="() => v.back()"
    :style="{ backgroundColor: '#2e91fc' }"
  >
    <span>⬅ </span>Back
  </div>

  <Logout />
</div></template>../Services/Routing/Router