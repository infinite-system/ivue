# ivue newsletter Worker

Subscribe endpoint + audience + send ledger (all D1) + daily drip cron.
Postmark delivers the email; this Worker decides who gets what, when.
TypeScript — wrangler compiles `src/index.ts` directly; `npx
wrangler@4.120.1 types` regenerates `worker-configuration.d.ts` (the
typed Env) after any config change, and `npx tsc --noEmit` typechecks.

**The invariant:** at most one email per (subscriber, post), ever. The
`sends` table is the invariant; the drip picks each subscriber's **oldest
unsent** post, so an ad-hoc `/broadcast` today can never be repeated by the
drip later — there is no exclusion logic, just the ledger.

Cadence: one email per subscriber at most every `CADENCE_HOURS` (default
40h ≈ every other day). A broadcast counts as that day's email.

The Worker is written to invar's ivue class conventions (namespace-pattern
`Static()` capability classes under `src/modules/`) and doubles as an ivue
example — see `CONVENTIONS.md` and `scripts/conventions-gate.sh`.

## Admin dashboard (`dashboard/`)

A Vue 3 + ivue application (Reactive view models, Static capabilities —
built from this repo's own `lib/` source) that manages the whole system:
subscribers with search/pagination/bulk actions and a per-subscriber
drawer listing every email they have received, the post catalog with an
exact-email preview, targeted sends (ledger-checked, explicit force to
allow a repeat), arm-to-confirm broadcast/drip, the drip plan preview
(same code path as the cron), and stats.

- **Production**: the Vite build ships as this Worker's static assets —
  open the Worker origin, paste `ADMIN_SECRET` into the login gate (kept
  in sessionStorage only; every `/admin/*` call is Bearer-checked
  timing-safe server-side).
- **Local dev**: `npm run admin` (from the repo root; `--host` exposes it
  on the LAN) — the dev proxy attaches `ADMIN_SECRET` from
  `newsletter/.env` server-side (no login screen, the secret never
  reaches the browser). Defaults to the LIVE Worker (real data); set
  `DEV_WORKER_ORIGIN=http://localhost:8787` in `newsletter/.env` to
  target a local `wrangler dev` instead.

```sh
# build the dashboard (required before wrangler deploy — assets ride along)
npm run build:admin

# quality gate: tsc (Worker + dashboard) + 46-test suite + conventions greps
newsletter/scripts/conventions-gate.sh

# local end-to-end walk (21 Playwright checks against wrangler dev + local D1)
npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --local   # from newsletter/
npx wrangler@4.120.1 dev --port 8787 \
  --var ADMIN_SECRET:e2e-local-secret --var POSTMARK_SERVER_TOKEN:invalid-local-token
node newsletter/scripts/e2e-walk.mjs                                # from repo root

# production walk (read-only + one sanctioned test send)
set -a; . newsletter/.env; set +a
E2E_ADMIN_SECRET="$ADMIN_SECRET" \
E2E_BASE_URL=https://ivue-newsletter.ekalashnikov.workers.dev \
E2E_SEND_TO=newsletter@ivue.dev node newsletter/scripts/prod-walk.mjs
```

Lists: migration 0002 gives subscribers a `list` column (default
`newsletter` — the only list the cron drips). The same address may join
several lists; an unsubscribe suppresses the ADDRESS globally, matching
Postmark's per-address suppression. `/subscribe` and `/admin/subscribers/add`
accept an optional `list`; `/broadcast` accepts `{slug, list}`.

## One-time setup

1. **Postmark account** at postmarkapp.com ($15/mo for 10k emails after
   the ~100-email trial; trial only sends to addresses on your own
   verified domain — perfect for testing this Worker end-to-end free).

   - Add **Sender Signature / domain** `ivue.dev` and set the DKIM +
     Return-Path DNS records it shows (Cloudflare DNS, 5 minutes).
   - In your server, create a **Broadcasts message stream** (newsletters
     must not ride the transactional stream — Postmark enforces this).
     Put its id in `wrangler.jsonc` → `POSTMARK_STREAM` (ours: `newsletter`).
   - Copy the **Server API token** (server → API Tokens).

2. **Create the database and run migrations** (from this directory):

   ```sh
   npx wrangler@4.120.1 d1 create ivue-newsletter
   #   → paste the printed database_id into wrangler.jsonc
   npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote
   ```

   Schema lives in `migrations/` as sequential SQL files (same model as
   Knex migrations: an applied-migrations table in the database, each
   file runs exactly once). New schema change → new file:

   ```sh
   npx wrangler@4.120.1 d1 migrations create ivue-newsletter add_thing
   #   → edit the generated migrations/000N_add_thing.sql
   npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote
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
   - Deploy command:
     `npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote && npx wrangler@4.120.1 deploy`
   - Build watch paths: `newsletter/**`

   Migrations apply before the new Worker goes live, and already-applied
   files are skipped — so pushing a migration deploys schema and code
   together.

   From then on `git push` deploys site and Worker independently, each
   only when its own files changed. Secrets and the D1 binding live on
   the Worker and survive every deploy.

6. **Point the site form at the Worker:** set `NEWSLETTER_ENDPOINT` in
   `docs_v2/.vitepress/theme/components/NewsletterSignup.vue` to the same
   URL, rebuild, deploy the site.

7. **Turnstile (bot gate on /subscribe)** — dashboard → Turnstile → Add
   widget: hostnames `ivue.dev` (plus `localhost` for dev), mode
   Managed. Then:

   - sitekey → `TURNSTILE_SITE_KEY` in `NewsletterSignup.vue`
   - secret → `npx wrangler@4.120.1 secret put TURNSTILE_SECRET`

   Verification activates only when the secret is set (fails closed:
   token required, action `newsletter`, hostname must be in
   `TURNSTILE_HOSTNAMES`), so the widget and the gate roll out
   together. Until then `/subscribe` accepts un-gated requests.

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

## How the drip finds posts — and what it sends

The site build emits `https://ivue.dev/blog-index.json`
(`docs_v2/scripts/blog-index-generator.mjs`, chained into `build:docs`):
slugs, subjects, dates sorted oldest-first, and each post's COMPLETE
email HTML, rendered deterministically at build time by
`docs_v2/scripts/blog-email-renderer.mjs` — lockup header, banner, full
post body (code blocks, tables, quotes, lists), interactive embeds as
committed screenshots ("click to view the live example"), author badge,
and newer/older post cards. The Worker substitutes only the
per-recipient `{{UNSUBSCRIBE_URL}}` placeholder.

Publishing a post requires no Worker change. If the post embeds an
interactive component, run `npm run render:embeds` locally after
`build:docs` and commit the PNG (the Cloudflare build has no browser).
Preview any post's email:

```sh
node docs_v2/scripts/blog-email-renderer.mjs <slug> > /tmp/email.html
```

## Notes

- Per-message batch outcomes are honored: only `ErrorCode 0` (accepted)
  writes the ledger; rejected recipients are logged and naturally retried
  or surfaced. Postmark's own suppression list (hard bounces, spam
  complaints) blocks on their side in addition to our `unsubscribes`.
- Subscribers live ONLY in D1 — back up with
  `npx wrangler@4.120.1 d1 export ivue-newsletter --remote --output=backup.sql`
  before schema changes.

## Command reference (everything used to operate this)

All wrangler commands run **from `newsletter/`** — the repo root's
wrangler.jsonc is the SITE's assets Worker, so root-run `tail`/`deploy`
hit the wrong Worker. Wrangler pinned to 4.120.1 (LESSONS.md).

```sh
# ---- deploy & observe -------------------------------------------------
npx wrangler@4.120.1 deploy            # deploy the newsletter Worker
npx wrangler@4.120.1 tail              # live logs (run during any test)
npx wrangler@4.120.1 types             # regenerate typed Env after config edits
npx tsc --noEmit                       # typecheck the Worker

# ---- database ---------------------------------------------------------
npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote
npx wrangler@4.120.1 d1 migrations create ivue-newsletter <name>
npx wrangler@4.120.1 d1 execute ivue-newsletter --remote \
  --command='SELECT email, name, subscribed_at FROM subscribers'
npx wrangler@4.120.1 d1 execute ivue-newsletter --remote \
  --command='SELECT * FROM sends'
npx wrangler@4.120.1 d1 execute ivue-newsletter --remote \
  --command='SELECT * FROM unsubscribes'
npx wrangler@4.120.1 d1 export ivue-newsletter --remote --output=backup.sql

# ---- secrets (take effect immediately, no redeploy) --------------------
npx wrangler@4.120.1 secret put POSTMARK_SERVER_TOKEN
npx wrangler@4.120.1 secret put ADMIN_SECRET
npx wrangler@4.120.1 secret put TURNSTILE_SECRET
npx wrangler@4.120.1 secret list

# ---- the endpoints ----------------------------------------------------
WORKER=https://ivue-newsletter.ekalashnikov.workers.dev

# subscribe (Turnstile enforced once TURNSTILE_SECRET is set — browser only then)
curl -X POST "$WORKER/subscribe" -H 'content-type: application/json' \
  -d '{"name":"Evgeny","email":"evgeny@ivue.dev"}'

# run a drip pass now (what the 13:00 UTC cron does)
curl -X POST "$WORKER/drip" -H "authorization: Bearer $ADMIN_SECRET"

# send one post to everyone who never received it
curl -X POST "$WORKER/broadcast" \
  -H "authorization: Bearer $ADMIN_SECRET" -H 'content-type: application/json' \
  -d '{"slug":"circular-imports-dissolved"}'

# unsubscribe links are per-recipient HMAC URLs — take one from a real email

# ---- content pipeline (repo root) --------------------------------------
npm run sync:blog-index    # re-render all emails into blog-index.json
node docs_v2/scripts/blog-email-renderer.mjs <slug> > /tmp/email.html  # preview
npm run render:embeds      # screenshot interactive embeds (local only; commit PNGs)
npm run build:docs         # full site build + link gate

# ---- site fast-lane deploy (repo ROOT, not newsletter/) ----------------
# push = source of truth; this is the hotfix lane. ALWAYS build first.
npm run build:docs && npx wrangler@4.120.1 deploy
```

Debug decoder ring (from the launch — details in LESSONS.md):
`siteverify 400` → malformed secret (trim/newline) · `invalid-input-secret`
→ sitekey pasted as secret · Postmark 1235 → stream and token belong to
different servers · Cloudflare 1101 on /drip → Worker/site deploy skew
(stale blog-index.json) · `delivered: 0` → check tail for
`postmark_message_rejected` / `posts_missing_email_html`.
