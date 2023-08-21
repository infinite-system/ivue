<script setup lang="ts">
import NavigationComponent from '@/Classes/Navigation/NavigationComponent.vue'
import { use } from '@/index'
import { App } from "@/Classes/App";

const app = use(App)
</script>
<template>
  <vue-dd v-model="app" />

    <div class="w3-row">
      <div class="w3-col s4 w3-center">
        <NavigationComponent />
      </div>
<!--      <div class="w3-col s8 w3-left" v-for="current in renderedComponents">-->
<!--        <component v-if="presenter.active.name === current.id" :is="current.component" />-->
<!--      </div>-->
      <div class="w3-col s8 w3-left">
        <router-view />
      </div>
    </div>

</template>