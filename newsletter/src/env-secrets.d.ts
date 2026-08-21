// Secrets set via `wrangler secret put` that never appear in
// wrangler.jsonc or .dev.vars, so `wrangler types` cannot know them.
// Optional: the Worker degrades gracefully (503 on /admin/tweet) until
// they exist.
interface Env {
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_SECRET?: string;
}
