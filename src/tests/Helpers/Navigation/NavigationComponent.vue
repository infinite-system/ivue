<script setup lang="ts">
// import { withInjection } from '../Core/Providers/Injection'
import LogoutComponent from '../Authentication/LogoutComponent.vue'
import { Router } from '../Routing/Router'
import { NavigationPresenter } from './NavigationPresenter'
import { container } from '../AppIOC'

const presenter = container.get(NavigationPresenter)
const router = container.get(Router)
</script>
<template>
  <Observer>
    <div class="navigation-container">
      <div class="navigation-item-header" :style="{ backgroundColor: '#5BCA06' }">
        {{ presenter.viewModel.currentSelectedVisibleName }}
      </div>
      <div
        v-for="menuItem in presenter.viewModel.menuItems"
        class="navigation-item"
        :style="{
              backgroundColor: '#3DE7CF',
            }"
        @click="() => router.goToId(menuItem.id)"
      >
        {{ menuItem.visibleName }}
      </div>

      <router-link to="/">Go Home</router-link>

      <div
        v-if="presenter.viewModel.showBack"
        class="navigation-item"
        @click="() => presenter.back()"
        :style="{ backgroundColor: '#2e91fc' }"
      >
        <span>⬅ </span>Back
      </div>

      <LogoutComponent />
    </div>
  </Observer>
</template>
