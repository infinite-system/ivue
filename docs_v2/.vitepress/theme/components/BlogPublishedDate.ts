// BlogPublishedDate.ts — the post's dates, relocated from under the title
// to the doc footer: the content is invariant-timeless, so a date
// shouldn't be the first thing a reader weighs — but both dates stay
// findable at the bottom. Renders Published THEN Last updated in one
// metadata block (the native .last-updated is hidden on blog posts —
// see custom.css).
import { onMounted, ref } from 'vue';
import { useData, useRoute } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import dates from '../../../blog/blog-dates.json';

class $BlogPublishedDate {
  constructor() {
    this.route = useRoute();
    this.page = useData().page;
    onMounted(() => this.onMount());
  }

  protected readonly route: ReturnType<typeof useRoute>;
  protected readonly page: ReturnType<typeof useData>['page'];

  // MUTABLE STATE — formatted on the client only: toLocaleString differs
  // across SSR and browser environments, and a mismatch breaks hydration
  get published() {
    return ref('');
  }
  get updated() {
    return ref('');
  }

  // DERIVED
  get slug() {
    const match = this.route.path.match(/^\/blog\/([^/]+?)(?:\.html)?$/);
    return match ? match[1] : null;
  }
  get record(): BlogPublishedDate.DateRecord | null {
    return this.slug ? (dates as Record<string, BlogPublishedDate.DateRecord>)[this.slug] ?? null : null;
  }
  get hasRecord() {
    return !!this.record;
  }

  // METHODS
  formatStamp(milliseconds: number) {
    return new Date(milliseconds).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  onMount() {
    if (this.record?.timestamp) this.published.value = this.formatStamp(this.record.timestamp * 1000);
    if (this.page.value.lastUpdated) this.updated.value = this.formatStamp(this.page.value.lastUpdated);
  }
}

export namespace BlogPublishedDate {
  export const $Class = $BlogPublishedDate; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export interface DateRecord {
    timestamp?: number;
  }
}
