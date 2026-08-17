<script setup lang="ts">
import { StatsModel } from './StatsModel';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';

const app = AppStore.use();

const model = new StatsModel.Class();
const {
  // state refs
  stats,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="stats">
    <div class="view-head">
      <h1>Stats</h1>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <template v-else-if="stats">
      <div class="statline">
        <span v-for="entry in stats.lists" :key="entry.list" class="stat">
          <strong>{{ entry.active }}</strong> active / {{ entry.members }} on
          <span class="pill">{{ entry.list }}</span>
        </span>
        <span class="stat"><strong>{{ stats.totalSends }}</strong> emails sent</span>
      </div>

      <div class="stats-layout">
        <div class="card">
          <h2>Signups — last 60 days</h2>
          <p v-if="!stats.signups.length" class="muted">No signups yet.</p>
          <div v-else class="bars">
            <div
              v-for="day in stats.signups"
              :key="day.day"
              class="bar-row"
            >
              <span class="bar-label">{{ day.day }}</span>
              <span
                class="bar"
                :style="{ width: model.signupBarWidth(day) }"
              ></span>
              <span class="bar-count">{{ day.count }}</span>
            </div>
          </div>
        </div>

        <div class="table-scroll card">
          <h2>Sends per post</h2>
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Sent</th>
                <th>Last sent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!stats.perPost.length">
                <td colspan="3" class="muted">Nothing sent yet.</td>
              </tr>
              <tr v-for="entry in stats.perPost" :key="entry.slug">
                <td>
                  <button
                    class="linklike slug"
                    @click="app.openEmailPreview(entry.slug)"
                  >
                    {{ entry.slug }}
                  </button>
                </td>
                <td>{{ entry.sendCount }}</td>
                <td>{{ Format.Class.dateTime(entry.lastSentAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>
