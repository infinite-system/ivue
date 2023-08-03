<script setup lang="ts">
import { LoginRegisterPresenter } from './LoginRegisterPresenter.js'
import { IOC } from '@/tests/Helpers/IOC/IOC'
const presenter = IOC.get(LoginRegisterPresenter)
</script>
<template>
    <div @click="() => presenter.logOut()"
      class="navigation-item"
      :style="{ backgroundColor: '#5BCA06' }"
    >
      <span>☯ Logout</span>
    </div>
</template>
