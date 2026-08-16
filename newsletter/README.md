# ivue newsletter Worker

Subscribe endpoint + audience + send ledger (all D1) + daily drip cron.
Postmark delivers the email; this Worker decides who gets what, when.

**The invariant:** at most one email per (subscriber, post), ever. The
`sends` table is the invariant; the drip picks each subscriber's **oldest
unsent** post, so an ad-hoc `/broadcast` today can never be repeated by the
drip later — there is no exclusion logic, just the ledger.

Cadence: one email per subscriber at most every `CADENCE_HOURS` (default
40h ≈ every other day). A broadcast counts as that day's email.

## One-time setup

1. **Postmark account** at postmarkapp.com ($15/mo for 10k emails after
   the ~100-email trial; trial only sends to addresses on your own
   verified domain — perfect for testing this Worker end-to-end free).

   - Add **Sender Signature / domain** `ivue.dev` and set the DKIM +
     Return-Path DNS records it shows (Cloudflare DNS, 5 minutes).
   - In your server, create a **Broadcasts message stream** (newsletters
     must not ride the transactional stream — Postmark enforces this).
     Put its id in `wrangler.jsonc` → `POSTMARK_STREAM` (default id is
     `broadcasts`).
   - Copy the **Server API token** (server → API Tokens).

2. **Create the database and apply the schema** (from this directory):

   ```sh
   npx wrangler@4.120.1 d1 create ivue-newsletter
   #   → paste the printed database_id into wrangler.jsonc
   npx wrangler@4.120.1 d1 execute ivue-newsletter --remote --file=schema.sql
   ```

3. **Secrets:**

   ```sh
   npx wrangler@4.120.1 secret put POSTMARK_SERVER_TOKEN
   npx wrangler@4.120.1 secret put ADMIN_SECRET   # long random string
   ```

4. **Deploy** (wrangler pinned — see LESSONS.md on 4.121.0):

   ```sh
   npx wrangler@4.120.1 deploy
   ```

   Paste the printed `*.workers.dev` URL into `wrangler.jsonc` →
   `WORKER_ORIGIN` and deploy once more (unsubscribe links embed it).

5. **Auto-deploy on push** (Cloudflare dashboard, one-time): create a
   SECOND Workers Builds project on the same GitHub repo —

   - Root directory: `newsletter/`
   - Deploy command: `npx wrangler@4.120.1 deploy`
   - Build watch paths: `newsletter/**`

   From then on `git push` deploys site and Worker independently, each
   only when its own files changed. Secrets and the D1 binding live on
   the Worker and survive every deploy.

5. **Point the site form at the Worker:** set `NEWSLETTER_ENDPOINT` in
   `docs_v2/.vitepress/theme/components/NewsletterSignup.vue` to the same
   URL, rebuild, deploy the site.

## Verify before real subscribers

Subscribe with your own address via the site form (or curl), then force a
drip pass instead of waiting for the cron:

```sh
curl -X POST "$WORKER/subscribe" -H 'content-type: application/json' \
  -d '{"name":"Evgeny","email":"you@ivue.dev"}'
# dashboard → Workers → ivue-newsletter → Triggers → run cron now
```

Check the email arrives in the INBOX (not spam), the unsubscribe link
works, and the ledger recorded it:

```sh
npx wrangler@4.120.1 d1 execute ivue-newsletter --remote \
  --command='SELECT * FROM sends'
```

## Ad-hoc broadcast (also the future MCP tool surface)

```sh
curl -X POST "$WORKER/broadcast" \
  -H "authorization: Bearer $ADMIN_SECRET" \
  -H 'content-type: application/json' \
  -d '{"slug":"circular-imports-dissolved"}'
```

Sends that post now to everyone who never received it, writes the ledger,
and reports `{recipients, skippedAsRepeat}`.

## How the drip finds posts

The site build emits `https://ivue.dev/blog-index.json`
(`docs_v2/scripts/blog-index-generator.mjs`, chained into `build:docs`) —
slugs, titles, descriptions, dates, sorted oldest-first. Publishing a post
requires no Worker change: it appears in the index, and everyone who is
caught up receives it as their next drip email.

## Notes

- Per-message batch outcomes are honored: only `ErrorCode 0` (accepted)
  writes the ledger; rejected recipients are logged and naturally retried
  or surfaced. Postmark's own suppression list (hard bounces, spam
  complaints) blocks on their side in addition to our `unsubscribes`.
- Subscribers live ONLY in D1 — back up with
  `npx wrangler@4.120.1 d1 export ivue-newsletter --remote --output=backup.sql`
  before schema changes.
