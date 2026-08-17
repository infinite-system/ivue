<script setup lang="ts">
import { DripModel } from './DripModel';
import { Format } from '../platform/Format';
import type { AppModel } from '../app/AppModel';

const props = defineProps<{ app: AppModel.Instance }>();

const model = new DripModel.Class(props.app);
const {
  // state refs
  entries,
  cadenceHours,
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
          <tr v-if="loading">
            <td colspan="5" class="muted">Loading…</td>
          </tr>
          <tr v-else-if="!entries.length">
            <td colspan="5" class="muted">No active subscribers.</td>
          </tr>
          <tr v-for="entry in entries" v-else :key="entry.email">
            <td>{{ entry.email }}</td>
            <td>{{ entry.sentCount }}</td>
            <td>
              <span v-if="entry.nextSlug" class="slug">{{ entry.nextSlug }}</span>
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
