<script setup lang="ts">
import { CommentAvatar } from './CommentAvatar';

const props = defineProps(CommentAvatar.Class.props);

const avatar = new CommentAvatar.Class(props as CommentAvatar.Props);
</script>

<template>
  <svg
    class="comment-avatar"
    :width="avatar.size"
    :height="avatar.size"
    viewBox="0 0 20 20"
    role="img"
    :aria-label="avatar.ariaLabel"
  >
    <defs>
      <linearGradient :id="avatar.gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" :stop-color="avatar.firstStopColor" />
        <stop offset="100%" :stop-color="avatar.secondStopColor" />
      </linearGradient>
    </defs>
    <rect
      width="20"
      height="20"
      rx="6"
      :fill="avatar.gradientFill"
    />
    <g fill="#ffffff" fill-opacity="0.9">
      <rect
        v-for="(cell, index) in avatar.cells"
        :key="index"
        :x="avatar.cellX(cell)"
        :y="avatar.cellY(cell)"
        width="2.8"
        height="2.8"
      />
    </g>
  </svg>
</template>

<style scoped>
.comment-avatar {
  flex: none;
  border-radius: 6px;
  display: block;
}
</style>
