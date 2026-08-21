import { Static } from 'ivue/extras';

// The post catalog. Email CONTENT is rendered at SITE build time
// (docs_v2/scripts/blog-email-renderer.mjs) and rides blog-index.json —
// this module only fetches and filters it. Template changes therefore
// ship via a site push, never a Worker deploy.
class $Posts {
  static async load(env: Env): Promise<Post[]> {
    const response = await fetch(`${env.SITE_ORIGIN}/blog-index.json`);
    if (!response.ok) throw new Error(`blog-index.json ${response.status}`);
    const posts = (await response.json()) as Post[];
    // deploy-order skew guard: a Worker newer than the deployed site would
    // read posts without emailHtml — skip them loudly instead of throwing
    const ready = posts.filter((post) => typeof post.emailHtml === 'string');
    if (ready.length < posts.length) {
      console.error(
        JSON.stringify({
          event: 'posts_missing_email_html',
          missing: posts.length - ready.length,
          hint: 'deploy the site (blog-index.json is stale)',
        }),
      );
    }
    return ready; // sorted oldest-first by the generator
  }

  static find(posts: Post[], slug: string): Post | undefined {
    return posts.find((candidate) => candidate.slug === slug);
  }

  // The catalog without the heavy bodies — what list views and pickers
  // need; emailHtml and plainText are kilobytes per post and stay
  // server-side (plainText travels via /admin/post-text on demand).
  static summaries(posts: Post[]): PostSummary[] {
    return posts.map(
      ({ emailHtml: _emailHtml, plainText: _plainText, ...summary }) => ({
        ...summary,
        embedImages: summary.embedImages ?? [],
      }),
    );
  }
}

export namespace Posts {
  export const $Class = Static($Posts);
  export let Class = $Class;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  url: string;
  date: string | null;
  timestamp: number;
  // committed embed screenshots (the X composer's attachable images)
  embedImages?: string[];
  // plain-text body rendition — the thread composer's raw material
  plainText?: string;
  // the complete email body, rendered at site build time; one
  // {{UNSUBSCRIBE_URL}} placeholder remains for the Worker to fill
  emailHtml: string;
}

export type PostSummary = Omit<Post, 'emailHtml' | 'plainText'> & {
  embedImages: string[];
};
