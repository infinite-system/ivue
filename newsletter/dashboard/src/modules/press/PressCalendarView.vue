<script setup lang="ts">
import { PressCalendarModel } from './PressCalendarModel';

const model = new PressCalendarModel.Class();
const {
  // state refs
  monthCursor,
  channelFilter,
  waveFilter,
  pendingOnly,
} = model;
void monthCursor;
</script>

<template>
  <section class="view press" data-view="press">
    <div class="view-head">
      <h1>Press calendar</h1>
      <p class="muted">
        The distribution plan, day by day. Check an entry once you posted
        it — progress is yours alone (this browser), the plan is
        committed data.
      </p>
    </div>

    <div class="statline">
      <span class="stat">
        <strong>{{ model.totalDoneCount }}</strong> / {{ model.totalCount }}
        posted overall
      </span>
      <span class="stat">
        <strong>{{ model.monthDoneCount }}</strong> /
        {{ model.monthTotalCount }} this month
      </span>
      <label class="press-filter">
        <select v-model="channelFilter">
          <option value="">all channels</option>
          <option v-for="channel in model.channels" :key="channel" :value="channel">
            {{ channel }}
          </option>
        </select>
      </label>
      <label class="press-filter">
        <select v-model="waveFilter">
          <option :value="0">both waves</option>
          <option :value="1">wave 1 — Vue launch</option>
          <option :value="2">wave 2 — agents story</option>
        </select>
      </label>
      <label class="press-filter press-pending">
        <input v-model="pendingOnly" type="checkbox" /> pending only
      </label>
      <span class="press-mode">
        <button
          class="ghost"
          :class="{ active: model.isCalendarMode }"
          @click="model.showCalendar()"
        >
          Calendar
        </button>
        <button
          class="ghost"
          :class="{ active: model.isVenuesMode }"
          @click="model.showVenues()"
        >
          Venues
        </button>
      </span>
    </div>

    <div v-if="model.isCalendarMode" class="card press-cal">
      <div class="press-monthbar">
        <button class="ghost" :disabled="!model.hasPriorMonth" @click="model.priorMonth()">
          ‹
        </button>
        <h2>{{ model.monthLabel }}</h2>
        <button class="ghost" :disabled="!model.hasNextMonth" @click="model.nextMonth()">
          ›
        </button>
      </div>

      <div class="press-grid press-grid-head">
        <span v-for="dayName in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="dayName">
          {{ dayName }}
        </span>
      </div>

      <div class="press-grid">
        <div
          v-for="(cell, index) in model.monthCells"
          :key="index"
          class="press-day"
          :class="{ blank: !cell.day }"
        >
          <span v-if="cell.day" class="press-daynum">{{ cell.day }}</span>
          <button
            v-for="entry in cell.entries"
            :key="entry.id"
            class="press-chip"
            :class="[model.entryTone(entry), { open: model.isOpen(entry.id) }]"
            :title="entry.venue + ' — ' + entry.angle"
            @click="model.open(entry.id)"
          >
            <input
              type="checkbox"
              :checked="model.isDone(entry.id)"
              @click.stop="model.toggleDone(entry.id)"
            />
            <span class="press-chip-venue">{{ entry.venue }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="model.isVenuesMode" class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Venue</th>
            <th>Channel</th>
            <th>Posted</th>
            <th>Planned</th>
            <th>Articles posted there</th>
            <th>Last posted</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!model.venueStats.length">
            <td colspan="6" class="empty">No plan entries yet.</td>
          </tr>
          <tr v-for="stat in model.venueStats" :key="stat.venue">
            <td>
              <a :href="stat.url" target="_blank" rel="noreferrer">{{ stat.venue }}</a>
            </td>
            <td>{{ stat.channel }}</td>
            <td>
              <strong>{{ stat.posted }}</strong>
            </td>
            <td>{{ stat.planned }}</td>
            <td class="press-articles">{{ stat.articles.join(', ') || '—' }}</td>
            <td>{{ stat.lastPosted || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="model.isVenuesMode" class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Posted</th>
            <th>Planned</th>
            <th>Venues it went to</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!model.articleStats.length">
            <td colspan="4" class="empty">No plan entries yet.</td>
          </tr>
          <tr v-for="stat in model.articleStats" :key="stat.article">
            <td>{{ stat.article }}</td>
            <td>
              <strong>{{ stat.posted }}</strong>
            </td>
            <td>{{ stat.planned }}</td>
            <td class="press-articles">{{ stat.venues.join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <aside v-if="model.openEntry" class="card press-detail">
      <div class="press-detail-head">
        <h3>{{ model.openEntry.venue }}</h3>
        <button class="ghost" @click="model.closeDetail()">✕</button>
      </div>
      <p class="press-detail-row">
        <a :href="model.openEntry.url" target="_blank" rel="noreferrer">
          {{ model.openEntry.url }}
        </a>
      </p>
      <p class="press-detail-row">
        <strong>{{ model.openEntry.article }}</strong> — {{ model.openEntry.angle }}
      </p>
      <p class="press-detail-row muted">
        {{ model.openEntry.date }} · {{ model.openEntry.channel }} · wave
        {{ model.openEntry.wave }} · ~{{ model.openEntry.effortMin }} min ·
        {{ model.openEntry.lang }}
        <template v-if="model.openEntry.draft">
          · draft: <code>{{ model.openEntry.draft }}</code>
        </template>
      </p>
      <label class="press-detail-done">
        <input
          type="checkbox"
          :checked="model.isDone(model.openEntry.id)"
          @change="model.toggleDone(model.openEntry.id)"
        />
        posted
      </label>
    </aside>
  </section>
</template>
