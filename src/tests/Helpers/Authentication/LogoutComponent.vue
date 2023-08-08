<script setup lang="ts">
import { LoginRegisterPresenter } from './LoginRegisterPresenter.js'
import { instance } from '@/tests/Helpers/IOC/IOC'
const presenter = instance(LoginRegisterPresenter)
</script>
<template>
    <div @click="() => presenter.logOut()"
      class="navigation-item"
      :style="{ backgroundColor: '#5BCA06' }"
    >
      <span>☯ Logout</span>
    </div>
</template>
