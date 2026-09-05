<script lang="ts" setup>
import { ContactAvatar } from './ContactAvatar';

const props = defineProps(ContactAvatar.Class.props);

const avatar = new ContactAvatar.Class(props as ContactAvatar.Props);
</script>

<template>
  <span class="contact-avatar" :style="avatar.style">{{ avatar.initials }}</span>
</template>

<style>
.contact-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
  flex: none;
}
</style>
