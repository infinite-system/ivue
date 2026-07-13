<script setup lang="ts">
import MediaField from './MediaField.vue';
import ExtendedMediaField from './ExtendedMediaField.vue';
import { MediaFieldExample } from './MediaFieldExample';

const example = new MediaFieldExample.Class();

// the state destructure
const {
  // state refs
  preloadedMedia,
  avatarMedia,
  galleryMedia,
  documentMedia,
  extendedMedia,
  resetting,
} = example;
</script>

<template>
  <div class="pane pane-fields">
    <p class="note">
      A production-grade uploader: drag-drop, thumbnails, lightbox preview,
      rename, download, delete — every byte stored in YOUR browser
      (IndexedDB) by the mock backend. Point ServerApi at
      server-node/server.ts and the same component uploads to disk or S3
      with sharp-generated thumbnails.
    </p>

    <div class="field-grid">
      <section>
        <h3>Preexisting media — hydrated from the server</h3>
        <MediaField
          v-model="preloadedMedia"
          label="Attached earlier"
          hint="The model starts as bare IDs; the field fetches the rows itself — stock QUploader has no such path"
          accept="image/*"
          multiple
        />
      </section>

      <section>
        <h3>Single image</h3>
        <MediaField
          v-model="avatarMedia"
          label="Cover image"
          hint="One image; replace by uploading again"
          accept="image/*"
          :max-files="1"
        />
      </section>

      <section>
        <h3>Gallery — multiple images</h3>
        <MediaField
          v-model="galleryMedia"
          label="Gallery"
          hint="Drop several images at once; click a tile for the lightbox"
          accept="image/*"
          multiple
          :thumbnail-size="96"
        />
      </section>

      <section>
        <h3>Documents — any file type</h3>
        <MediaField
          v-model="documentMedia"
          label="Attachments"
          hint="Non-images render a file-type icon; rename and download from the tile"
          accept=".pdf, .txt, .md, image/*"
          multiple
          dense
          :thumbnail-size="72"
        />
      </section>

      <section>
        <h3>Extended — class extension + template injection</h3>
        <ExtendedMediaField
          v-model="extendedMedia"
          label="Extended uploader"
          hint="A child class adds sorting, image dimensions, captions, copy-URL and a size summary — the base template is reused, not copied"
          accept="image/*"
          multiple
        />
      </section>
    </div>

    <div class="row" style="margin-top: 20px">
      <button
        class="btn"
        type="button"
        :disabled="resetting"
        @click="example.resetSandbox()"
      >
        {{ resetting ? 'Resetting…' : 'Reset sandbox data' }}
      </button>
      <span class="mono">
        files live in IndexedDB — private to this browser
      </span>
    </div>
  </div>
</template>

<style scoped src="../../example-pane.css"></style>

<style scoped>
.pane-fields {
  max-width: 920px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr));
  gap: 24px 26px;
  align-items: start;
}
.field-grid h3 {
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f1f5ff;
}
</style>
