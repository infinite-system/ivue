<script setup lang="ts">
import MemberAvatar from './MemberAvatar.vue';
import { Workspace } from './Workspace';

const workspace = Workspace.use();
</script>

<template>
  <section class="ow-activity">
    <header>
      <div>
        <span>Live workspace</span>
        <strong>Activity</strong>
      </div>
      <i></i>
    </header>
    <div class="ow-activity__stream">
      <article v-for="entry in workspace.activities.value" :key="entry.id">
        <MemberAvatar
          :member="workspace.memberById(entry.actorId)"
          size="small"
        />
        <p>
          <strong>{{ workspace.memberById(entry.actorId)?.name }}</strong>
          {{ entry.text }}
          <small>{{ entry.createdAt }}</small>
        </p>
        <span class="ow-activity__icon"
          ><span class="ow-symbol">{{ entry.icon }}</span></span
        >
      </article>
    </div>
  </section>
</template>
