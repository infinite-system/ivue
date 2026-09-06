// MediaFieldExample.ts — the Advanced Media Uploader showcase route state.
// Installs the in-browser mock backend for this route chunk (media bytes in
// IndexedDB, thumbnails via canvas); swap ServerApi to httpTransport(...)
// and the same components upload through server-node/server.ts (sharp
// thumbnails, disk or S3 storage).
import { ref } from 'vue';
import { Reactive } from '../../../ivue';
import { ServerApi } from '../server/ServerApi';
import {
  ensureSeedMedia,
  createMockServerTransport,
  resetMockServer,
} from '../server/MockServer';

class $MediaFieldExample {
  // Preexisting media: the server already holds these images — the field
  // receives bare IDS and hydrates the rows itself. Stock QUploader has no
  // such path; it only knows files picked in the session.
  constructor() {
    this.installMockServer();
    this.loadPreexisting();
  }

  // MUTABLE STATE — one model per showcased variation.
  get preloadedMedia() {
    return ref<(ServerApi.MediaRow | string)[]>([]);
  }
  get avatarMedia() {
    return ref<ServerApi.MediaRow | null>(null);
  }
  get galleryMedia() {
    return ref<ServerApi.MediaRow[]>([]);
  }
  get documentMedia() {
    return ref<ServerApi.MediaRow[]>([]);
  }
  get extendedMedia() {
    return ref<ServerApi.MediaRow[]>([]);
  }
  get resetting() {
    return ref(false);
  }

  get resetLabel() {
    return this.resetting.value ? 'Resetting…' : 'Reset sandbox data';
  }

  async loadPreexisting() {
    const seeded = await ensureSeedMedia();
    // hand the field IDS ONLY — it fetches the rows through ServerApi
    this.preloadedMedia.value = seeded.map((row) => row.id);
  }

  async resetSandbox() {
    this.resetting.value = true;
    await resetMockServer();
    this.avatarMedia.value = null;
    this.galleryMedia.value = [];
    this.documentMedia.value = [];
    this.extendedMedia.value = [];
    await this.loadPreexisting();
    this.resetting.value = false;
  }

  /** This route runs against the in-browser mock backend; installing it
   *  here (not at import) keeps the class file free of side effects. Swap
   *  for `ServerApi.Class.use(httpTransport(...))` to run against server-node. */
  installMockServer() {
    ServerApi.Class.use(createMockServerTransport());
  }
}

export namespace MediaFieldExample {
  export const $Class = $MediaFieldExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
