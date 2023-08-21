<script setup lang="ts">
import { LoginRegisterPresenter } from './LoginRegisterPresenter.js'
import { use } from '@/index'
const presenter = use(LoginRegisterPresenter)
</script>
<template>
    <div @click="() => presenter.logout()"
      class="navigation-item"
      :style="{ backgroundColor: '#5BCA06' }"
    >
      <span>☯ Logout</span>
    </div>
</template>