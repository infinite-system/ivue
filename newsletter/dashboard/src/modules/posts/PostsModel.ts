import { Reactive } from 'ivue';
import { ref, shallowRef, watch } from 'vue';
import { Api } from '../platform/Api';
import type { PostSummary } from '../platform/Api';
import { AppStore } from '../app/AppStore';

// The post catalog with the email preview: the EXACT html a subscriber
// receives (rendered at site build time), fetched with the admin bearer
// and shown in a sandboxed iframe via srcdoc. The OPEN preview is the
// URL (/posts?preview=<slug>) held by the app store — this model only
// renders whatever slug the route says, so a slug click anywhere in the
// app (send log, drawer history, drip plan, stats) lands here.
class $PostsModel {
  constructor() {
    this.load();
    watch(
      () => this.$app.emailPreviewSlug.value,
      (slug) => this.onPreviewSlugChanged(slug),
      { immediate: true },
    );
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get posts() {
    return shallowRef<PostSummary[]>([]);
  }

  get loading() {
    return ref(true);
  }

  get previewHtml() {
    return ref('');
  }

  get previewLoading() {
    return ref(false);
  }

  get previewSlug() {
    return this.$app.emailPreviewSlug.value;
  }

  async load() {
    try {
      // newest first for the picker — the drip itself goes oldest-first
      const catalog = await Api.Class.posts();
      this.posts.value = [...catalog].sort(
        (first, second) => second.timestamp - first.timestamp,
      );
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  async onPreviewSlugChanged(slug: string) {
    if (!slug) {
      this.previewHtml.value = '';
      return;
    }
    this.previewLoading.value = true;
    try {
      this.previewHtml.value = await Api.Class.previewHtml(slug);
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.previewLoading.value = false;
    }
  }
}

export namespace PostsModel {
  export const $Class = $PostsModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
