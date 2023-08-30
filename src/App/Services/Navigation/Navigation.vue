<script setup lang="ts">
// import { withInjection } from '../Services/Providers/Injection'
import Logout from '@/App/Auth/Logout.vue'
import { Router } from '@/App/Services/Routing/Router'
import { Navigation } from './Navigation'
import { use } from '@/index'

const v = use(Navigation, 'test')
const router = use(Router)
</script>
<template>
  <br />
  Route:
  {{ v.route?.name }}

  <br />
  Router:

  {{ router.currentRoute.name }}
  <br />
  <button @click="router.push({ name: 'login' })">Login</button>
  <br />
  <button @click="router.push({ name: 'ivue', query:{test:1} })">ivue</button>

<br />
  <button @click="router.push({ name: 'use-test', query:{test:1} })">composable test</button>

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
  </div>
</template>