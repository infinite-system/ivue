<script setup lang="ts">
import { DripModel } from './DripModel';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';

const app = AppStore.use();

const model = new DripModel.Class();
const {
  // state refs
  entries,
  cadenceHours,
  cadenceDraft,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="drip">
    <div class="view-head">
      <h1>Drip preview</h1>
      <p class="muted">
        The exact plan the next cron tick executes — same code path.
        Cadence: one email per subscriber per {{ cadenceHours }}h.
      </p>
    </div>

    <div class="statline">
      <span class="stat"><strong>{{ model.dueNowCount }}</strong> due now</span>
      <span class="stat">
        <strong>{{ model.caughtUpCount }}</strong> fully caught up
      </span>
      <form class="stat cadence" @submit.prevent="model.saveCadence()">
        <label for="cadence-hours">cadence</label>
        <input
          id="cadence-hours"
          v-model="cadenceDraft"
          type="number"
          min="1"
          max="720"
          aria-label="Cadence in hours"
        />
        <span>h</span>
        <button
          class="primary"
          type="submit"
          :disabled="model.cadenceSaveDisabled"
        >
          Save
        </button>
      </form>
      <button class="ghost" @click="model.load()">Refresh</button>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Subscriber</th>
            <th>Received</th>
            <th>Next post</th>
            <th>Last email</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="placeholder in 5" :key="placeholder">
              <td colspan="5"><span class="skeleton"></span></td>
            </tr>
          </template>
          <tr v-else-if="!entries.length">
            <td colspan="5" class="empty">No active subscribers.</td>
          </tr>
          <tr v-for="entry in entries" v-else :key="entry.email">
            <td>{{ entry.email }}</td>
            <td>{{ entry.sentCount }}</td>
            <td>
              <button
                v-if="entry.nextSlug"
                class="linklike slug"
                @click="app.openEmailPreview(entry.nextSlug)"
              >
                {{ entry.nextSlug }}
              </button>
              <span v-else class="muted">caught up</span>
            </td>
            <td>{{ Format.Class.dateTime(entry.lastSentAt) }}</td>
            <td>
              <span v-if="entry.sendNow" class="status on">send now</span>
              <span v-else-if="entry.nextSlug" class="muted">
                {{ Format.Class.relativeDue(entry.dueAt) }}
              </span>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
