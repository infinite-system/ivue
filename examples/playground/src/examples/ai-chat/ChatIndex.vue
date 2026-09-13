<script setup lang="ts">
import { Index } from './Index';

const props = defineProps<Index.Props>();

const model = new ((props.kit?.namespace?.Class as typeof Index.Class | undefined) ?? Index.Class)(
  props
);
const {
  // state refs
  tools,
  order,
  query,
  exportForm,
  // computed refs
  rows,
  // element refs
  scroller,
  searchElement
} = model;
</script>

<template>
  <section class="ac-index" tabindex="0" @keydown="model.onKeydown($event)">
    <header class="ac-index-head">
      <div class="ac-index-title">
        <strong>Index</strong>
        <span class="ac-muted">{{ model.countLabel }}</span>
        <button type="button" class="ac-close" title="Close" @click="chat.closeSidebar()">
          <svg class="ac-close-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="model.closeIcon" />
          </svg>
        </button>
      </div>
      <div class="ac-index-filters">
        <div class="ac-seg" role="group" aria-label="Speaker">
          <button
            v-for="option in model.speakerOptions"
            :key="option.value"
            type="button"
            :class="{ 'ac-on': model.isSpeaker(option.value) }"
            @click="model.setSpeaker(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <span class="ac-pick-wrap">
          <select
            class="ac-pick"
            aria-label="Tool calls"
            :value="tools"
            @change="model.onToolsPick($event)"
          >
            <option v-for="option in model.toolOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <svg class="ac-pick-caret" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="model.caretIcon" />
          </svg>
        </span>
        <span class="ac-pick-wrap ac-pick-order">
          <select
            class="ac-pick"
            aria-label="Order"
            :value="order"
            @change="model.onOrderPick($event)"
          >
            <option v-for="option in model.orderOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <svg class="ac-pick-caret" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="model.caretIcon" />
          </svg>
        </span>
      </div>
      <div class="ac-index-search">
        <svg class="ac-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.searchIcon" />
        </svg>
        <input
          ref="searchElement"
          v-model="query"
          type="search"
          class="ac-search"
          placeholder="Search messages…"
          aria-label="Search messages"
        />
        <button v-if="query" type="button" class="ac-link" @click="model.clearQuery()">
          clear
        </button>
      </div>
      <div class="ac-index-select">
        <label class="ac-check-all">
          <input
            type="checkbox"
            class="ac-check"
            :checked="model.allShownSelected"
            @change="model.toggleAllShown()"
          />
          <span>{{ model.selectAllLabel }}</span>
        </label>
        <span class="ac-muted">{{ model.selectedLabel }}</span>
        <button
          v-if="model.hasSelection"
          type="button"
          class="ac-link"
          @click="model.clearSelection()"
        >
          clear
        </button>
      </div>
      <div class="ac-peek-head ac-index-pos">
        <span class="ac-peek-pos">{{ model.positionLabel }}</span>
        <span class="ac-peek-match">{{ model.matchLabel }}</span>
        <span class="ac-peek-when">
          <span class="ac-peek-date">{{ model.dateLabel }}</span>
          <span class="ac-peek-pct">{{ model.percentLabel }}</span>
        </span>
      </div>
    </header>

    <div class="ac-index-list" @pointerleave="model.onListLeave()">
      <component
        :is="model.kit.Scroller.view"
        ref="scroller"
        :kit="model.kit.Scroller"
        scrollbar
        :model-value="rows"
        :assumed-size="46"
        :padding-quantity="10"
        :selection-text="model.rowText"
      >
        <template #item="{ item }">
          <div
            class="ac-ix-row"
            :class="model.rowClass(item)"
            @pointerenter="model.onRowEnter(item)"
            @click="model.onRowClick(item, $event)"
            @dblclick="model.onRowDoubleClick(item)"
          >
            <input
              type="checkbox"
              class="ac-ix-check ac-check"
              :checked="model.isSelected(item)"
              @click="model.onRowCheck(item, $event)"
            />
            <span class="ac-ix-role" :class="model.speakerClass(item)">{{
              model.speakerMark(item)
            }}</span>
            <span class="ac-ix-text">{{ model.previewText(item) }}</span>
            <span v-if="model.hasTools(item)" class="ac-ix-tools" :title="model.toolsLabel(item)">
              <span>{{ model.toolsCount(item) }}</span>
              <svg class="ac-ix-wrench" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="model.wrenchIcon" />
              </svg>
            </span>
            <span class="ac-ix-time">{{ model.timeLabel(item) }}</span>
            <button
              type="button"
              class="ac-ix-go ac-go"
              title="Show in the chat"
              @click.stop="model.seek(item)"
            >
              <svg class="ac-go-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="model.jumpIcon" />
              </svg>
            </button>
          </div>
        </template>
      </component>
    </div>

    <footer class="ac-index-foot">
      <span class="ac-pick-wrap">
        <select v-model="exportForm" class="ac-pick" aria-label="Export form">
          <option v-for="option in model.exportOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <svg class="ac-pick-caret" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.caretIcon" />
        </svg>
      </span>
      <button
        type="button"
        class="ac-pill ac-pill-primary"
        :disabled="!model.hasSelection"
        :title="model.exportTitle"
        @click="model.download()"
      >
        <svg class="ac-pill-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.downloadIcon" />
        </svg>
        <span>{{ model.exportLabel }}</span>
      </button>
      <button
        type="button"
        class="ac-pill"
        :disabled="!model.hasSelection"
        title="Copy the selection as Markdown"
        @click="model.copyMarkdown()"
      >
        <svg class="ac-pill-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.copyIcon" />
        </svg>
        <span>{{ model.copyLabel }}</span>
      </button>
    </footer>
  </section>
</template>
