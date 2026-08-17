<script setup lang="ts">
import { PostsModel } from './PostsModel';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';

const app = AppStore.use();
const model = new PostsModel.Class();
const {
  // state refs
  posts,
  loading,
  previewHtml,
  previewLoading,
} = model;
</script>

<template>
  <section class="view" data-view="posts">
    <div class="view-head">
      <h1>Posts <span class="count">{{ posts.length }}</span></h1>
      <p class="muted">
        Email bodies are rendered at site build time — this preview is the
        exact html a subscriber receives.
      </p>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else class="posts-layout">
      <div class="table-scroll card posts-list">
        <table>
          <thead>
            <tr>
              <th>Post</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="post in posts"
              :key="post.slug"
              :class="{ active: post.slug === model.previewSlug }"
            >
              <td>
                <div class="post-title">{{ post.title }}</div>
                <div class="muted">{{ post.slug }}</div>
              </td>
              <td>{{ Format.Class.date(post.timestamp) }}</td>
              <td>
                <button class="primary" @click="app.openEmailPreview(post.slug)">
                  Preview
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="model.previewSlug" class="preview card">
        <header class="drawer-head">
          <h2>{{ model.previewSlug }}</h2>
          <button class="ghost" @click="app.closeEmailPreview()">Close</button>
        </header>
        <p v-if="previewLoading" class="muted">Rendering…</p>
        <iframe
          v-else
          class="preview-frame"
          :srcdoc="previewHtml"
          sandbox=""
          title="Email preview"
        ></iframe>
      </div>
    </div>
  </section>
</template>
