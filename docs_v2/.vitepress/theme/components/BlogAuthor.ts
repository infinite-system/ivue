import { useRoute, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';

// The author card under a blog post — the same card as community.md's
// "Who's behind ivue" (the cm-author styles in custom.css paint both).
class $BlogAuthor {
  constructor() {
    this.route = useRoute();
  }

  protected readonly route: ReturnType<typeof useRoute>;

  // DERIVED — the card shows on a post, never on the index
  get isBlogPost() {
    const path = this.route.path;
    return /^\/blog\/.+/.test(path) && !path.endsWith('/blog/');
  }

  get avatarSrc() {
    return withBase('/avatars/evgeny-avatar.jpg');
  }
}

export namespace BlogAuthor {
  export const $Class = $BlogAuthor; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
