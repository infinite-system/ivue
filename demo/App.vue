<script setup lang="ts">
import { iref, ivue } from '../lib/ivue';
class Item {
  width = iref(1);
}
const runner = ivue(Item);
</script>
<template>
  <h1>Runner:</h1>
  <vue-dd name="runner" v-model="runner" />
</template>
