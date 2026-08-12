# ivue newsletter Worker

Subscribe endpoint + send ledger (D1) + daily drip cron. Brevo holds the
contact list and delivers email; this Worker decides who gets what, when.

**The invariant:** at most one email per (subscriber, post), ever. The
`sends` table is the invariant; the drip picks each subscriber's **oldest
unsent** post, so an ad-hoc `/broadcast` today can never be repeated by the
drip later — there is no exclusion logic, just the ledger.

Cadence: one email per subscriber at most every `CADENCE_HOURS` (default
40h ≈ every other day). A broadcast counts as that day's email.

## One-time setup

1. **Brevo account** (free: 300 emails/day) at brevo.com

   - Create a contact list; put its numeric id in `wrangler.jsonc` →
     `BREVO_LIST_ID` (Contacts → Lists — the id is in the URL).
   - Verify the sending domain (Senders & Domains → add `ivue.dev`, set the
     DKIM/DMARC DNS records it shows — Cloudflare DNS, 5 minutes).
   - Create an API key (SMTP & API → API keys).

2. **Create the database and apply the schema** (from this directory):

   ```sh
   npx wrangler@4.120.1 d1 create ivue-newsletter
   #   → paste the printed database_id into wrangler.jsonc
   npx wrangler@4.120.1 d1 execute ivue-newsletter --remote --file=schema.sql
   ```

3. **Secrets:**

   ```sh
   npx wrangler@4.120.1 secret put BREVO_API_KEY
   npx wrangler@4.120.1 secret put ADMIN_SECRET   # long random string
   ```

4. **Deploy** (wrangler pinned — see LESSONS.md on 4.121.0):

   ```sh
   npx wrangler@4.120.1 deploy
   ```

   Paste the printed `*.workers.dev` URL into `wrangler.jsonc` →
   `WORKER_ORIGIN` and deploy once more (unsubscribe links embed it).

5. **Point the site form at the Worker:** set `NEWSLETTER_ENDPOINT` in
   `docs_v2/.vitepress/theme/components/NewsletterSignup.vue` to the same
   URL, rebuild, deploy the site.

## Verify before real subscribers

Subscribe with your own address via the site form (or curl), then force a
drip pass instead of waiting for the cron:

```sh
curl -X POST "$WORKER/subscribe" -H 'content-type: application/json' \
  -d '{"name":"Evgeny","email":"you@example.com"}'
npx wrangler@4.120.1 triggers deploy   # or: dashboard → Trigger cron
```

Check that the email arrives, the **unsubscribe link resolves** (params
substitution in `htmlContent` — the one Brevo behavior worth an eyeball),
and the ledger recorded it:

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
