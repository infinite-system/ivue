<script setup lang="ts">
import { XComposeModel } from './XComposeModel';
import { Format } from '../platform/Format';

const model = new XComposeModel.Class();
const {
  // state refs
  posts,
  slug,
  draft,
  mode,
  xConfigured,
  postedUrl,
  tweetLog,
  scheduleAt,
  scheduledJobs,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="x">
    <div class="view-head">
      <h1>Post to X</h1>
      <p class="muted">
        Pick a post — the template prefills the draft. Links weigh 23
        characters, the way X counts them.
      </p>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else class="send-layout">
      <form class="card send-form" @submit.prevent="model.confirmPost()">
        <h2>Compose</h2>
        <div v-if="!xConfigured" class="x-pending">
          X credentials are not set yet — the composer works, posting
          activates once the four <span class="slug">X_*</span> secrets
          exist (see Socials → Settings).
        </div>
        <label for="x-post-picker">Blog post</label>
        <select
          id="x-post-picker"
          v-model="slug"
          @change="model.pickPost(slug)"
        >
          <option value="" disabled>Choose a post…</option>
          <option v-for="post in posts" :key="post.slug" :value="post.slug">
            {{ post.title }}
          </option>
        </select>
        <div class="mode-toggle" role="radiogroup" aria-label="Post style">
          <label class="checkline">
            <input
              type="radio"
              value="link"
              :checked="mode === 'link'"
              @change="model.setMode('link')"
            />
            Link — X renders the post's card from the page
          </label>
          <label class="checkline">
            <input
              type="radio"
              value="content"
              :checked="mode === 'content'"
              @change="model.setMode('content')"
            />
            Content — article substance + banner uploaded natively
          </label>
        </div>
        <img
          v-if="model.bannerUrl"
          class="banner-preview"
          :src="model.bannerUrl"
          alt="Post banner (will be attached)"
        />
        <label for="x-draft">Draft</label>
        <textarea id="x-draft" v-model="draft" rows="5"></textarea>
        <p class="muted counter" :class="{ error: model.overLimit }">
          {{ model.remaining }} characters left
        </p>
        <button class="primary" type="submit" :disabled="!model.canPost">
          {{ model.postButtonLabel }}
        </button>
        <button
          v-if="model.postArmed"
          class="ghost"
          type="button"
          @click="model.disarm()"
        >
          Cancel
        </button>
        <p v-if="postedUrl" class="status on posted-link">
          Posted — <a :href="postedUrl" target="_blank" rel="noopener">view on X</a>
        </p>

        <hr />

        <h2>Schedule instead</h2>
        <label for="x-schedule-at">When (your timezone)</label>
        <input id="x-schedule-at" v-model="scheduleAt" type="datetime-local" />
        <button
          class="primary"
          type="button"
          :disabled="!model.canSchedule"
          @click="model.scheduleTweet()"
        >
          Schedule post
        </button>

        <ul v-if="scheduledJobs.length" class="job-queue">
          <li v-for="job in scheduledJobs" :key="job.id">
            <span class="tweet-text">{{ job.payload.text }}</span>
            <span class="muted">{{ Format.Class.dateTime(job.dueAt) }}</span>
            <button class="ghost" type="button" @click="model.cancelJob(job.id)">
              Cancel
            </button>
          </li>
        </ul>
      </form>

      <div class="table-scroll card">
        <h2>Posted</h2>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Tweet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!tweetLog.length">
              <td colspan="2" class="empty">Nothing posted yet.</td>
            </tr>
            <tr v-for="tweet in tweetLog" :key="tweet.tweetId">
              <td>{{ Format.Class.dateTime(tweet.postedAt) }}</td>
              <td class="tweet-text">
                <a
                  class="linklike"
                  :href="`https://x.com/i/status/${tweet.tweetId}`"
                  target="_blank"
                  rel="noopener"
                >
                  {{ tweet.text }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
