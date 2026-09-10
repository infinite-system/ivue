// Secrets set via `wrangler secret put` that never appear in
// wrangler.jsonc, so `wrangler types` only knows them when a local
// .dev.vars happens to list them. Declared here so the types hold in
// every checkout. The three required ones are always set in production;
// the X four are optional: the Worker degrades gracefully (503 on
// /admin/tweet) until they exist.
interface Env {
  ADMIN_SECRET: string;
  POSTMARK_SERVER_TOKEN: string;
  TURNSTILE_SECRET: string;
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_SECRET?: string;
}
