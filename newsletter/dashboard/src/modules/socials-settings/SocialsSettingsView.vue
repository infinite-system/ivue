<script setup lang="ts">
import { SocialsSettingsModel } from './SocialsSettingsModel';

const model = new SocialsSettingsModel.Class();
const {
  // state refs
  templateDraft,
  contentTemplateDraft,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="socials-settings">
    <div class="view-head">
      <h1>Socials settings</h1>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else class="settings-layout">
      <form class="card send-form" @submit.prevent="model.saveTemplates()">
        <h2>Tweet templates</h2>
        <p class="muted">
          Prefill the composer when a post is picked —
          <span class="slug">{title}</span>,
          <span class="slug">{description}</span> and
          <span class="slug">{url}</span> come from the post.
        </p>
        <label for="tweet-template">Link mode (X renders the page's card)</label>
        <textarea id="tweet-template" v-model="templateDraft" rows="3"></textarea>
        <label for="tweet-content-template">
          Content mode (banner uploaded natively)
        </label>
        <textarea
          id="tweet-content-template"
          v-model="contentTemplateDraft"
          rows="3"
        ></textarea>
        <button class="primary" type="submit" :disabled="model.saveDisabled">
          Save
        </button>
      </form>

      <div class="card send-form">
        <h2>X credentials</h2>
        <p v-if="model.xConfigured" class="status on">
          configured — posting is live
        </p>
        <template v-else>
          <p class="status off">not configured</p>
          <p class="muted">
            Create an app at developer.x.com (free tier, Read + Write),
            generate the four credentials, then from
            <span class="slug">newsletter/</span>:
          </p>
          <pre class="x-runbook">npx wrangler@4.120.1 secret put X_API_KEY
npx wrangler@4.120.1 secret put X_API_SECRET
npx wrangler@4.120.1 secret put X_ACCESS_TOKEN
npx wrangler@4.120.1 secret put X_ACCESS_SECRET</pre>
          <p class="muted">
            Posting activates on the next request — no deploy needed.
          </p>
        </template>
      </div>
    </div>
  </section>
</template>
