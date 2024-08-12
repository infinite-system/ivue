<script setup lang="ts">
defineProps({
  href: String,
  label: String,
  inline: {
    type: Boolean,
    default: true
  }
});
</script>
<template>
<a :href="'/ivue' + href" :style="`inline: ${inline};`">{{ label }}</a>
</template>