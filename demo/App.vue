<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

import { Child } from './components/ChildClass';
import { kernel } from '../lib/Kernel';
import { Reactive } from '../lib/Reactive';
import { computed } from 'vue';

class ChildClassExtended extends Child.$Class {
  get yo() {
    return computed(() => 'Hello from extended class!!!!!');
  }
}

kernel.set('@core/Child', Reactive(ChildClassExtended));

setTimeout(() => {
  kernel.set('@core/Child', Child.$Class);
}, 5000);
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
        to="/class-composable-benchmark" 
        class="text-lg font-semibold" 
        active-class="text-blue-400"
      >
      Class Composable Benchmark
      </RouterLink>
      <RouterLink 
        to="/composable-benchmark" 
        class="text-lg font-semibold" 
        active-class="text-blue-400"
      >
        Legacy Composable Benchmark
      </RouterLink>
    </div>
  </nav>

  <main class="container mx-auto p-4">
    <!-- The component for the active route will be rendered here -->
    <RouterView />
  </main>
</template>
