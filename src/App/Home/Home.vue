<script setup lang="ts">
import Navigation from '@/App/Services/Navigation/Navigation.vue'
</script>
<template>
  <!-- <vue-dd v-model="app" get-all-properties /> -->
  <br />
  
  <div class="w3-row">
    <div class="w3-col s4 w3-center">
      <Navigation />
    </div>
    <div class="w3-col s8 w3-left">
      <router-view />
    </div>
  </div>
</template>