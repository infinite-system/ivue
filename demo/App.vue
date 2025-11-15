<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <nav class="bg-gray-800 text-white p-4">
    <div class="container mx-auto flex gap-6">
      <RouterLink 
        to="/ivue-benchmark" 
        class="text-lg font-semibold" 
        active-class="text-green-400"
      >
        ivue Benchmark
      </RouterLink>
      <RouterLink 
        to="/composable-benchmark" 
        class="text-lg font-semibold" 
        active-class="text-blue-400"
      >
        Composable Benchmark
      </RouterLink>
      <RouterLink 
        to="/reactive-composable-benchmark" 
        class="text-lg font-semibold" 
        active-class="text-blue-400"
      >
        Reactive Composable Benchmark
      </RouterLink>
    </div>
  </nav>

  <main class="container mx-auto p-4">
    <!-- The component for the active route will be rendered here -->
    <RouterView />
  </main>
</template>
