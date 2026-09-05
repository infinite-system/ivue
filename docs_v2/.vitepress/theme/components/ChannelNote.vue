<script setup lang="ts">
import { ChannelNote } from './ChannelNote';

const note = new ChannelNote.Class();
</script>

<template>
  <div v-if="note.hasChannel" class="channel-note">
    <span class="channel-chip">{{ note.channelName }}</span>
    <span class="channel-note__text">
      Private channel artifact — visible on the dev server only, never
      built into production or the newsletter.
    </span>
  </div>
</template>
