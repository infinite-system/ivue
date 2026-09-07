<script setup lang="ts">
import { ReleaseCalendarModel } from './ReleaseCalendarModel';

const model = new ReleaseCalendarModel.Class();
const {
  // state refs
  channelFilter,
  waveFilter,
  pendingOnly,
  // element refs
  dialogEl,
} = model;
</script>

<template>
  <section class="view release" data-view="release">
    <div class="view-head">
      <h1>Release calendar</h1>
      <p class="muted">
        Every placement, day by day, with the copy to post inside it. Open
        an entry to read and copy the text, then mark it posted — progress
        is yours alone (this browser); the plan is committed data.
      </p>
    </div>

    <div class="statline release-statline">
      <span class="stat">
        <strong>{{ model.totalDoneCount }}</strong> / {{ model.totalCount }}
        posted overall
      </span>
      <span class="stat">
        <strong>{{ model.monthDoneCount }}</strong> /
        {{ model.monthTotalCount }} this month
      </span>
      <label class="release-filter">
        <span class="visually-hidden">Channel</span>
        <select v-model="channelFilter" aria-label="Channel">
          <option value="">all channels</option>
          <option
            v-for="channel in model.channels"
            :key="channel"
            :value="channel"
          >
            {{ model.channelLabel(channel) }}
          </option>
        </select>
      </label>
      <label class="release-filter">
        <span class="visually-hidden">Wave</span>
        <select v-model="waveFilter" aria-label="Wave">
          <option :value="0">both waves</option>
          <option :value="1">wave 1 — Vue launch</option>
          <option :value="2">wave 2 — agents story</option>
        </select>
      </label>
      <label class="release-filter release-pending">
        <input v-model="pendingOnly" type="checkbox" /> pending only
      </label>
    </div>

    <div class="card release-cal">
      <div class="release-monthbar">
        <button
          class="ghost release-nav"
          aria-label="Previous month"
          :disabled="!model.hasPriorMonth"
          @click="model.priorMonth()"
        >
          ‹
        </button>
        <h2 aria-live="polite">{{ model.monthLabel }}</h2>
        <button
          class="ghost release-nav"
          aria-label="Next month"
          :disabled="!model.hasNextMonth"
          @click="model.nextMonth()"
        >
          ›
        </button>
        <button
          class="ghost release-today"
          :disabled="!model.hasTodayInPlan"
          @click="model.goToToday()"
        >
          Today
        </button>
      </div>

      <div class="release-scroll">
        <div class="release-grid release-grid-head" role="presentation">
          <span v-for="dayName in model.weekdays" :key="dayName">
            {{ dayName }}
          </span>
        </div>

        <div class="release-grid">
          <div
            v-for="(cell, index) in model.monthCells"
            :key="index"
            class="release-day"
            :class="{ blank: !cell.day, today: model.isToday(cell) }"
          >
            <span v-if="cell.day" class="release-daynum">
              {{ cell.day }}
              <span v-if="model.isToday(cell)" class="release-today-tag">
                today
              </span>
            </span>
            <article
              v-for="entry in cell.entries"
              :key="entry.id"
              class="release-card"
              :class="[model.entryTone(entry), { open: model.isOpen(entry.id) }]"
            >
              <input
                type="checkbox"
                class="release-card-check"
                :checked="model.isDone(entry.id)"
                :aria-label="model.doneAriaLabel(entry)"
                @change="model.toggleDone(entry.id)"
              />
              <button
                class="release-card-open"
                :aria-label="model.openAriaLabel(entry)"
                @click="model.open(entry.id, $event)"
              >
                <span class="release-card-venue">{{ entry.venue }}</span>
                <span class="release-card-angle">{{ entry.angle }}</span>
                <span class="release-card-meta">
                  <span class="release-pill">
                    {{ model.channelLabel(entry.channel) }}
                  </span>
                  <span class="release-card-effort">
                    {{ model.effortLabel(entry) }}
                  </span>
                </span>
              </button>
            </article>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="model.openEntry"
      class="dialog-backdrop"
      @click.self="model.closeDetail()"
    >
      <div
        ref="dialogEl"
        class="dialog card release-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-dialog-title"
        tabindex="-1"
        @keydown="model.onDialogKeydown($event)"
      >
        <header class="dialog-head release-dialog-head">
          <div class="release-dialog-title">
            <p class="release-dialog-date">
              {{ model.dateLabel(model.openEntry) }}
            </p>
            <h2 id="release-dialog-title">{{ model.openEntry.venue }}</h2>
            <a
              class="release-dialog-url"
              :href="model.openEntry.url"
              target="_blank"
              rel="noreferrer"
            >
              {{ model.openEntry.url }}
            </a>
          </div>
          <button
            class="ghost"
            aria-label="Close"
            @click="model.closeDetail()"
          >
            ✕
          </button>
        </header>

        <p class="release-dialog-angle">{{ model.openEntry.angle }}</p>

        <ul class="release-dialog-meta" aria-label="Entry details">
          <li
            class="release-pill"
            :class="model.channelTone(model.openEntry)"
          >
            {{ model.channelLabel(model.openEntry.channel) }}
          </li>
          <li v-if="model.hasArticle(model.openEntry)" class="release-pill">
            {{ model.openEntry.article }}
          </li>
          <li class="release-pill">{{ model.waveLabel(model.openEntry) }}</li>
          <li class="release-pill">~{{ model.effortLabel(model.openEntry) }}</li>
          <li class="release-pill">{{ model.openEntry.lang }}</li>
        </ul>

        <section v-if="model.openDrafts.length" class="release-copy">
          <nav
            v-if="model.hasDraftTabs"
            class="dialog-tabs"
            aria-label="Copy to post"
          >
            <button
              v-for="draft in model.openDrafts"
              :key="draft.key"
              class="dialog-tab"
              :class="{ active: model.isDraftActive(draft.key) }"
              @click="model.showDraft(draft.key)"
            >
              {{ draft.title }}
            </button>
          </nav>

          <div v-if="model.activeDraft" class="dialog-pane release-draft">
            <div class="release-draft-head">
              <div>
                <h3>{{ model.activeDraft.title }}</h3>
                <p v-if="model.activeDraft.subtitle" class="muted">
                  {{ model.activeDraft.subtitle }}
                </p>
              </div>
              <button
                class="primary release-copy-btn"
                :class="{ copied: model.isCopied(model.activeDraft.key) }"
                @click="model.copyDraft(model.activeDraft)"
              >
                {{ model.copyLabel(model.activeDraft.key) }}
              </button>
            </div>

            <ol
              v-if="model.activeDraft.segments"
              class="release-segments"
              aria-label="Thread segments"
            >
              <li
                v-for="(segment, index) in model.activeDraft.segments"
                :key="index"
                class="release-segment"
              >
                <div class="release-segment-head">
                  <span class="muted">
                    {{ model.segmentLabel(index, model.activeDraft.segments.length) }}
                  </span>
                  <button
                    class="ghost release-copy-btn"
                    :class="{
                      copied: model.isCopied(model.segmentKey(model.activeDraft, index)),
                    }"
                    @click="model.copySegment(model.activeDraft, index)"
                  >
                    {{ model.copyLabel(model.segmentKey(model.activeDraft, index)) }}
                  </button>
                </div>
                <pre class="release-text">{{ segment }}</pre>
              </li>
            </ol>
            <pre v-else class="release-text">{{ model.activeDraft.body }}</pre>

            <p class="release-draft-source muted">
              Source: <code>{{ model.activeDraft.source }}</code>
            </p>
          </div>
        </section>
        <p v-else class="release-copy-empty muted">
          No copy prepared for this entry yet — the angle above is the
          brief.
        </p>

        <footer class="release-dialog-foot">
          <label class="release-dialog-done">
            <input
              type="checkbox"
              :checked="model.openEntryIsDone"
              @change="model.toggleOpenDone()"
            />
            {{ model.openEntryDoneLabel }}
          </label>
          <button class="ghost" @click="model.closeDetail()">Close</button>
        </footer>
      </div>
    </div>
  </section>
</template>
