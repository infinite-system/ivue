<script setup lang="ts">
import type { Kit } from '../../kit/Kit';
import { Chat } from './Chat';
import './ai-chat.css';

// inline on purpose: the SFC compiler resolves this literal, and would not resolve Chat.Props through Chat.ts's imports
const props = defineProps<{ dark?: boolean; kit?: Kit.Entry }>();

// the root constructs the class it was handed, or its own
const chat = new ((props.kit?.namespace?.Class as typeof Chat.Class | undefined) ?? Chat.Class)(
  props
);

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  rows,
  error,
  // element refs
  scroller,
  peek
} = chat;
</script>

<template>
  <div
    class="ai-chat"
    :class="{ 'ac-dark': dark, 'ac-side-is-open': chat.indexOpen }"
    :data-theme="chat.theme"
    :data-density="chat.density"
    :data-tree="chat.tree"
  >
    <component :is="chat.kit.Stats.view" v-bind="chat.seam('Stats')" />
    <p v-if="error" class="ac-error">{{ error }}</p>

    <div class="ac-main">
      <section
        class="ac-thread"
        @pointermove="chat.onThreadPointerMove($event)"
        @pointerleave="chat.onThreadPointerLeave()"
      >
        <component
          :is="chat.kit.Scroller.view"
          ref="scroller"
          :kit="chat.kit.Scroller"
          scrollbar
          :auto-repeat="false"
          v-model="rows"
          :assumed-size="96"
          :padding-quantity="6"
          :selection-text="chat.rowText"
        >
          <template #item="{ item }">
            <component
              :is="chat.kit.Message.view"
              :kit="chat.kit.Message"
              :row="item"
              :chat="chat"
            />
          </template>
        </component>
        <component :is="chat.kit.Peek.view" ref="peek" :kit="chat.kit.Peek" :chat="chat" />
        <button
          v-if="chat.showsJumpToLatest"
          type="button"
          class="ac-jump"
          @click="chat.jumpToLatest()"
        >
          <span aria-hidden="true">↓</span> Jump to bottom
        </button>
        <div v-if="chat.isLoadingThread" class="ac-loading-thread">
          <span class="ac-spinner" aria-hidden="true"></span> loading the index…
        </div>
      </section>
      <component :is="chat.kit.Sidebar.view" :kit="chat.kit.Sidebar" :chat="chat" />
    </div>

    <component :is="chat.kit.Composer.view" :kit="chat.kit.Composer" :chat="chat" />
  </div>
</template>
