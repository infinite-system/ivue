<script setup lang="ts">
import { SendModel } from './SendModel';
import { Format } from '../platform/Format';

const model = new SendModel.Class();
const {
  // state refs
  posts,
  lists,
  slug,
  recipientsText,
  force,
  result,
  broadcastList,
  scheduleAt,
  scheduledJobs,
} = model;
</script>

<template>
  <section class="view" data-view="send">
    <div class="view-head">
      <h1>Send</h1>
      <p class="muted">
        Every path writes the same ledger: one email per subscriber per
        post, ever. Force explicitly erases a ledger row to allow a repeat.
      </p>
    </div>

    <div class="send-layout">
      <form class="card send-form" @submit.prevent="model.sendTargeted()">
        <h2>Targeted send</h2>
        <label for="send-slug">Post</label>
        <select id="send-slug" v-model="slug" required>
          <option value="" disabled>Choose a post…</option>
          <option v-for="post in posts" :key="post.slug" :value="post.slug">
            {{ post.title }}
          </option>
        </select>
        <label for="send-recipients">Recipients (comma / newline separated)</label>
        <textarea
          id="send-recipients"
          v-model="recipientsText"
          rows="4"
          placeholder="someone@example.com"
        ></textarea>
        <label class="checkline">
          <input v-model="force" type="checkbox" />
          Force — erase the ledger rows first so a repeat is allowed
        </label>
        <button class="primary" type="submit" :disabled="model.sendDisabled">
          {{ model.sendButtonLabel }}
        </button>

        <div v-if="result" class="send-result" data-role="send-result">
          <p>
            Delivered <strong>{{ result.delivered }}</strong>
            <template v-if="model.skippedSummary">
              · skipped as repeat: {{ model.skippedSummary }}
            </template>
          </p>
          <ul>
            <li
              v-for="outcome in result.outcomes"
              :key="outcome.email"
              class="status"
              :class="{
                on: model.outcomeAccepted(outcome),
                off: !model.outcomeAccepted(outcome),
              }"
            >
              {{ outcome.email }} — {{ model.outcomeLabel(outcome) }}
            </li>
          </ul>
        </div>
      </form>

      <div class="card send-form">
        <h2>Whole-list operations</h2>
        <label for="broadcast-list">Broadcast the selected post to</label>
        <select id="broadcast-list" v-model="broadcastList">
          <option v-for="entry in lists" :key="entry.list" :value="entry.list">
            {{ entry.list }} ({{ entry.active }} active)
          </option>
        </select>
        <button
          class="danger"
          :disabled="model.broadcastDisabled"
          @click="model.confirmBroadcast()"
        >
          {{ model.broadcastButtonLabel }}
        </button>

        <hr />

        <p class="muted">
          Run the cron's drip pass now — each due subscriber gets their
          oldest unsent post.
        </p>
        <button class="danger" @click="model.confirmDrip()">
          {{ model.dripButtonLabel }}
        </button>
        <button v-if="model.anyActionArmed" class="ghost" @click="model.disarm()">
          Cancel
        </button>

        <hr />

        <h2>Schedule the broadcast</h2>
        <p class="muted">
          Sends the selected post to the list at the chosen time (your
          timezone). Cancellable until it runs.
        </p>
        <label for="broadcast-schedule-at">When</label>
        <input
          id="broadcast-schedule-at"
          v-model="scheduleAt"
          type="datetime-local"
        />
        <button
          class="primary"
          :disabled="!model.canSchedule"
          @click="model.scheduleBroadcast()"
        >
          Schedule broadcast
        </button>

        <ul v-if="scheduledJobs.length" class="job-queue">
          <li v-for="job in scheduledJobs" :key="job.id">
            <span class="slug">{{ job.payload.slug }}</span>
            <span class="muted">→ {{ job.payload.list }},
              {{ Format.Class.dateTime(job.dueAt) }}</span>
            <button class="ghost" @click="model.cancelJob(job.id)">
              Cancel
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
