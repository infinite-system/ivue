<script setup lang="ts">
import type { Kit } from '../../kit/Kit';
import { Chat } from './Chat';
import './ai-chat.css';

const props = defineProps<{ dark?: boolean; kit?: Kit.Entry }>();

// the root constructs the class it was handed, or its own
const chat = new ((props.kit?.namespace.Class as typeof Chat.Class | undefined) ?? Chat.Class)();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  rows,
  indexOpen,
  error,
  // element refs
  scroller,
} = chat;
</script>

<template>
  <div class="ai-chat" :class="{ 'ac-dark': dark, 'ac-index-open': indexOpen }">
    <header class="ac-top">
      <div class="ac-top-title">
        <strong>AI chat on the virtual scroller</strong>
        <span class="ac-muted">{{ chat.sourceLabel }}</span>
      </div>
      <dl class="ac-receipts">
        <div><dt>messages</dt><dd>{{ chat.countLabel }}</dd></div>
        <div><dt>rows in the DOM</dt><dd class="ac-grad">{{ chat.domRowCount }}</dd></div>
        <div><dt>loaded</dt><dd>{{ chat.loadedLabel }}</dd></div>
        <div><dt>pages</dt><dd>{{ chat.pagesLabel }}</dd></div>
        <div><dt>fetched</dt><dd>{{ chat.bytesLabel }} <span class="ac-muted">of {{ chat.totalBytesLabel }}</span></dd></div>
        <div><dt>requests</dt><dd>{{ chat.requestCountLabel }}</dd></div>
        <div><dt>tokens streamed</dt><dd>{{ chat.tokensLabel }}</dd></div>
      </dl>
      <div class="ac-top-actions">
        <span v-if="chat.isFetching" class="ac-fetching"><span class="ac-spinner" aria-hidden="true"></span> {{ chat.fetchingLabel }}</span>
        <span v-else-if="chat.lastRequestLabel" class="ac-muted ac-last">{{ chat.lastRequestLabel }}</span>
        <label class="ac-btn" :class="{ 'ac-busy': chat.isLoadingFile }">
          {{ chat.fileLoadLabel }}
          <input type="file" accept=".jsonl,application/jsonl,text/plain" hidden @change="chat.open(($event.target as HTMLInputElement).files![0])" />
        </label>
        <button type="button" class="ac-btn" :class="{ 'ac-on': indexOpen }" @click="chat.toggleIndex()">{{ chat.indexToggleLabel }}</button>
      </div>
    </header>

    <p v-if="error" class="ac-error">{{ error }}</p>

    <div class="ac-main">
      <section class="ac-thread">
        <component :is="chat.kit.Scroller.vue" ref="scroller" :kit="chat.kit.Scroller" scrollbar :auto-repeat="false" v-model="rows" :assumed-size="96" :padding-quantity="6" :selection-text="chat.rowText">
          <template #item="{ item }">
            <component :is="chat.kit.Message.vue" :kit="chat.kit.Message" :row="item" :chat="chat" />
          </template>
        </component>
        <button v-if="chat.showsJumpToLatest" type="button" class="ac-jump" @click="chat.jumpToLatest()">↓ latest</button>
        <div v-if="chat.isLoadingThread" class="ac-loading-thread"><span class="ac-spinner" aria-hidden="true"></span> loading the index…</div>
      </section>
      <component :is="chat.kit.Index.vue" v-if="indexOpen" :kit="chat.kit.Index" :chat="chat" />
    </div>

    <component :is="chat.kit.Composer.vue" :kit="chat.kit.Composer" :chat="chat" />
  </div>
</template>
