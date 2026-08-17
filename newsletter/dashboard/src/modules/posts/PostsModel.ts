import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { PostSummary } from '../platform/Api';
import type { AppModel } from '../app/AppModel';

// The post catalog with the email preview: the EXACT html a subscriber
// receives (rendered at site build time), fetched with the admin bearer
// and shown in a sandboxed iframe via srcdoc.
class $PostsModel {
  constructor(public app: AppModel.Instance) {
    this.load();
  }

  get posts() {
    return shallowRef<PostSummary[]>([]);
  }

  get loading() {
    return ref(true);
  }

  get previewSlug() {
    return ref('');
  }

  get previewHtml() {
    return ref('');
  }

  get previewLoading() {
    return ref(false);
  }

  async load() {
    try {
      // newest first for the picker — the drip itself goes oldest-first
      const catalog = await Api.Class.posts();
      this.posts.value = [...catalog].sort(
        (first, second) => second.timestamp - first.timestamp,
      );
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async openPreview(slug: string) {
    this.previewSlug.value = slug;
    this.previewLoading.value = true;
    try {
      this.previewHtml.value = await Api.Class.previewHtml(slug);
    } catch (error) {
      this.app.reportFailure(error);
    } finally {
      this.previewLoading.value = false;
    }
  }

  closePreview() {
    this.previewSlug.value = '';
    this.previewHtml.value = '';
  }
}

export namespace PostsModel {
  export const $Class = $PostsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
