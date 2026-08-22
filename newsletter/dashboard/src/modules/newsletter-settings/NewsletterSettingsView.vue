<script setup lang="ts">
import { NewsletterSettingsModel } from './NewsletterSettingsModel';

const model = new NewsletterSettingsModel.Class();
const {
  // state refs
  settings,
  lists,
  cadenceDaysDraft,
  sendHourDraft,
  defaultTimezoneDraft,
  listCadenceDrafts,
  listSendHourDrafts,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="newsletter-settings">
    <div class="view-head">
      <h1>Newsletter settings</h1>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else-if="settings" class="settings-layout">
      <form class="card send-form" @submit.prevent="model.saveSchedule()">
        <h2>Drip schedule</h2>
        <p class="muted">
          Stored in the Worker's database — effective on the very next
          hourly pass, no deploy involved.
        </p>

        <label for="settings-cadence">Cadence (days between emails, 1–30)</label>
        <input
          id="settings-cadence"
          v-model="cadenceDaysDraft"
          type="number"
          min="1"
          max="30"
        />

        <label for="settings-send-hour">Send hour (0–23, subscriber's local time)</label>
        <input
          id="settings-send-hour"
          v-model="sendHourDraft"
          type="number"
          min="0"
          max="23"
        />

        <label for="settings-default-timezone">
          Default timezone (for subscribers with no captured zone)
        </label>
        <input
          id="settings-default-timezone"
          v-model="defaultTimezoneDraft"
          placeholder="America/Toronto"
        />

        <p v-if="model.scheduleSummary" class="muted">
          {{ model.scheduleSummary }}
        </p>

        <h2>Per-list overrides</h2>
        <p class="muted">
          Blank inherits the defaults above — set a value to give a list
          its own clock.
        </p>
        <table class="list-schedule">
          <thead>
            <tr>
              <th>List</th>
              <th>Cadence (days)</th>
              <th>Send hour</th>
              <th>Effective</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in lists" :key="entry.list">
              <td><span class="pill">{{ entry.list }}</span></td>
              <td>
                <input
                  v-model="listCadenceDrafts[entry.list]"
                  type="number"
                  min="1"
                  max="30"
                  placeholder="inherit"
                  :aria-label="`Cadence for ${entry.list}`"
                />
              </td>
              <td>
                <input
                  v-model="listSendHourDrafts[entry.list]"
                  type="number"
                  min="0"
                  max="23"
                  placeholder="inherit"
                  :aria-label="`Send hour for ${entry.list}`"
                />
              </td>
              <td class="muted">
                every {{ model.effectiveCadence(entry.list) }}d ·
                {{ model.effectiveSendHour(entry.list) }} local
              </td>
            </tr>
          </tbody>
        </table>

        <button class="primary" type="submit" :disabled="model.saveDisabled">
          {{ model.saveButtonLabel }}
        </button>
      </form>

      <div class="card send-form">
        <h2>Sender identity</h2>
        <p class="muted">
          Configured in <span class="slug">wrangler.jsonc</span> — shown here
          so the whole posture reads in one place.
        </p>
        <dl class="settings-facts">
          <dt>From</dt>
          <dd>{{ settings.sender.senderName }} &lt;{{ settings.sender.senderEmail }}&gt;</dd>
          <dt>Reply-to</dt>
          <dd>{{ settings.sender.replyTo }}</dd>
          <dt>Signup pings</dt>
          <dd>{{ settings.sender.notifyEmail }}</dd>
          <dt>Postmark stream</dt>
          <dd>{{ settings.sender.postmarkStream }}</dd>
          <dt>Default list</dt>
          <dd>{{ settings.sender.defaultList }}</dd>
        </dl>
      </div>
    </div>
  </section>
</template>
