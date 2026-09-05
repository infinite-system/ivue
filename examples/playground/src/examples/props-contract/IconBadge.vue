<script lang="ts" setup>
import { IconBadge } from './IconBadge';

// the EXTENDED contract — four inherited props, one added, one re-tuned
const props = defineProps(IconBadge.Class.props);

const badge = new IconBadge.Class(props as IconBadge.Props);
</script>

<template>
  <span :class="badge.classes" :style="badge.style">
    <span aria-hidden="true">{{ badge.icon }}</span>
    {{ badge.label }}
  </span>
</template>
