<script setup lang="ts">
import { SendModel } from './SendModel';
import type { AppModel } from '../app/AppModel';

const props = defineProps<{ app: AppModel.Instance }>();

const model = new SendModel.Class(props.app);
const {
  // state refs
  posts,
  lists,
  slug,
  recipientsText,
  force,
  sending,
  result,
  broadcastList,
  broadcastArmed,
  dripArmed,
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
        <button class="primary" type="submit" :disabled="!model.canSend || sending">
          {{ sending ? 'Sending…' : `Send to ${model.recipients.length || '…'}` }}
        </button>

        <div v-if="result" class="send-result" data-role="send-result">
          <p>
            Delivered <strong>{{ result.delivered }}</strong>
            <template v-if="result.skippedAsRepeat.length">
              · skipped as repeat: {{ result.skippedAsRepeat.join(', ') }}
            </template>
          </p>
          <ul>
            <li
              v-for="outcome in result.outcomes"
              :key="outcome.email"
              :class="outcome.errorCode === 0 ? 'status on' : 'status off'"
            >
              {{ outcome.email }} — {{ outcome.errorCode === 0 ? 'accepted' : outcome.message }}
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
          :disabled="!slug"
          @click="model.confirmBroadcast()"
        >
          {{ broadcastArmed ? 'Really broadcast — click again' : 'Broadcast' }}
        </button>

        <hr />

        <p class="muted">
          Run the cron's drip pass now — each due subscriber gets their
          oldest unsent post.
        </p>
        <button class="danger" @click="model.confirmDrip()">
          {{ dripArmed ? 'Really run drip — click again' : 'Run drip pass' }}
        </button>
        <button
          v-if="broadcastArmed || dripArmed"
          class="ghost"
          @click="model.disarm()"
        >
          Cancel
        </button>
      </div>
    </div>
  </section>
</template>
