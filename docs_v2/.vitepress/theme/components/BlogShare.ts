import { onMounted, ref, type ExtractPropTypes, type PropType } from 'vue';
import { useData, useRoute } from 'vitepress';
import { definePropTypes, propsWithDefaults, Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

// The share row under a blog post: one intent link per network, the OS
// share sheet where it exists, and a copy-link button with a fallback for
// insecure (LAN-IP dev) contexts.
class $BlogShare {
  static get SITE_ORIGIN() {
    return 'https://ivue.dev';
  }

  /** How long the copy button reads "Copied!" before reverting. */
  static get COPIED_MS() {
    return 1600;
  }

  /** The networks, in row order — the icon is the 24×24 path. */
  static get networks(): BlogShare.Network[] {
    return [
      {
        name: 'X',
        intent: (url, title) => `https://x.com/intent/post?text=${title}&url=${url}`,
        icon: 'M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.64L5.36 22H2.24l7.25-8.29L1.84 2h6.32l4.43 6.98L18.9 2Zm-1.1 18h1.73L7.22 3.9H5.36L17.8 20Z',
      },
      {
        name: 'Bluesky',
        intent: (url, title) => `https://bsky.app/intent/compose?text=${title}%20${url}`,
        icon: 'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z',
      },
      {
        name: 'LinkedIn',
        intent: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        icon: 'M20.45 3H3.55A.55.55 0 0 0 3 3.55v16.9c0 .3.25.55.55.55h16.9c.3 0 .55-.25.55-.55V3.55a.55.55 0 0 0-.55-.55ZM8.34 18.34H5.66V9.72h2.68v8.62ZM7 8.54a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Zm11.35 9.8h-2.67v-4.2c0-1 0-2.3-1.4-2.3-1.4 0-1.62 1.1-1.62 2.23v4.27H9.99V9.72h2.56v1.18h.04c.36-.67 1.22-1.38 2.5-1.38 2.68 0 3.18 1.77 3.18 4.06v4.76Z',
      },
      {
        name: 'Hacker News',
        intent: (url, title) => `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
        icon: 'M3 3h18v18H3V3Zm9.9 9.6 3.7-6.6h-1.8L12 10.9 9.2 6h-1.8l3.7 6.6V17h1.8v-4.4Z',
      },
      {
        name: 'Reddit',
        intent: (url, title) => `https://www.reddit.com/submit?url=${url}&title=${title}`,
        icon: 'M22 12.1c0-1.2-1-2.2-2.2-2.2-.6 0-1.1.2-1.5.6a10.6 10.6 0 0 0-5.6-1.8l1-4.5 3.2.7a1.6 1.6 0 1 0 .2-1l-3.7-.8c-.3-.1-.5.1-.6.3l-1.1 5.2c-2.2.1-4.2.7-5.7 1.8-.4-.3-.9-.5-1.5-.5A2.2 2.2 0 0 0 3.4 14c0 .1 0 .3.1.4-.1.3-.1.6-.1.9 0 3.2 3.8 5.9 8.6 5.9s8.6-2.6 8.6-5.9l-.1-.9c.3-.3.5-.8.5-1.3Zm-14.2 1.6a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0Zm8.9 4.2c-.8.8-2.3 1.2-4.4 1.2h-.4c-2.1 0-3.6-.4-4.4-1.2a.6.6 0 0 1 .8-.8c.6.6 1.9.9 3.8.9h.4c1.9 0 3.2-.3 3.8-.9a.6.6 0 0 1 .8 0c.2.2.2.6-.2.8Zm-.3-2.6a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z',
      },
      {
        name: 'Facebook',
        intent: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        icon: 'M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z',
      },
    ];
  }

  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      placement: { type: String as PropType<BlogShare.Placement>, required: true },
    });
  }

  static get propsDefaults() {
    return {};
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: BlogShare.Props) {
    this.route = useRoute();
    this.page = useData().page;
    onMounted(() => this.detectNativeShare());
  }

  // resolved in setup (the constructor) — inject() needs the component instance
  protected readonly route: ReturnType<typeof useRoute>;
  protected readonly page: ReturnType<typeof useData>['page'];

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogShare;
  }

  // STATE
  // the OS share sheet covers every network we don't list — mobile only,
  // where it exists and where it shines; detected on mount (no navigator in SSR)
  get nativeShareAvailable() {
    return ref(false);
  }
  get copied() {
    return ref(false);
  }

  // PROPS
  get placement() {
    return this.props.placement;
  }

  // DERIVED
  /** Only on blog articles — never the index, never guide pages. */
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }
  get shareUrl() {
    return this.self.SITE_ORIGIN + this.route.path.replace(/\.html$/, '');
  }
  get shareTitle() {
    return this.page.value.title;
  }
  get placementClass() {
    return `blog-share--${this.placement}`;
  }
  get copyLabel() {
    return this.copied.value ? 'Copied!' : 'Copy link';
  }
  get copyAriaLabel() {
    return this.copied.value ? 'Link copied' : 'Copy link';
  }

  /** The intent links for this page — url and title encoded once. */
  get targets(): BlogShare.Target[] {
    const url = encodeURIComponent(this.shareUrl);
    const title = encodeURIComponent(this.shareTitle);
    return this.self.networks.map((network) => ({
      name: network.name,
      href: network.intent(url, title),
      icon: network.icon,
    }));
  }

  shareLabel(target: BlogShare.Target) {
    return `Share on ${target.name}`;
  }

  // ACTIONS
  detectNativeShare() {
    this.nativeShareAvailable.value = typeof navigator.share === 'function';
  }

  nativeShare() {
    void navigator.share({ title: this.shareTitle, url: this.shareUrl });
  }

  async copyLink() {
    try {
      // clipboard API exists only in secure contexts (https / localhost) —
      // LAN-IP dev sessions need the selection fallback
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.shareUrl);
      } else {
        this.copyThroughSelection();
      }
      this.copied.value = true;
      setTimeout(() => this.resetCopied(), this.self.COPIED_MS);
    } catch {
      /* clipboard refused — leave the label unchanged rather than lie */
    }
  }

  copyThroughSelection() {
    const holder = document.createElement('textarea');
    holder.value = this.shareUrl;
    holder.style.position = 'fixed';
    holder.style.opacity = '0';
    document.body.appendChild(holder);
    holder.select();
    document.execCommand('copy');
    holder.remove();
  }

  resetCopied() {
    this.copied.value = false;
  }
}

export namespace BlogShare {
  export const $Class = Static($BlogShare); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  /* Types */

  export type Placement = 'aside' | 'doc';
  export type Props = ExtractPropTypes<typeof $Class.props>;

  export interface Network {
    name: string;
    /** url and title arrive already URI-encoded */
    intent: (url: string, title: string) => string;
    icon: string;
  }

  export interface Target {
    name: string;
    href: string;
    icon: string;
  }
}
