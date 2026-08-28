---
title: 'Example: Advanced Media Uploader'
description: 'A production-grade media field — drag-drop uploads, thumbnails, lightbox, rename, download — plus a class-extended variant that adds features without copying a template.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [inheritance-exile, the-options-api-everyone-wanted]
---

<script setup>
import ExampleMediaField from '../.vitepress/theme/components/examples/ExampleMediaField.vue'
</script>

# Advanced Media Uploader

A complete media field — a **Quasar-based extension**, built from Quasar
controls and driven by one ivue class, showing how ivue works WITH an
existing UI framework: drag-and-drop or picked uploads, per-file rows with
inline rename, a lightbox preview dialog, download and delete, and —
missing from Quasar's stock uploader — **preexisting media**: hand the
field bare server ids and it hydrates the rows itself. Extracted from a
production application built on ivue, with the app's service layer swapped
for the playground's ServerApi. In the playground the bytes land
in **your browser's IndexedDB** with canvas-generated thumbnails; against
the reference server the same component uploads to disk or S3 with
[sharp](https://sharp.pixelplumbing.com/)-generated thumbnails.

<ClientOnly>
  <ExampleMediaField />
</ClientOnly>

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Ffields%2Fmedia-field%2FMediaField.ts&path=%2F%23%2Fmedia-field">Open in StackBlitz ⚡</a>
— boots the playground on this example's route with the class open.

## The performance story

`MediaField.ts` derives **28 values through plain getters and zero
`computed()`s** — tile URLs, human-readable sizes, capacity checks,
accept-list parsing, all at zero bytes per instance. The extension class
adds one `computed()` (`sortedFiles`) because a whole-list sort deserves a
memo. A component this rich, with a reactive footprint this small, is the
argument the [performance page](/guide/performance) makes in numbers.

## Extension, two mechanisms at once

`ExtendedMediaField` is the showcase the base component was built for:

- **Extend the class** — `$ExtendedMediaField extends MediaField.$Class`
  adds sort-by-name/newest, image dimensions (read via
  `createImageBitmap` on upload), captions persisted through the backend,
  copy-URL, and a total-size summary. The base SFC accepts the child class
  through its `runner` prop.
- **Inject templates** — the base template exposes `before--`/`after--`
  slots at the header, tiles and actions; the extended variant decorates
  them without duplicating a line of the base template.

Inheritance in ivue is native-JS inheritance — `super`, overridden
getters, all of it ([Inheritance & super](/guide/inheritance)) — so
"variant of a complex component" is a subclass, not a fork.

## What to notice in the playground

- **The preexisting-media section starts full.** Its model is three bare
  ids; the field fetched the rows from the backend on its own — the
  attach-existing-documents flow every real app needs and stock
  `QUploader` cannot express.
- **Drop several images at once** — each uploads through ServerApi,
  thumbnails appear as the backend responds.
- **Click a tile** for the lightbox: prev/next, name, size, download.
- **Rename inline**; the change persists through the backend.
- **The extended variant** shows dimensions badges, captions and the size
  summary — same base template, one subclass.

## The source

::: code-group
<<< ../../examples/playground/src/examples/fields/media-field/ExtendedMediaField.ts [ExtendedMediaField.ts]
<<< ../../examples/playground/src/examples/fields/media-field/ExtendedMediaField.vue [ExtendedMediaField.vue]
<<< ../../examples/playground/src/examples/fields/media-field/MediaField.ts [MediaField.ts]
<<< ../../examples/playground/src/examples/fields/media-field/MediaFieldProps.ts [MediaFieldProps.ts]
<<< ../../examples/playground/src/examples/fields/media-field/MediaField.vue [MediaField.vue]
<<< ../../examples/playground/src/examples/fields/media-field/MediaFieldPreviewDialog.vue [PreviewDialog.vue]
<<< ../../examples/playground/src/examples/fields/media-field/MediaFieldExample.vue [demo route]
:::

## The backend path

Uploads flow through `ServerApi.media.*` — mock in the browser, or the
TypeScript Express reference server with two storage drivers:
[`storage-disk.ts`](https://github.com/infinite-system/ivue/blob/main/examples/playground/server-node/storage-disk.ts)
(plain files under `./uploads`, zero external services) and
[`storage-s3.ts`](https://github.com/infinite-system/ivue/blob/main/examples/playground/server-node/storage-s3.ts)
(private bucket, presigned GET redirects, server-side sharp thumbnails).
Both implement the same contract, so the component never knows which one
it's talking to.
