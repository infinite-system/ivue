<script setup lang="ts">
import { MemberAvatar } from './MemberAvatar';

const props = defineProps(MemberAvatar.Class.props);

const avatar = new MemberAvatar.Class(props as MemberAvatar.Props);
</script>

<template>
  <span class="ow-avatar" :class="avatar.sizeClass" :style="avatar.style" :title="avatar.name">
    <span class="ow-avatar__initials">{{ avatar.initials }}</span>
    <i v-if="avatar.isOnline" aria-label="Online"></i>
  </span>
</template>
