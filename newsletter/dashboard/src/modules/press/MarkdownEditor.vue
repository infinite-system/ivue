<script setup lang="ts">
import { QDialog } from 'quasar';
import { EditorContent } from '@tiptap/vue-3';
import { EditorModel } from './EditorModel';

const props = defineProps<EditorModel.Props>();
const emit = defineEmits<EditorModel.Emits>();

const model = new EditorModel.Class(props, emit);
const {
  // state refs
  editor,
  linkOpen,
  linkDraft,
  embedOpen,
  embedDraft,
} = model;
</script>

<template>
  <div class="press-editor" :class="{ readonly: !model.isEditable, uploading: model.isUploading }">
    <div v-if="model.isEditable" class="press-toolbar" role="toolbar" aria-label="Formatting">
      <button type="button" :class="{ on: model.isActive('bold') }" title="Bold (Ctrl+B)" @click="model.toggleBold()"><b>B</b></button>
      <button type="button" :class="{ on: model.isActive('italic') }" title="Italic (Ctrl+I)" @click="model.toggleItalic()"><i>I</i></button>
      <button type="button" :class="{ on: model.isActive('code') }" title="Code" @click="model.toggleCode()">&lt;/&gt;</button>
      <span class="press-toolbar-gap"></span>
      <button type="button" :class="{ on: model.isActive('heading', { level: 2 }) }" title="Heading" @click="model.toggleHeading(2)">H2</button>
      <button type="button" :class="{ on: model.isActive('heading', { level: 3 }) }" title="Subheading" @click="model.toggleHeading(3)">H3</button>
      <button type="button" :class="{ on: model.isActive('bulletList') }" title="Bulleted list" @click="model.toggleBulletList()">•≡</button>
      <button type="button" :class="{ on: model.isActive('orderedList') }" title="Numbered list" @click="model.toggleOrderedList()">1≡</button>
      <button type="button" :class="{ on: model.isActive('blockquote') }" title="Quote" @click="model.toggleBlockquote()">❝</button>
      <button type="button" :class="{ on: model.isActive('codeBlock') }" title="Code block" @click="model.toggleCodeBlock()">{ }</button>
      <button type="button" title="Rule — a tweet break in the base" @click="model.insertRule()">—</button>
      <span class="press-toolbar-gap"></span>
      <button type="button" :class="{ on: model.isActive('link') }" title="Link" @click="model.openLink()">
        <svg class="press-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" /><path d="M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" /></svg>
      </button>
      <label class="press-toolbar-file" title="Image or video from disk">
        <svg class="press-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5" /><circle cx="5.5" cy="6.5" r="1.2" /><path d="M14 11l-3.5-3.5L6 12" /></svg>
        <input type="file" :accept="model.acceptedTypes" multiple hidden @change="model.onFilePicked($event)" />
      </label>
      <button type="button" title="YouTube or video link" @click="model.openEmbed()">
        <svg class="press-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" /></svg>
      </button>
      <span v-if="model.isUploading" class="press-toolbar-status">{{ model.uploadLabel }}</span>
    </div>
    <editor-content :editor="editor" class="press-editor-surface" :style="{ minHeight: model.minHeight }" />

    <q-dialog v-model="linkOpen">
      <form class="press-small-dialog" @submit.prevent="model.submitLink()">
        <h3>Link</h3>
        <input v-model="linkDraft" type="url" placeholder="https://" aria-label="Link URL" autofocus />
        <div class="press-actions">
          <button type="button" class="ghost" @click="model.closeLink()">Cancel</button>
          <button type="submit">{{ model.linkSubmitLabel }}</button>
        </div>
      </form>
    </q-dialog>

    <q-dialog v-model="embedOpen">
      <form class="press-small-dialog" @submit.prevent="model.submitEmbed()">
        <h3>Embed a video</h3>
        <p class="muted">A YouTube link becomes a player; a link to an mp4, webm or mov file becomes a video.</p>
        <input v-model="embedDraft" type="url" placeholder="https://www.youtube.com/watch?v=…" aria-label="Video URL" autofocus />
        <div class="press-actions">
          <button type="button" class="ghost" @click="model.closeEmbed()">Cancel</button>
          <button type="submit">Embed</button>
        </div>
      </form>
    </q-dialog>
  </div>
</template>
