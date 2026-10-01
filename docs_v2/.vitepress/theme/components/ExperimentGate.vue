<script setup lang="ts">
import { ExperimentGate } from './ExperimentGate';

const gate = new ExperimentGate.Class();

const { shown } = gate;
</script>

<template>
  <div v-if="shown">
    <slot />
  </div>
</template>
