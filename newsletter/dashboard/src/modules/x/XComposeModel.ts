import { Reactive } from 'ivue';
import { ref, shallowRef } from 'vue';
import { Api } from '../platform/Api';
import type { PostSummary, ScheduledJob, TweetRow } from '../platform/Api';
import { Format } from '../platform/Format';
import { AppStore } from '../app/AppStore';

// The X composer, three modes deep:
//   link    — short teaser; X renders the card from the post page's
//             twitter:image meta
//   content — article substance in one tweet, with up to 4 site images
//             (banner + embed screenshots) uploaded natively
//   thread  — the FULL article split into a reply chain, images on the
//             first tweet, editable per segment before posting
// The counter weighs links the way X does (every URL = 23 t.co chars).
// Posting is arm-to-confirm; scheduling needs no credentials (a job
// records a visible failure if they are absent at run time).
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

  get MAXIMUM_IMAGES() {
    return 4; // X's per-tweet cap
  }

  // headroom for the thread's "n/m " numbering prefix
  get THREAD_SEGMENT_LIMIT() {
    return 270;
  }

  get MAXIMUM_THREAD_TWEETS() {
    return 10;
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

  get mode() {
    return ref<ComposeMode>('link');
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

  get selectedImages() {
    return shallowRef<string[]>([]);
  }

  get threadTweets() {
    return ref<string[]>([]);
  }

  get threadLoading() {
    return ref(false);
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

  get scheduleAt() {
    return ref(''); // datetime-local input value
  }

  get scheduledJobs() {
    return shallowRef<ScheduledJob[]>([]);
  }

  get loading() {
    return ref(true);
  }

  // ---- derived ----

  get pickedPost() {
    return (
      this.posts.value.find(
        (candidate) => candidate.slug === this.slug.value,
      ) ?? null
    );
  }

  get imagesEnabled() {
    return this.mode.value !== 'link';
  }

  get availableImages() {
    if (!this.pickedPost || !this.imagesEnabled) return [];
    return [
      `https://ivue.dev/blog/${this.pickedPost.slug}.png`,
      ...this.pickedPost.embedImages,
    ];
  }

  get isThreadMode() {
    return this.mode.value === 'thread';
  }

  weightedLengthOf(text: string) {
    const withoutUrls = text.replace(/https?:\/\/\S+/g, '');
    const urlCount = (text.match(/https?:\/\/\S+/g) ?? []).length;
    return [...withoutUrls].length + urlCount * this.URL_WEIGHT;
  }

  get weightedLength() {
    return this.weightedLengthOf(this.draft.value);
  }

  get remaining() {
    return this.TWEET_LIMIT - this.weightedLength;
  }

  get overLimit() {
    return this.remaining < 0;
  }

  threadRemaining(index: number) {
    return this.TWEET_LIMIT - this.weightedLengthOf(this.threadTweets.value[index] ?? '');
  }

  get threadValid() {
    const tweets = this.threadTweets.value;
    return (
      tweets.length >= 2 &&
      tweets.length <= this.MAXIMUM_THREAD_TWEETS &&
      tweets.every(
        (tweet, index) =>
          tweet.trim().length > 0 && this.threadRemaining(index) >= 0,
      )
    );
  }

  get canAddThreadTweet() {
    return this.threadTweets.value.length < this.MAXIMUM_THREAD_TWEETS;
  }

  get draftValid() {
    return this.isThreadMode
      ? this.threadValid
      : this.draft.value.trim().length > 0 && !this.overLimit;
  }

  get canPost() {
    return this.draftValid && !this.posting.value && this.xConfigured.value;
  }

  get postButtonLabel() {
    if (this.posting.value) return 'Posting…';
    if (!this.xConfigured.value) return 'Credentials pending';
    const noun = this.isThreadMode
      ? `thread (${this.threadTweets.value.length})`
      : 'to X';
    return this.postArmed.value
      ? `Really post ${noun} — click again`
      : `Post ${noun}`;
  }

  get scheduleDueAt() {
    return Format.Class.epochFromLocalInput(this.scheduleAt.value);
  }

  get scheduleTimeValid() {
    const dueAt = this.scheduleDueAt;
    return dueAt !== null && dueAt > Date.now() / 1000;
  }

  get canSchedule() {
    return this.draftValid && this.scheduleTimeValid;
  }

  // ---- loading ----

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

  // ---- composing ----

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

  setMode(mode: ComposeMode) {
    this.mode.value = mode;
    this.prefill(); // a mode is a different draft — re-prefill the pick
  }

  prefill() {
    const post = this.pickedPost;
    if (!post) return;
    // default image selection: the banner, when images apply at all
    this.selectedImages.value = this.imagesEnabled
      ? [`https://ivue.dev/blog/${post.slug}.png`]
      : [];
    if (this.isThreadMode) {
      this.buildThread();
      return;
    }
    this.draft.value = this.fillTemplate(post);
  }

  isImageSelected(imageUrl: string) {
    return this.selectedImages.value.includes(imageUrl);
  }

  toggleImage(imageUrl: string) {
    if (this.isImageSelected(imageUrl)) {
      this.selectedImages.value = this.selectedImages.value.filter(
        (selected) => selected !== imageUrl,
      );
      return;
    }
    if (this.selectedImages.value.length >= this.MAXIMUM_IMAGES) return;
    this.selectedImages.value = [...this.selectedImages.value, imageUrl];
  }

  // ---- the thread builder ----

  // Greedy packer: paragraphs fill segments up to the limit; an
  // oversized paragraph splits on sentence boundaries. Content fills at
  // most MAXIMUM_THREAD_TWEETS - 1 segments (a long article truncates
  // with an ellipsis — the link is the road to the rest); the article
  // link closes the thread; "n/m " numbering is applied last.
  splitIntoTweets(title: string, plainText: string, url: string): string[] {
    const limit = this.THREAD_SEGMENT_LIMIT;
    const contentCap = this.MAXIMUM_THREAD_TWEETS - 1;
    const segments: string[] = [];
    let current = title;
    let truncated = false;
    const pieces = plainText
      .split(/\n\n+/)
      .flatMap((paragraph) =>
        this.weightedLengthOf(paragraph) > limit
          ? paragraph.split(/(?<=[.!?])\s+/)
          : [paragraph],
      )
      .map((piece) => piece.trim())
      .filter(Boolean);
    for (const piece of pieces) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (this.weightedLengthOf(candidate) <= limit) {
        current = candidate;
        continue;
      }
      if (current) {
        if (segments.length >= contentCap - 1) {
          truncated = true;
          break;
        }
        segments.push(current);
      }
      current =
        this.weightedLengthOf(piece) <= limit
          ? piece
          : piece.slice(0, limit - 1) + '…';
    }
    if (current && segments.length < contentCap)
      segments.push(truncated ? `${current} …` : current);
    const closer = `Full article:\n${url}`;
    const last = segments[segments.length - 1];
    // the closer folds into the last segment only when it fits AND the
    // thread is neither truncated (the cut must stay visible, the link
    // is the road to the rest) nor single-segment (a thread is minimum
    // two tweets)
    if (
      !truncated &&
      segments.length > 1 &&
      last &&
      this.weightedLengthOf(`${last}\n\n${closer}`) <= limit
    ) {
      segments[segments.length - 1] = `${last}\n\n${closer}`;
    } else {
      segments.push(closer);
    }
    return segments.map(
      (segment, index) => `${index + 1}/${segments.length} ${segment}`,
    );
  }

  async buildThread() {
    const post = this.pickedPost;
    if (!post) return;
    this.threadLoading.value = true;
    try {
      const source = await Api.Class.postText(post.slug);
      // pre-push blog-index has no plainText yet — description carries
      const body = source.plainText || post.description;
      this.threadTweets.value = this.splitIntoTweets(
        post.title,
        body,
        post.url,
      );
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.threadLoading.value = false;
    }
  }

  removeThreadTweet(index: number) {
    this.threadTweets.value = this.threadTweets.value.filter(
      (_tweet, position) => position !== index,
    );
  }

  addThreadTweet() {
    this.threadTweets.value = [...this.threadTweets.value, ''];
  }

  // ---- posting ----

  async confirmPost() {
    if (!this.canPost) return;
    if (!this.postArmed.value) {
      this.postArmed.value = true;
      return;
    }
    this.postArmed.value = false;
    this.posting.value = true;
    try {
      if (this.isThreadMode) {
        const result = await Api.Class.thread({
          tweets: this.threadTweets.value.map((tweet) => tweet.trim()),
          slug: this.slug.value,
          imageUrls: this.selectedImages.value,
        });
        this.postedUrl.value = result.url;
        this.$app.notify(`Thread of ${result.tweetIds.length} posted.`, 'success');
      } else {
        const result = await Api.Class.tweet({
          text: this.draft.value.trim(),
          slug: this.slug.value,
          imageUrls: this.selectedImages.value,
        });
        this.postedUrl.value = result.url;
        this.$app.notify('Posted to X.', 'success');
      }
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

  // ---- scheduling ----

  async refreshSchedule() {
    const jobs = await Api.Class.scheduleList();
    this.scheduledJobs.value = jobs.upcoming.filter(
      (job) => job.kind === 'tweet' || job.kind === 'thread',
    );
  }

  async scheduleCurrent() {
    if (!this.canSchedule) return;
    try {
      await Api.Class.schedule(
        this.isThreadMode
          ? {
              kind: 'thread',
              payload: {
                tweets: JSON.stringify(
                  this.threadTweets.value.map((tweet) => tweet.trim()),
                ),
                slug: this.slug.value,
                images: JSON.stringify(this.selectedImages.value),
              },
              dueAt: this.scheduleDueAt!,
            }
          : {
              kind: 'tweet',
              payload: {
                text: this.draft.value.trim(),
                slug: this.slug.value,
                images: JSON.stringify(this.selectedImages.value),
              },
              dueAt: this.scheduleDueAt!,
            },
      );
      this.$app.notify(
        this.isThreadMode ? 'Thread scheduled.' : 'Post scheduled.',
        'success',
      );
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

  jobSummary(job: ScheduledJob) {
    if (job.kind === 'thread') {
      try {
        const tweets = JSON.parse(job.payload.tweets ?? '[]') as string[];
        return `thread (${tweets.length}) — ${tweets[0] ?? ''}`;
      } catch {
        return 'thread';
      }
    }
    return job.payload.text ?? '';
  }
}

export namespace XComposeModel {
  export const $Class = $XComposeModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

export type ComposeMode = 'link' | 'content' | 'thread';
