<script setup lang="ts">
import { NewsletterSettingsModel } from './NewsletterSettingsModel';

const model = new NewsletterSettingsModel.Class();
const {
  // state refs
  settings,
  cadenceDraft,
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
      <form class="card send-form" @submit.prevent="model.saveCadence()">
        <h2>Drip cadence</h2>
        <p class="muted">
          Minimum hours between two emails to the same subscriber. Stored in
          the Worker's database — effective on the very next drip pass, no
          deploy involved.
        </p>
        <label for="settings-cadence">Cadence (hours, 1–720)</label>
        <input
          id="settings-cadence"
          v-model="cadenceDraft"
          type="number"
          min="1"
          max="720"
        />
        <button class="primary" type="submit" :disabled="model.saveDisabled">
          Save
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
          <dt>Drip list</dt>
          <dd>{{ settings.sender.defaultList }}</dd>
        </dl>
      </div>
    </div>
  </section>
</template>
