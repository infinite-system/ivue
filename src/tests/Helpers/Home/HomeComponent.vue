<script setup lang="ts">
import NavigationComponent from '@/tests/Helpers/Navigation/NavigationComponent.vue'
import { instance } from '@/tests/Helpers/IOC/IOC'
import { AppPresenter } from "@/tests/Helpers/AppPresenter.ts";

const app = instance(AppPresenter)
</script>
<template>
  <vue-dd v-model="app" />

    <div class="w3-row">
      <div class="w3-col s4 w3-center">
        <NavigationComponent />
      </div>
<!--      <div class="w3-col s8 w3-left" v-for="current in renderedComponents">-->
<!--        <component v-if="presenter.currentRoute.routeId === current.id" :is="current.component" />-->
<!--      </div>-->
      <div class="w3-col s8 w3-left">
        <router-view />
      </div>
    </div>

</template>