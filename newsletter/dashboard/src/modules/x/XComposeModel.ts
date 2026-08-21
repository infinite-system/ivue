import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { PostSummary, ScheduledJob, TweetRow } from '../platform/Api';
import { Format } from '../platform/Format';
import { AppStore } from '../app/AppStore';

// The X composer: pick a post, the template prefills the draft
// ({title}/{url} from the pick), the counter weighs links the way X
// does (every URL flattens to 23 t.co characters), and posting is
// arm-to-confirm. Until the four X_* secrets exist the Worker answers
// 503 and the composer shows the pending state instead of a send.
class $XComposeModel {
  constructor() {
    this.load();
  }

  // the app store — resolved and cached on first touch (store pattern)
  protected get $app() {
    return AppStore.use();
  }

  get TWEET_LIMIT() {
    return 280;
  }

  get URL_WEIGHT() {
    return 23; // every link becomes a t.co URL of fixed length
  }

  get posts() {
    return shallowRef<PostSummary[]>([]);
  }

  get template() {
    return ref('');
  }

  get contentTemplate() {
    return ref('');
  }

  // 'link' = short teaser, X renders the card from the post page's
  // twitter:image meta; 'content' = article substance in the tweet with
  // the banner uploaded natively
  get mode() {
    return ref<'link' | 'content'>('link');
  }

  get attachBanner() {
    return this.mode.value === 'content';
  }

  get pickedPost() {
    return (
      this.posts.value.find(
        (candidate) => candidate.slug === this.slug.value,
      ) ?? null
    );
  }

  get bannerUrl() {
    return this.pickedPost && this.attachBanner
      ? `https://ivue.dev/blog/${this.pickedPost.slug}.png`
      : '';
  }

  get xConfigured() {
    return ref(false);
  }

  get slug() {
    return ref('');
  }

  get draft() {
    return ref('');
  }

  get posting() {
    return ref(false);
  }

  get postArmed() {
    return ref(false);
  }

  get postedUrl() {
    return ref('');
  }

  get tweetLog() {
    return shallowRef<TweetRow[]>([]);
  }

  // ---- scheduling (tweet kind) — enqueueing needs no credentials; the
  // job records a visible failure if they are still absent at run time
  get scheduleAt() {
    return ref(''); // datetime-local input value
  }

  get scheduledJobs() {
    return shallowRef<ScheduledJob[]>([]);
  }

  get scheduleDueAt() {
    return Format.Class.epochFromLocalInput(this.scheduleAt.value);
  }

  get scheduleTimeValid() {
    const dueAt = this.scheduleDueAt;
    return dueAt !== null && dueAt > Date.now() / 1000;
  }

  get canSchedule() {
    return (
      this.draft.value.trim().length > 0 &&
      !this.overLimit &&
      this.scheduleTimeValid
    );
  }

  get loading() {
    return ref(true);
  }

  // X counts every URL as 23 characters regardless of its length
  get weightedLength() {
    const withoutUrls = this.draft.value.replace(/https?:\/\/\S+/g, '');
    const urlCount =
      (this.draft.value.match(/https?:\/\/\S+/g) ?? []).length;
    return [...withoutUrls].length + urlCount * this.URL_WEIGHT;
  }

  get remaining() {
    return this.TWEET_LIMIT - this.weightedLength;
  }

  get overLimit() {
    return this.remaining < 0;
  }

  get canPost() {
    return (
      this.draft.value.trim().length > 0 &&
      !this.overLimit &&
      !this.posting.value &&
      this.xConfigured.value
    );
  }

  get postButtonLabel() {
    if (this.posting.value) return 'Posting…';
    if (!this.xConfigured.value) return 'Credentials pending';
    return this.postArmed.value ? 'Really post to X — click again' : 'Post to X';
  }

  async load() {
    this.loading.value = true;
    try {
      const [catalog, settings, log] = await Promise.all([
        Api.Class.posts(),
        Api.Class.settings(),
        Api.Class.tweets(),
      ]);
      this.posts.value = [...catalog].sort(
        (first, second) => second.timestamp - first.timestamp,
      );
      this.template.value = settings.tweetTemplate;
      this.contentTemplate.value = settings.tweetContentTemplate;
      this.xConfigured.value = settings.xConfigured;
      this.tweetLog.value = log;
      await this.refreshSchedule();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.loading.value = false;
    }
  }

  fillTemplate(post: PostSummary): string {
    const template =
      this.mode.value === 'content'
        ? this.contentTemplate.value
        : this.template.value;
    return template
      .replaceAll('{title}', post.title)
      .replaceAll('{description}', post.description)
      .replaceAll('{url}', post.url);
  }

  pickPost(slug: string) {
    this.slug.value = slug;
    this.prefill();
    this.postArmed.value = false;
    this.postedUrl.value = '';
  }

  setMode(mode: 'link' | 'content') {
    this.mode.value = mode;
    this.prefill(); // a mode is a different draft — re-prefill the pick
  }

  prefill() {
    if (this.pickedPost) this.draft.value = this.fillTemplate(this.pickedPost);
  }

  async confirmPost() {
    if (!this.canPost) return;
    if (!this.postArmed.value) {
      this.postArmed.value = true;
      return;
    }
    this.postArmed.value = false;
    this.posting.value = true;
    try {
      const result = await Api.Class.tweet({
        text: this.draft.value.trim(),
        slug: this.slug.value,
        attachBanner: this.attachBanner,
      });
      this.postedUrl.value = result.url;
      this.$app.notify('Posted to X.', 'success');
      this.tweetLog.value = await Api.Class.tweets();
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.posting.value = false;
    }
  }

  disarm() {
    this.postArmed.value = false;
  }

  async refreshSchedule() {
    const jobs = await Api.Class.scheduleList();
    this.scheduledJobs.value = jobs.upcoming.filter(
      (job) => job.kind === 'tweet',
    );
  }

  async scheduleTweet() {
    if (!this.canSchedule) return;
    try {
      await Api.Class.schedule({
        kind: 'tweet',
        payload: {
          text: this.draft.value.trim(),
          slug: this.slug.value,
          attachBanner: this.attachBanner ? '1' : '',
        },
        dueAt: this.scheduleDueAt!,
      });
      this.$app.notify('Post scheduled.', 'success');
      this.scheduleAt.value = '';
      await this.refreshSchedule();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }

  async cancelJob(id: number) {
    try {
      await Api.Class.scheduleCancel(id);
      this.$app.notify('Cancelled.', 'info');
      await this.refreshSchedule();
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }
}

export namespace XComposeModel {
  export const $Class = $XComposeModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
