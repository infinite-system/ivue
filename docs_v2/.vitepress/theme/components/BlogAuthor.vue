<script setup lang="ts">
import { BlogAuthor } from './BlogAuthor';

const author = new BlogAuthor.Class();
</script>

<template>
  <!-- Same card as community.md's "Who's behind ivue" — the cm-author
       styles in custom.css paint both. -->
  <div v-if="author.isBlogPost" class="cm-author blog-author">
    <img
      class="cm-avatar"
      :src="author.avatarSrc"
      alt="Evgeny Kalashnikov"
      width="76"
      height="76"
      loading="lazy"
    />
    <div class="cm-author__body">
      <span class="cm-author__eyebrow">Author</span>
      <strong>Evgeny Kalashnikov</strong>
      <span class="cm-author__role">
        <span class="cm-author__role-title">Lead Software Engineer</span>
        <span class="cm-author__role-separator">@</span>
        <span class="cm-author__role-company">Blackline, Adhoc Studio</span>
      </span>
      <nav class="cm-author__links" aria-label="Evgeny Kalashnikov online">
        <a class="cm-author__link" href="https://x.com/evgenykalash" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.64L5.36 22H2.24l7.25-8.29L1.84 2h6.32l4.43 6.98L18.9 2Zm-1.1 18h1.73L7.22 3.9H5.36L17.8 20Z"/></svg>
          <span>X</span>
        </a>
        <a class="cm-author__link" href="https://github.com/infinite-system" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.39c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.92-2.35 4.79-4.58 5.04.36.32.68.93.68 1.88 0 1.36-.01 2.45-.01 2.78 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg>
          <span>GitHub</span>
        </a>
        <a class="cm-author__link" href="https://www.linkedin.com/in/evgeny-kalashnikov/" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 3H3.55A.55.55 0 0 0 3 3.55v16.9c0 .3.25.55.55.55h16.9c.3 0 .55-.25.55-.55V3.55a.55.55 0 0 0-.55-.55ZM8.34 18.34H5.66V9.72h2.68v8.62ZM7 8.54a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Zm11.35 9.8h-2.67v-4.2c0-1 0-2.3-1.4-2.3-1.4 0-1.62 1.1-1.62 2.23v4.27H9.99V9.72h2.56v1.18h.04c.36-.67 1.22-1.38 2.5-1.38 2.68 0 3.18 1.77 3.18 4.06v4.76Z"/></svg>
          <span>LinkedIn</span>
        </a>
        <a class="cm-author__link" href="https://forms.gle/Z7L5N8hBYFoLQ8wA9" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 7.35L4.4 6h15.2L12 11.35ZM4 8.24V18h16V8.24l-7.45 5.3a1 1 0 0 1-1.1 0L4 8.24Z"/></svg>
          <span>Email</span>
        </a>
      </nav>
    </div>
  </div>
</template>
