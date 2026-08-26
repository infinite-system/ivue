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

  get threadSegments() {
    return ref<ThreadSegment[]>([]);
  }

  get CODE_MARKER() {
    return '[code — in the article]';
  }

  get DEMO_MARKER() {
    return '[live demo — in the article]';
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
      ...this.pickedPost.codeImages,
    ];
  }

  get isThreadMode() {
    return this.mode.value === 'thread';
  }

  get isLinkMode() {
    return this.mode.value === 'link';
  }

  get isContentMode() {
    return this.mode.value === 'content';
  }

  get imagePickerVisible() {
    return this.availableImages.length > 0 && !this.isThreadMode;
  }

  get rebuildButtonLabel() {
    return this.threadLoading.value ? 'Building…' : 'Rebuild from article';
  }

  get scheduleButtonLabel() {
    return this.isThreadMode ? 'Schedule thread' : 'Schedule post';
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

  get threadValid() {
    const segments = this.threadSegments.value;
    return (
      segments.length >= 2 &&
      segments.length <= this.MAXIMUM_THREAD_TWEETS &&
      segments.every(
        (segment, index) =>
          segment.text.trim().length > 0 && this.threadRemaining(index) >= 0,
      )
    );
  }

  get canAddThreadTweet() {
    return this.threadSegments.value.length < this.MAXIMUM_THREAD_TWEETS;
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
      ? `thread (${this.threadSegments.value.length})`
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

  // ---- measures and labels (methods — they take arguments) ----

  weightedLengthOf(text: string) {
    const withoutUrls = text.replace(/https?:\/\/\S+/g, '');
    const urlCount = (text.match(/https?:\/\/\S+/g) ?? []).length;
    return [...withoutUrls].length + urlCount * this.URL_WEIGHT;
  }

  threadRemaining(index: number) {
    return (
      this.TWEET_LIMIT -
      this.weightedLengthOf(this.threadSegments.value[index]?.text ?? '')
    );
  }

  threadOverLimit(index: number) {
    return this.threadRemaining(index) < 0;
  }

  imageCountLabel(segment: ThreadSegment) {
    const count = segment.imageUrls.length;
    return count === 1 ? '1 image' : `${count} images`;
  }

  tweetUrl(tweet: TweetRow) {
    return `https://x.com/i/status/${tweet.tweetId}`;
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
  //
  // IMAGES: plainText's [code]/[live demo] markers appear in document
  // order, aligned 1:1 with the committed code/embed screenshots — each
  // marker attaches its shot to the segment it lands in (the marker
  // line itself vanishes: the image says it better). Base images
  // (banner) ride the first segment.
  splitIntoTweets(
    title: string,
    plainText: string,
    url: string,
    images: { base?: string[]; code?: string[]; demo?: string[] } = {},
  ): ThreadSegment[] {
    const limit = this.THREAD_SEGMENT_LIMIT;
    const contentCap = this.MAXIMUM_THREAD_TWEETS - 1;
    const segments: ThreadSegment[] = [];
    let current = title;
    let currentImages: string[] = [...(images.base ?? [])];
    let truncated = false;
    let codeIndex = 0;
    let demoIndex = 0;
    const consumeMarkers = (piece: string): { text: string; attached: string[] } => {
      const attached: string[] = [];
      let text = piece;
      const claim = (marker: string, pool: string[], take: () => number) => {
        while (text.includes(marker)) {
          const shot = pool[take()];
          if (shot) attached.push(shot);
          text = text.replace(marker, '').trim();
        }
      };
      claim(this.CODE_MARKER, images.code ?? [], () => codeIndex++);
      claim(this.DEMO_MARKER, images.demo ?? [], () => demoIndex++);
      return { text, attached };
    };
    const pushSegment = () => {
      segments.push({
        text: current,
        imageUrls: [...new Set(currentImages)].slice(0, this.MAXIMUM_IMAGES),
      });
      currentImages = [];
    };
    const pieces = plainText
      .split(/\n\n+/)
      .flatMap((paragraph) =>
        this.weightedLengthOf(paragraph) > limit
          ? paragraph.split(/(?<=[.!?])\s+/)
          : [paragraph],
      )
      .map((piece) => piece.trim())
      .filter(Boolean);
    for (const rawPiece of pieces) {
      const { text: piece, attached } = consumeMarkers(rawPiece);
      currentImages.push(...attached);
      if (!piece) continue; // a marker-only paragraph: image stays, text goes
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
        // images attached AFTER the split point belong to the NEW segment
        const carry = attached;
        currentImages = currentImages.filter(
          (image) => !carry.includes(image),
        );
        pushSegment();
        currentImages = carry;
      }
      current =
        this.weightedLengthOf(piece) <= limit
          ? piece
          : piece.slice(0, limit - 1) + '…';
    }
    if (current && segments.length < contentCap) {
      current = truncated ? `${current} …` : current;
      pushSegment();
    }
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
      this.weightedLengthOf(`${last.text}\n\n${closer}`) <= limit
    ) {
      last.text = `${last.text}\n\n${closer}`;
    } else {
      segments.push({ text: closer, imageUrls: [] });
    }
    return segments.map((segment, index) => ({
      ...segment,
      text: `${index + 1}/${segments.length} ${segment.text}`,
    }));
  }

  async buildThread() {
    const post = this.pickedPost;
    if (!post) return;
    this.threadLoading.value = true;
    try {
      const source = await Api.Class.postText(post.slug);
      // pre-push blog-index has no plainText yet — description carries
      const body = source.plainText || post.description;
      this.threadSegments.value = this.splitIntoTweets(
        post.title,
        body,
        post.url,
        {
          base: this.selectedImages.value,
          code: post.codeImages,
          demo: post.embedImages,
        },
      );
    } catch (error) {
      this.$app.reportFailure(error);
    } finally {
      this.threadLoading.value = false;
    }
  }

  removeThreadTweet(index: number) {
    this.threadSegments.value = this.threadSegments.value.filter(
      (_segment, position) => position !== index,
    );
  }

  addThreadTweet() {
    this.threadSegments.value = [
      ...this.threadSegments.value,
      { text: '', imageUrls: [] },
    ];
  }

  segmentHasImage(index: number, imageUrl: string) {
    return (this.threadSegments.value[index]?.imageUrls ?? []).includes(
      imageUrl,
    );
  }

  toggleSegmentImage(index: number, imageUrl: string) {
    const segment = this.threadSegments.value[index];
    if (!segment) return;
    const images = segment.imageUrls ?? [];
    if (images.includes(imageUrl)) {
      segment.imageUrls = images.filter((image) => image !== imageUrl);
    } else if (images.length < this.MAXIMUM_IMAGES) {
      segment.imageUrls = [...images, imageUrl];
    }
    // replace the array so the shallow watchers see the change
    this.threadSegments.value = [...this.threadSegments.value];
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
          tweets: this.threadSegments.value.map((segment) => ({
            text: segment.text.trim(),
            imageUrls: segment.imageUrls ?? [],
          })),
          slug: this.slug.value,
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
                  this.threadSegments.value.map((segment) => ({
                    text: segment.text.trim(),
                    imageUrls: segment.imageUrls ?? [],
                  })),
                ),
                slug: this.slug.value,
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
        const tweets = JSON.parse(job.payload.tweets ?? '[]') as (
          | string
          | { text: string }
        )[];
        const first = tweets[0];
        return `thread (${tweets.length}) — ${
          typeof first === 'string' ? first : (first?.text ?? '')
        }`;
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

export interface ThreadSegment {
  text: string;
  imageUrls: string[];
}
