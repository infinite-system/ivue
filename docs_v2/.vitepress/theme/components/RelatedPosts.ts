// RelatedPosts.ts — "From the blog", the aside block that turns reference
// pages into blog on-ramps. Curation is explicit frontmatter
// (relatedPosts: [slug, …]) per page; pages without the key render
// nothing. Compact rows on purpose: in a 240px column, recognition beats
// spectacle — a small banner thumb, the title doing the work.
import { ref, watch, type PropType } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
import { definePropTypes, propsWithDefaults, Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { data as posts } from '../../../blog/blog-lite.data.mjs';

class $RelatedPosts {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      variant: { type: String as PropType<RelatedPosts.Variant> },
    });
  }

  static get propsDefaults() {
    return { variant: 'aside' as RelatedPosts.Variant };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** The aside stays capped at three (a calm column, no controls); the
   *  doc grid shows three and expands on demand — a button, not a slider:
   *  hidden-by-carousel content barely gets touched, and post pages
   *  already have one slider (the archive rail). */
  static get VISIBLE_COUNT() {
    return 3;
  }

  constructor(public props: RelatedPosts.Props) {
    const { frontmatter, page } = useData();
    this.frontmatter = frontmatter;
    this.page = page;
    this.route = useRoute();
    // a route change collapses the grid again
    watch(
      () => this.page.value.relativePath,
      () => this.collapse(),
    );
  }

  protected readonly frontmatter: ReturnType<typeof useData>['frontmatter'];
  protected readonly page: ReturnType<typeof useData>['page'];
  protected readonly route: ReturnType<typeof useRoute>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $RelatedPosts;
  }

  // MUTABLE STATE
  get expanded() {
    return ref(false);
  }

  // PROPS
  get variant() {
    return this.props.variant;
  }
  get isAside() {
    return this.variant === 'aside';
  }
  get isDoc() {
    return this.variant === 'doc';
  }

  // DERIVED
  /** On a blog post the block lists PEERS — "Related posts". On guide
   *  pages it is an on-ramp from reference into the blog — "From the
   *  blog" says where the reader is being invited. */
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }
  get heading() {
    return this.isBlogPost ? 'Related posts' : 'From the blog';
  }
  get variantClass() {
    return `related-posts--${this.variant}`;
  }
  /** Frontmatter may list any number of slugs, strongest first. */
  get allRelatedPosts(): RelatedPosts.Post[] {
    const slugs: string[] = this.frontmatter.value.relatedPosts ?? [];
    return slugs
      .map((slug) => (posts as RelatedPosts.Post[]).find((post) => post.slug === slug))
      .filter((post): post is RelatedPosts.Post => Boolean(post));
  }
  get relatedPosts() {
    if (this.isAside) return this.allRelatedPosts.slice(0, this.self.VISIBLE_COUNT);
    if (this.expanded.value) return this.allRelatedPosts;
    return this.allRelatedPosts.slice(0, this.self.VISIBLE_COUNT);
  }
  get hasPosts() {
    return this.relatedPosts.length > 0;
  }
  get hiddenCount() {
    return this.isDoc && !this.expanded.value
      ? this.allRelatedPosts.length - this.self.VISIBLE_COUNT
      : 0;
  }
  get hasHidden() {
    return this.hiddenCount > 0;
  }
  get moreLabel() {
    return this.isBlogPost
      ? `More related posts (${this.hiddenCount})`
      : `Show ${this.hiddenCount} more from the blog`;
  }

  // METHODS
  postHref(post: RelatedPosts.Post) {
    return withBase(post.url);
  }

  imageSrc(post: RelatedPosts.Post) {
    return withBase(post.image);
  }

  expand() {
    this.expanded.value = true;
  }

  collapse() {
    this.expanded.value = false;
  }
}

export namespace RelatedPosts {
  export const $Class = Static($RelatedPosts); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Variant = 'aside' | 'doc';
  export type Props = { variant: Variant };

  /** A blog entry as the lite loader ships it (blog-lite.data.mjs). */
  export interface Post {
    slug: string;
    url: string;
    title: string;
    image: string;
  }
}
