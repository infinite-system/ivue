// MediaFieldExample.ts — the Advanced Media Uploader showcase route state.
// Installs the in-browser mock backend for this route chunk (media bytes in
// IndexedDB, thumbnails via canvas); swap ServerApi to httpTransport(...)
// and the same components upload through server-node/server.ts (sharp
// thumbnails, disk or S3 storage).
import { ref } from 'vue';
import { Reactive } from '../../../ivue';
import { ServerApi, type MediaRow } from '../server/ServerApi';
import { mockServerTransport, resetMockServer } from '../server/MockServer';

ServerApi.use(mockServerTransport);

class $MediaFieldExample {
  // MUTABLE STATE — one model per showcased variation.
  get avatarMedia() {
    return ref<MediaRow | null>(null);
  }
  get galleryMedia() {
    return ref<MediaRow[]>([]);
  }
  get documentMedia() {
    return ref<MediaRow[]>([]);
  }
  get extendedMedia() {
    return ref<MediaRow[]>([]);
  }
  get resetting() {
    return ref(false);
  }

  async resetSandbox() {
    this.resetting.value = true;
    await resetMockServer();
    this.avatarMedia.value = null;
    this.galleryMedia.value = [];
    this.documentMedia.value = [];
    this.extendedMedia.value = [];
    this.resetting.value = false;
  }
}

export namespace MediaFieldExample {
  export const $Class = $MediaFieldExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
