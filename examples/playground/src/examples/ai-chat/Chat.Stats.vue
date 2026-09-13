<script setup lang="ts">
import type { Chat } from './Chat';

// The receipts, above the thread: what the page holds, what it fetched, what it streamed — and
// the way to open a session of your own. Markup only, over the chat model.
defineProps<Chat.SectionProps>();
</script>

<template>
  <header class="ac-stats">
    <dl class="ac-receipts">
      <div>
        <dt>messages</dt>
        <dd>{{ model.countLabel }}</dd>
      </div>
      <div>
        <dt>rows in the DOM</dt>
        <dd class="ac-grad">{{ model.domRowCount }}</dd>
      </div>
      <div>
        <dt>loaded</dt>
        <dd>{{ model.loadedLabel }}</dd>
      </div>
      <div>
        <dt>pages</dt>
        <dd :title="model.fetchingLabel">
          <span
            class="ac-spinner ac-spinner-soft ac-pages-spinner"
            :class="{ 'ac-idle': !model.isFetching }"
            aria-hidden="true"
          ></span
          >{{ model.pagesLabel }}
        </dd>
      </div>
      <div>
        <dt>fetched</dt>
        <dd>
          {{ model.bytesLabel }} <span class="ac-muted">of {{ model.totalBytesLabel }}</span>
        </dd>
      </div>
      <div>
        <dt>requests</dt>
        <dd>{{ model.requestCountLabel }}</dd>
      </div>
      <div>
        <dt>tokens streamed</dt>
        <dd>{{ model.tokensLabel }}</dd>
      </div>
    </dl>
    <div class="ac-stats-actions">
      <label class="ac-btn" :class="{ 'ac-busy': model.isLoadingFile }">
        {{ model.fileLoadLabel }}
        <input
          type="file"
          accept=".jsonl,application/jsonl,text/plain"
          hidden
          @change="model.open(($event.target as HTMLInputElement).files![0])"
        />
      </label>
    </div>
  </header>
</template>
