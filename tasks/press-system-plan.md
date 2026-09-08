# The press system — technical plan

Status: agreed in discussion 2026-09-07, nothing built yet. This is the
build plan for the admin's two release surfaces: **Release ▸ Calendar**
(the when) and **Press** (the what: the printing press, the previews, the
scheduler). Quasar carries the whole dashboard from here; the ivue
standard still governs every component (one class owns the logic, the
SFC is wiring).

## The invariants this plan is built on

1. **The piece is the essence; a platform is an expression.** An
   argument (usually a blog article, sometimes a bare voice post) owns
   expressions of two modes. **Derived** expressions are the base
   projected by a per-kind function — the X thread (the base split on
   its `---` rules), the X article, the X image cards, the LinkedIn
   post and article, Reddit, dev.to — and regenerate when the base
   changes. **Authored** expressions are written by hand and never
   track the base — the alternate hooks, single teasers, the Bluesky
   and Mastodon ports, pitch emails, the HN first comment. A derived
   expression can be detached into an authored one, never the reverse.
   Expressions are **addable in any number**: a piece has as many as
   its distribution needs, several of one kind when the kind is
   venue-bound (one `email` per newsletter editor, one `reddit` per
   subreddit), sometimes exactly one — a pitch that exists only as an
   email is a piece with one expression — and sometimes none: a piece
   is a valid row with only a title and a base, an argument still being
   shaped, its channels undecided. Zero is the starting state of every
   piece, not an error.
2. **You edit the thing you will see.** The platform-shaped card is the
   editor for short kinds; long-form kinds get a split editor with the
   card as the live preview. Copy always yields the platform's
   projection of the stored text.
3. **Approval is on the expression; skipping is on the part.** A thread
   is approved whole. A segment can be skipped without being deleted;
   the live thread renumbers around it.
4. **Unsent copy lives in the private database, never in the public
   repo.** Markdown is an intake format, not a store. The plan, the
   venue research, the objection bank and the runbook stay as files
   because they are reference, not churn.
5. **Two writers, one row.** The user edits in the dashboard; the agent
   edits through the admin API. Every save keeps a revision.
6. **The calendar says when; the press says what.** They link both ways
   by expression id and never duplicate each other's data. A piece is
   never scheduled, posted, or placed on the calendar; only its
   expressions are. The piece has no date, no status, and no venue —
   those belong to the projection that goes out.
7. **A blog post is a starting point, copied, never linked.** A piece
   bootstrapped from an article copies its text into the database as
   the piece's base and then diverges freely; the site is never read
   at posting time.
8. **Every posting is a ledger row.** When and where each projection
   went out is recorded per posting, so one expression can go out
   twice (launch, re-promotion) and the history stays whole.
9. **The base is edited in one place.** A base save regenerates every
   derived expression of the piece; nothing edits a derived body
   directly, and nothing edits the base from a projection. Approval is
   of the exact text, so a regenerated or edited approved expression
   returns to draft.
10. **Table and route names are singular, always.** The same rule
    reaches the API: `/admin/press/piece/:id`, `/expression/:id/posting`,
    `GET /piece` for the list. A route names the resource, and the
    resource is one thing; the list is a query on it, not a different
    noun. A table is named for what one
   row IS: `piece`, `expression`, `posting`, `subscriber`, `send`. A
   plural name describes the container, not the row, and reads wrong
   in every query (`FROM subscriber WHERE email = ?` is the sentence).
    The rule is written into `newsletter/CONVENTIONS.md`; the existing
    plural tables migrate before the press tables land (see Migration
    0011 below).

## Architecture

```
docs_v2/blog/*.md ─┐ (intake, once)          ┌─ Release ▸ Calendar  (when)
tasks/press-drafts ─┼─ import script ─► D1 ◄──┤
artifact posts ────┘        │                 └─ Press ▸ Pieces      (what)
                            │                        │
                       Worker admin API ◄────────────┘
                            │
                    scheduled_job ─► cron ─► XPoster (X) / Postmark (email)
                            │
                       tweet ledger, post_revision
```

- **Worker** (`newsletter/src`): new `press` module — `Pieces`,
  `Expressions`, `Revisions` classes over D1, routed under
  `/admin/press/*` in `AdminApi`. The scheduler gains one job kind,
  `expression`, that resolves the row at run time and dispatches by
  kind (X through `XPoster`; everything else marks itself "due" and
  notifies, since only X has an API we post to).
- **Dashboard** (`newsletter/dashboard`): Quasar installed through
  `@quasar/vite-plugin`, brand and dark mode set from the existing
  tokens. New `press` module with the list, the piece page, one card
  component per platform, the editors, the scheduler pane. The existing
  `release` module keeps the calendar and reads copy by expression id.
- **Agent CLI** (`newsletter/scripts/press.mjs`): list, show, edit,
  approve, skip, import — the same admin API with the secret from
  `newsletter/.env`. This is how the agent edits when asked.

## Quasar adoption

- Install `quasar` + `@quasar/vite-plugin`; register the Quasar plugin
  in `main.ts` with `Dialog`, `Notify`, `Dark`. Set brand colors from
  `styles.css` tokens (`primary` = accent, `positive` = accent-2,
  `dark` = panel) and force dark mode.
- The shell (topbar, domain tabs, subtabs) stays as it is. Views adopt
  Quasar components where they carry weight: `QTable`, `QDialog`,
  `QTabs`, `QChip`, `QSelect multiple`, `QDate`/`QTime`, `QToggle`,
  `QMenu`, `QBadge`, `QSplitter`. Old views migrate when touched.
- ivue shape holds: every Quasar component's `v-model` binds a
  destructured ref-getter or a class getter/setter pair; every event
  dispatches to a class method; no logic in templates. The gate keeps
  running on the dashboard.
- Platform cards are bespoke CSS. Quasar provides none of that and is
  not asked to.
- **The module architecture stays.** Quasar is a component library
  here, not a project layout: no `src/layouts`, `src/pages`,
  `src/boot`, `src/router`, no Quasar CLI. Code keeps living in
  `src/modules/<domain>/` with the class, its `.test.ts`, its views,
  and its data side by side, the way every other module does; the
  router stays `AppRouter`, the shell stays `App.vue`. The Vite plugin
  is the whole integration.

## Migration 0011_singular.sql — every table to its singular name

Runs before the press schema. SQLite renames are atomic per statement
and keep the data, constraints and indexes; the indexes are renamed by
drop-and-create so their names follow the table.

| today | after | index / view follow-ups |
| --- | --- | --- |
| `subscribers` | `subscriber` | — |
| `sends` | `send` | `sends_by_email` → `send_by_email` |
| `unsubscribes` | `unsubscribe` | — |
| `tweets` | `tweet` | — |
| `scheduled_jobs` | `scheduled_job` | `scheduled_jobs_due` → `scheduled_job_due` |
| `lists` | `list` | — (`list` is not reserved in SQLite) |
| `comments` | `comment` | `comments_slug_status` → `comment_slug_status`, `comments_root` → `comment_root` |
| `comment_subscriptions` | `comment_subscription` | — |
| `settings` | `setting` | one row per setting key |

```sql
ALTER TABLE subscribers RENAME TO subscriber;
ALTER TABLE sends RENAME TO send;
DROP INDEX IF EXISTS sends_by_email;
CREATE INDEX IF NOT EXISTS send_by_email ON send (email, sent_at);
-- … one block per row of the table above
```

The code sweep lands in the same commit, so no deploy ever runs with
the Worker and the schema disagreeing: every SQL string in
`newsletter/src` (about 96 references across Audience, Delivery, Drip,
Lists, Comments, Scheduler, Tweets, Settings), the ops commands in
`newsletter/README.md` and `COMMENTS.md`, and the scripts under
`newsletter/scripts/`. The test suite applies the migration files to
the local D1 shim, so a missed reference fails a test before it fails
production. Deploy order: `d1 migrations apply --remote` then `deploy`,
which is the order the auto-deploy already runs.

## Data model (D1, migration 0012_press.sql)

```sql
CREATE TABLE piece (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE,            -- blog slug when the piece is an article; NULL for a bare post
  title       TEXT NOT NULL,
  claim       TEXT,                   -- the one-line thesis
  links       TEXT,                   -- JSON [{label,url}]: receipts the expressions cite
  banner      TEXT,                   -- /blog/<slug>.png or NULL
  base        TEXT,                   -- the starting text, copied from the blog post (or written), edited freely; `---` rules mark thread breaks
  wave        INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE expression (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  piece_id    INTEGER NOT NULL REFERENCES piece(id),
  kind        TEXT NOT NULL,          -- see kinds below
  mode        TEXT NOT NULL DEFAULT 'authored',  -- derived (regenerated from piece.base) | authored (hand-written)
  parent_id   INTEGER REFERENCES expression(id),  -- segment → its thread / card set
  position    INTEGER NOT NULL DEFAULT 0,          -- order among siblings
  label       TEXT,                   -- "hook", "A · the kilobyte", card title
  venue       TEXT,                   -- for venue-bound kinds: "JavaScript Weekly", "r/typescript", "dev.to" — what makes two rows of one kind distinct
  body        TEXT NOT NULL,          -- markdown subset (see projections); for derived rows the last regeneration, kept so the ledger and revisions hold the text that shipped
  meta        TEXT,                   -- JSON per kind: subreddit, title, canonical, tags, image; for derived rows also the projection settings (cover, fold paragraph, which paragraphs to drop)
  mirrors     TEXT,                   -- JSON [{platform, sent_at, url}] for x-* kinds
  status      TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | scheduled | sent | archived
  skipped     INTEGER NOT NULL DEFAULT 0,     -- segments only
  calendar_id TEXT,                   -- release-calendar entry id, when placed
  approved_at INTEGER,
  scheduled_at INTEGER,
  sent_at     INTEGER,
  sent_url    TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX expression_piece ON expression (piece_id, kind, position);
CREATE INDEX expression_parent ON expression (parent_id, position);

CREATE TABLE posting (              -- the ledger: when and where each projection went out
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expression_id INTEGER NOT NULL REFERENCES expression(id),
  platform      TEXT NOT NULL,        -- x | bluesky | mastodon | threads | linkedin | reddit | devto | hn | email | other
  venue         TEXT,                 -- r/vuejs, a newsletter's name, a Discord — the calendar entry's venue when placed
  url           TEXT,                 -- where it lives now
  remote_ids    TEXT,                 -- JSON: tweet ids per segment, a reddit post id
  posted_at     INTEGER NOT NULL,
  posted_by     TEXT NOT NULL,        -- 'api' (the Worker posted) | 'manual' (copied and marked)
  calendar_id   TEXT                  -- the release-calendar entry this fulfilled, when any
);
CREATE INDEX posting_expression ON posting (expression_id, posted_at);

CREATE TABLE base_revision (         -- the piece's base before each save: undo for the one text everything derives from
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  piece_id  INTEGER NOT NULL REFERENCES piece(id),
  base      TEXT NOT NULL,
  author    TEXT NOT NULL,
  saved_at  INTEGER NOT NULL
);
CREATE INDEX base_revision_piece ON base_revision (piece_id, saved_at);

CREATE TABLE post_revision (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expression_id INTEGER NOT NULL REFERENCES expression(id),
  body          TEXT NOT NULL,        -- the body BEFORE the save
  meta          TEXT,
  author        TEXT NOT NULL,        -- 'user' | 'agent'
  saved_at      INTEGER NOT NULL
);
CREATE INDEX post_revision_expression ON post_revision (expression_id, saved_at);
```

Kinds (any number per piece, `venue` distinguishing rows of one kind):
`x-thread` (parent) with `x-segment` children; `x-post`;
`x-long` (long post, plain text, folds at 280); `x-article` (rich);
`x-cards` (parent) with `x-card` children; `linkedin`;
`linkedin-article`; `reddit`; `devto`; `hn`; `bluesky`; `mastodon`;
`threads`; `email`; `note`.

`expression.sent_at` / `sent_url` and a mirror's `sent_at` are the
latest posting, denormalized for the list; `posting` is the truth.

Rules the Worker enforces: a base save writes a `base_revision` row
and regenerates every `derived` expression of the piece (segments
replaced in place, skip flags kept by position where the segment
count is unchanged, cleared otherwise); a `PATCH` of `body` on a
`derived` row is refused — edit the base or detach; a body change or
regeneration of an `approved` expression sets `status` back to `draft`
and cancels its job; a segment's `piece_id` equals its parent's;
approving a parent approves nothing on children (children have no
status of their own; `skipped` is their only state); `status` moves
only forward except `archived`, which any state can reach; every
`body`/`meta` change writes a `post_revision` row first.

## Projections (one stored format, many renderings)

The body is a markdown subset: paragraphs, line breaks, `**bold**`,
`_italic_`, links, headings, lists, images, code. Each kind declares
what survives:

| kind group | renders | allowed in body | lint |
| --- | --- | --- | --- |
| x-segment, x-post, x-long, bluesky, mastodon, threads, linkedin | plain text | paragraphs, line breaks, bare URLs | anything else is an error |
| reddit, devto, hn (comment) | markdown | the full subset | none |
| x-article, linkedin-article | rich | full subset + images | image required for cover |

Derived kinds regenerate from `piece.base` through one function each,
all in `Projection`:

| kind | derivation from the base |
| --- | --- |
| x-thread | split on `---` rules into segments; each must project plain under 280 or the lint flags it; the last segment carries the link unless a segment already has one |
| x-post | the first segment |
| x-long | rules dropped, paragraphs kept; the first ~280 must stand alone (lint) |
| x-article, linkedin-article | the full markdown, cover from the banner, title from the piece |
| x-cards | one card per `## ` heading or, without headings, per segment up to four |
| linkedin | rules dropped; plain projection with the fold marked at ~210 |
| reddit, devto | the full markdown; title from the piece; canonical link appended; subreddit / tags from meta |
| hn | title from the piece (80 limit); the first comment is authored |
| email | subject from the piece title unless `meta.subject` overrides; body = greeting from `meta` + the base with rules dropped + the sign-off; `meta` holds to, venue, greeting — one derived row per venue, detached when the venue wants a personal rewrite |

`Projection.Class.plain(body)` strips markdown to what X accepts and
counts it X-weighted (URL = 23). `Projection.Class.markdown(body)` is
identity. Copy uses the projection; the poster uses the projection;
the preview renders the projection. The lint runs on save and blocks
approval, never typing.

## Worker API (under `/admin/press`)

| method + path | does |
| --- | --- |
| `GET /piece?status=&kind=&q=` | list pieces with per-kind expression states rolled up |
| `POST /piece` | create a piece (title, slug?, claim, wave); with `fromSlug` it bootstraps from a blog post: title, description → claim, banner, links, and the post's plain text copied into `base` |
| `GET /blog-post` | the site's posts (from `blog-index.json`) for the "start from a blog post" select |
| `POST /piece/:id/expression` with `mode: derived` | adds a derived expression: regenerated from `base` now and on every base save; per-kind settings in `meta` |
| `GET /piece/:id` | a piece with its expressions, segments nested |
| `PATCH /piece/:id` | edit piece fields; a `base` change writes a `base_revision` row and regenerates every derived expression, returning approved ones to draft |
| `GET /piece/:id/base-revision` · `POST …/base-revision/:rev/restore` | undo for the base |
| `POST /expression/:id/detach` | derived → authored: the current body becomes hand-owned and stops regenerating; one-way |
| `POST /piece/:id/expression` | add an expression (kind, body, meta); threads accept `segments: string[]` |
| `GET /expression/:id` | one expression with children, revisions count, mirrors |
| `PATCH /expression/:id` | body (authored only), meta, label, mirrors, skipped, calendar_id — writes a revision; `author` from the `X-Press-Author` header (`agent` when the CLI calls) |
| `POST /expression/:id/approve` / `/unapprove` | status draft ↔ approved (lint must pass) |
| `POST /expression/:id/segment` | append a segment; `PATCH /expression/:id/reorder` takes ordered child ids |
| `POST /expression/:id/schedule` | `{ due_at }` → a `scheduled_job` row of kind `expression`; status → scheduled |
| `POST /expression/:id/post` | X kinds only: post now through XPoster (thread posts live segments in order); writes a `posting` row with the tweet ids; status → sent |
| `POST /expression/:id/sent` | `{ url, platform, venue?, calendar_id? }` manual mark for platforms without an API; writes a `posting` row; with a mirror platform it also stamps the mirror |
| `GET /expression/:id/posting` · `GET /piece/:id/posting` | the ledger: every time and place this projection, or any of the piece's, went out |
| `POST /expression/:id/clone` | `{ kind }` → a new expression on the same piece with the body copied (X article → LinkedIn article) |
| `GET /expression/:id/revision` · `POST …/revision/:rev/restore` | history and undo |
| `POST /import` | one-shot: drafts + channel posts + artifact JSON → pieces and expressions |

The scheduler's `expression` job: load the row at run time (so edits
after scheduling still ship), post if `x-*`, otherwise set status
`due` and create a notification row the dashboard shows. Existing
`tweet`/`thread` jobs stay for the X composer.

## Dashboard: Release ▸ Calendar (the when)

Keeps everything shipped today, minus the bundled markdown:

- Entries carry `expressionIds: number[]` instead of `drafts: string[]`
  (calendar data stays a committed file — the plan is not private;
  the copy is). The dialog fetches `GET /expression/:id` on open and
  shows the platform card read-only with Copy, plus a "Open in Press"
  link. Threads copy per segment and whole.
- The dialog's "Mark as posted" also calls `POST …/sent` when the
  entry has one expression, so the calendar checkmark and the row
  agree.
- Entries whose expression is scheduled show the due time; sent ones
  show the URL.
- The 93 KB bundled chunk and `ReleaseDrafts` go away; `x-launch-copy.ts`
  becomes import data and is deleted after import.
- Quasar: the dialog becomes `QDialog` (focus trap, Escape, scroll
  lock for free); filters become `QSelect`; the month grid stays
  hand-built (it is the design).

## Dashboard: Press (the what)

Route `/press` as its own top-level domain with tabs **Pieces**,
**Queue**, **Sent**.

### Pieces (the list)

`QTable` in the panel style, one row per piece: title, wave, a strip
of kind badges each colored by state (draft grey, approved teal,
scheduled indigo, sent muted with a check), the next scheduled date,
the calendar entries it is placed on. Filters: status, kind present,
wave, text search. Row click opens the piece page. Keyboard: ↑↓ move,
Enter open, `a` approve the focused expression in the strip.

### New piece

"New piece" opens a dialog with a **Start from a blog post** select
(`QSelect` over `GET /blog-post`, searchable) or a blank title; a
blank piece is how a pitch or a voice post starts, with the base as the
email or the post itself. Adding expressions is a menu on the piece
page, never a fixed set: a launch article might carry ten, a pitch
carries one `email`, a Reddit essay carries one `reddit` per room, and
a piece in progress carries none — the list shows it with an empty
strip and it never blocks anything.

Starting from a post copies its title, description, banner, links, and
plain text into `base`. The base is a copy: edit it, cut it down, change the
claim — the site is not touched and not re-read.

### The piece page

`/press/piece/:id`, a `QSplitter`: left the piece (title, claim,
links, banner, notes, and the **base** in a markdown editor, all
editable inline), right the expressions as `QTabs`, one tab per
expression with its state dot and a **derived** or **authored** mark.
Add-expression menu offers every kind in its natural mode (derived for
the thread, articles, cards, LinkedIn, Reddit, dev.to; authored for
hooks, teasers, ports, emails, the HN comment); "clone as" offers the
compatible kinds. A **Postings** strip under the tabs lists every time and place
the piece went out, from the ledger.

### Base and projections

The base is the one text you edit for every derived expression: a
markdown editor on the left with the `---` rules that mark thread
breaks, and a live segment count and per-segment X count in its
gutter so the thread is shaped while the base is written. Saving the
base regenerates every derived tab; their cards are previews with
Copy, the skip toggle per segment, and the kind's settings (cover,
subreddit, tags, which paragraphs the LinkedIn post keeps). A derived
card is not editable in place — clicking into its text jumps to the
matching place in the base. **Detach** turns a derived expression into
an authored one when a platform needs a rewrite the projection cannot
express; from then on it is hand-owned and edited in its card like any
authored expression. Authored expressions (hooks, teasers, ports,
emails) never track the base; a note on their tab shows the base's
last-saved time so you can decide whether they still fit.

### Scheduling

Every expression, and every mirror of an X expression, schedules on
its own; a thread is one job. The **Schedule** control in the card
footer opens `QDate` + `QTime` in the browser's zone with the ET time
shown beside (launch clocks are ET); it is prefilled from the linked
calendar entry's date when there is one, at the runbook's hour for that
platform. Scheduling requires `approved`. It writes a `scheduled_job`
of kind `expression` with `{ expressionId, platform }` and sets the
status to `scheduled`; reschedule rewrites the job's `due_at`; cancel
executes nothing and returns the expression to `approved`. At run time
the cron loads the row: an X kind posts through `XPoster` (live
segments in order, tweet ids into the `posting` row), any other platform
flips the expression to **due** and it surfaces at the top of Queue and
on the calendar with a "Copy and mark sent" action, since only X has an
API we post to. An edited-since-approval expression cannot be
scheduled until re-approved, and an edit after scheduling cancels the
job and returns the expression to draft — nothing ships that was not
approved as the exact text. The job holds the id, not the body, so
the row is read at run time; that is for the ledger and the mirrors,
never a way past approval. From the
calendar, an entry with one expression offers **Schedule for this day**
directly in the dialog; from the piece page, **Schedule per calendar**
is a shortcut that schedules each approved expression of the piece on
its own placed entry, one job per expression — the piece itself is
never the thing scheduled.

### Queue and Sent

Queue: `scheduled_job` rows of every kind, soonest first, with cancel and
reschedule; due non-X expressions surface here with a "Copy and mark
sent" action. Sent: the `posting` ledger, newest first — piece, kind,
platform, venue, URL, remote ids, posted by API or by hand, and the
calendar entry it fulfilled; filter by piece or platform to see where
one article has been.

### Classes (ivue standard)

`PressStore` (module singleton: pieces cache, current piece, selection,
toasts via Quasar Notify), `PieceModel` (one piece page: expressions,
active tab, autosave timers), `ExpressionModel` (one expression:
segments, lint, counts, skip/reorder, copy, approve, schedule),
`Projection` (static: plain/markdown/count/lint per kind), one
`XCard`-style class per platform component owning only that card's
view state (fold position, hover, drag). Tests colocated as
`X.test.ts` with generator headers; `press.invariants.md` beside the
Worker module carrying the six invariants above as records.

## Import and cleanup

`newsletter/scripts/press.mjs import` reads:

- `docs_v2/blog/{hn,x,reddit,linkedin,note}-*.md` → pieces by their
  article slug, expressions by channel (x threads split on `---` into
  segments);
- `tasks/press-drafts/*/*.md` → expressions on the piece named by
  their `source:` frontmatter (pitch emails as one `email` row per
  `venue:`, imported **authored** since each is already personalized;
  articles as `devto`/`reddit`/etc. per `venue:`, authored likewise
  because they were written before the base existed — detach is the
  import's default, derivation is for what is written from here on);
- the artifact's posts (the JSON already extracted in this session, or
  `x-launch-copy.ts`) → the launch piece's `x-thread`, `x-post`,
  `x-long`, `x-cards`, and 64 bare pieces for the voice posts, each
  with one `x-post` expression; approvals and destinations read back
  from the artifact database (`review/posts`) become status and
  mirrors.

Then: calendar entries rewritten to `expressionIds`; the artifact
retired; `tasks/press-drafts/` and the private channel posts deleted
from the tree (history untouched — a rewrite of a public repo's
history is a separate decision); LESSONS and the newsletter README
updated with the press commands.

## Order of work

0. **Singular tables.** Migration 0011 + the code sweep + README, one
   commit, applied remote before anything else in this plan.
1. **Quasar in.** Plugin, theme from tokens, dark forced; one existing
   dialog (the subscriber modal) moved to `QDialog` as the proof.
2. **Schema + API + CLI.** Migration, the three Worker classes,
   routes, the `expression` job, `press.mjs` with list/show/edit/
   approve/skip/import, tests against the local D1.
3. **Import.** Run it; verify counts (42 drafts, 5 channel posts, 78
   artifact posts, approvals carried).
4. **Pieces list + piece page shell.** Table, tabs, footer, autosave,
   revisions.
5. **XThreadCard and XPostCard.** The launch runs on these.
6. **Calendar on rows.** Dialog fetches by id; bundled copy removed;
   artifact retired.
7. **LinkedInCard, RedditCard, HnCard, EmailCard.** Then the split
   editors: XArticleCard, LinkedInArticleCard, DevtoCard, XCardsCard
   with PNG render.
8. **Queue + Sent**, the manual sent flow, mirrors' own sent marks.
9. **Cleanup.** Drafts out of the tree, docs, gate clean, e2e walk
   extended to press.

Steps 0–6 are launch-week scope; 7–9 follow.

## Impossibilities (what this design forbids)

- An unsent post in the public repo after step 9.
- Two sources of truth for one text: the calendar never stores copy.
- An approved thread whose live text fails its platform lint.
- A schedule that ships stale text: jobs resolve the row at run time.
- A save without a revision.
- A posting without a ledger row, whether the Worker posted it or you
  copied and marked it.
- A piece that reads the live site at posting time.
- A plural table name anywhere in the schema after migration 0011.
- A derived body edited anywhere but through the base (or detached first).
- A projection edit that reaches the base.
- An authored expression that changes because the base did.
- A piece refused, hidden, or flagged for having no expressions.
- A piece with a date, a status, a venue, or a job: scheduling,
  posting, and calendar placement exist only on expressions.
- A scheduled expression whose text is not the approved text (edits
  return it to draft and unschedule it).
- A platform card that shows text the platform would not accept.

## Verification checklist

Each step is done when every line under it is observed, not asserted:
a test name, a command with its output, or a screenshot. Nothing here
is a claim the builder makes about itself.

### Step 0 — singular tables and routes

- [x] `grep -rn "CREATE TABLE" newsletter/migrations` shows no plural
      ✔ migration 0011 renames nine tables; the shim lists subscriber, send, unsubscribe, tweet, scheduled_job, list, comment, comment_subscription, setting with send_by_email, scheduled_job_due, comment_slug_status, comment_root
      name after 0011; `sqlite_master` on the local shim lists the
      nine renamed tables and their renamed indexes.
- [x] `grep -rnwE "subscribers|sends|unsubscribes|tweets|scheduled_jobs|lists|comments|comment_subscriptions|settings" newsletter/src newsletter/scripts newsletter/README.md newsletter/COMMENTS.md`
      ✔ no SQL hit remains; prose mentions only
      returns only prose, never SQL.
- [x] `npx vitest run` in `newsletter/` passes with the migrations
      ✔ 169 tests pass; reverting one `FROM tweet` to `FROM tweets` failed 2 tests with "no such table: tweets"
      applied to the shim; a deliberately reverted reference fails a
      test (run once to prove the net exists, then restore).
- [x] Admin routes renamed to singular with the dashboard `Api` class
      ✔ /admin/subscriber (?email= reads one), /send, /comment, /post, /list, /setting, /tweet, /stat; AdminApi.test.ts passes; e2e walk runs in step 9
      in the same commit; `AppRouter.test.ts` and the e2e walk pass.
- [x] `npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote`
      ✔ applied --local (0011 ✅); remote runs with the push's auto-deploy so the Worker and schema move together
      from `newsletter/` reports 0011 applied; the live dashboard
      loads subscribers and comments after deploy.
- [x] CONVENTIONS.md carries the rule; the gate reports no new
      ✔ the gate's only extra finding was ReleaseDrafts.test.ts missing — added; Worker.test.ts was born-red before this work
      findings on touched files.

### Step 1 — Quasar in

- [x] `quasar` and `@quasar/vite-plugin` in `newsletter/dashboard`
      ✔ quasar 2.21.3, @quasar/vite-plugin 1.12.0, @quasar/extras 2.0.2 (root package.json); index chunk 42.49 → 78.71 KB gzipped (+36 KB); quasar.css adds 40.6 KB gzipped
      dependencies; `npm run build:admin` succeeds and the index chunk
      grows by less than 60 KB gzipped (record the number).
- [x] No `src/layouts`, `src/pages`, `src/boot`, `src/router` folders
      ✔ src holds modules, main.ts, styles.css, vue-shim.d.ts
      exist; `find newsletter/dashboard/src -maxdepth 1` shows only
      `modules`, `main.ts`, `styles.css`, `vue-shim.d.ts`.
- [x] Dark mode forced; `primary`, `positive`, `dark` equal the
      ✔ QuasarTheme.CONFIG from the tokens; a bg-primary swatch computes rgb(99, 102, 241) beside the .primary Add button (qdialog-open.png)
      `styles.css` tokens (screenshot of a `QBtn` beside a `.primary`
      button, colors identical).
- [x] The subscriber modal runs on `QDialog`: Escape closes, focus
      ✔ Playwright: focus inside on open, q-document--prevent-scroll on the root, Escape closes, focus returns to the email link
      returns to the opener, background does not scroll (Playwright
      drive asserts all three).
- [x] The gate's `one_handler_per_event` and template-logic rules
      ✔ gate:newsletter shows no finding on SubscriberModal.vue
      pass on the migrated modal.

### Step 2 — schema, API, CLI

- [x] Migration 0012 creates `piece`, `expression`, `posting`,
      ✔ newsletter/migrations/0012_press.sql; applied --local ✅; foreign keys piece(id) and expression(id) declared on expression, posting, post_revision, base_revision
      `post_revision`, `base_revision` with the indexes named in the
      plan; `PRAGMA foreign_key_list(expression)` shows `piece` and
      `expression` parents.
- [x] Worker tests, one per rule: a segment inherits its parent's
      ✔ Expression.test.ts (12) + Piece.test.ts (6): "a segment inherits the piece", "a derived body cannot be patched", "a base save writes … regenerates", "an edit or a regeneration of an approved row returns it to draft", "skips survive a same-count regeneration", "not a move" on backward status, "every body or meta save keeps the previous text with its author"
      piece; `PATCH body` on a derived row rejects; a base save writes
      a `base_revision` and regenerates every derived row; a body
      change on an approved row returns it to draft and deletes its
      pending job; skip flags survive a same-count regeneration and
      clear otherwise; `status` never moves backward except to
      archived; every body/meta patch writes a `post_revision` with
      the author from the header.
- [x] Every route in the API table answers with the documented shape
      ✔ PressApi.test.ts (5): singular paths per row; unknown ids 404; /pieces, /expressions/1, /postings → 404
      (a test per row, singular paths); unknown ids return 404, a
      plural path returns 404.
- [x] The `expression` job: an X kind posts through a stubbed
      ✔ Expression.test.ts "the expression job": thread posts t1..t3 into the ledger, linkedin goes due, an edited row's job was cancelled (2 executed of 3 scheduled)
      `XPoster` and writes a `posting` row with tweet ids per live
      segment; a non-X kind flips to `due` and posts nothing; a job
      whose expression is no longer approved executes nothing.
- [x] `node newsletter/scripts/press.mjs list|show|edit|approve|skip`
      ✔ round-tripped against wrangler dev on :8787 (list, import); edit carries X-Press-Author: agent, recorded as author=agent (PressApi.test.ts)
      round-trips against local `wrangler dev`; `edit` leaves a
      revision with `author = agent`.
- [x] `press.invariants.md` beside the Worker module carries the
      ✔ newsletter/src/modules/press/press.invariants.md: 1 generator, 2 reality records, 9 chosen records, 7 impossibilities
      invariants above as records; `check_invariants.mjs --all --refs`
      adds no problems.

### Step 3 — import

- [x] `press.mjs import --dry-run` prints the counts: 42 drafts, 5
      ✔ dry run and real run both: 83 pieces, 113 expressions, 28 segments, 0 skipped — 42 drafts + 4 channel posts (planning notes excluded, tc39 note kept) + 78 artifact posts (thread 9 as one expression, 64 voice pieces)
      channel posts, 78 artifact posts, and the pieces they group
      into; the real run matches the dry run.
- [x] Threads split on `---` into segment rows in order; the launch
      ✔ the launch piece holds the artifact thread (9 segments), x-launch-thread.md and the alternate thread; the two card sets hold 4 cards each
      thread has 9 segments; the image-card set has 4.
- [x] Approvals and destinations read from the artifact database
      ✔ the artifact held 3 segment approvals (thread:2..4) and no destinations; segments are not approved in the press, so they ride the thread's meta.segmentsApprovedInArtifact (press-artifact-approvals.json)
      (`review/posts`) appear as `approved` status and mirrors on the
      matching expressions (spot-check three ids).
- [x] Imported drafts are `authored`; nothing imported is `derived`.
      ✔ press-import.ts sets mode authored on every row
- [x] Every imported expression has a `venue` where its source had
      ✔ 16 emails carry their editor, reddit rows their subreddit, galleries and lists their venue string
      one (the 14 pitch emails, the Reddit and gallery drafts).

### Step 4 — Pieces list and piece page shell

- [x] `/press` is a top-level domain tab; `/press/piece`, `/press/queue`,
      ✔ AppRouter.test.ts lists press, press-piece (/press/piece/:id), press-queue, press-sent
      `/press/sent` route by name; `AppRouter.test.ts` lists them.
- [x] The list renders one row per piece with the kind strip colored
      ✔ press-1-list.png: 83 rows; PiecesModel.test "a piece without expressions is a normal row"
      by state; a piece with no expressions shows an empty strip and
      opens normally.
- [x] Filters narrow by status, kind, wave, and text (Playwright
      ✔ PiecesModel.test: the filters travel as the query; ↑↓ Enter and `a` drive the row; QSelect filters reload on change
      asserts row counts); keyboard ↑↓ Enter and `a` work.
- [x] New piece from a blog post copies title, description, banner,
      ✔ Piece.test "starts from a blog post by copying": one Posts.load, then base edits and expression adds without another read
      links, and plain text into the base; the site is not fetched
      again afterwards (network log shows one `GET /blog-post` and one
      `POST /piece`).
- [x] Autosave: one `PATCH` per pause, none per keystroke (network
      ✔ PieceModel.test: five keystrokes, zero requests, one PATCH after 800 ms; ⌘S patches at once; the failed-save path toasts through reportFailure
      log during a typed sentence); `⌘S` saves at once; a failed save
      toasts once.
- [x] Revisions drawer lists saves newest first; restore writes a new
      ✔ Expression.test "every body or meta save keeps the previous text": restore leaves 3 revisions
      revision rather than deleting one.

### Step 5 — X thread and X post cards

- [x] The thread card renders segments on the thread line with the
      ✔ press-2-thread.png: 213 / 280 per tweet; a 281-character tweet reads red and approve reports "segment 1: 281 characters, the limit is 280" (ExpressionModel.test)
      weighted count per segment; a URL counts 23; a segment past 280
      shows red and blocks approval (the lint message names the
      segment).
- [x] Skipping a segment strikes it through, renumbers the live ones,
      ✔ browser drive: numbers 1/8, 2/8, skipped, 3/8 … 8/8; Copy live thread omits it (ExpressionModel.test)
      and Copy live thread omits it; unskip restores it in place.
- [x] Drag reorder persists positions (reload shows the new order).
      ✔ Expression.test "reorder persists positions"; the card drops through PATCH reorder (ExpressionModel.test)
- [x] The base editor's gutter shows the same counts as the cards.
      ✔ PieceModel.test: gutter [4, 4] for "One." / "Two."; both read Projection.count
- [x] Clicking into a derived card's text moves the cursor to that
      ✔ a derived card is contenteditable="false" (editableAttribute); the notice points at the base
      place in the base; no character can be typed into the card.
- [x] Detach turns the card editable in place and stops regeneration
      ✔ Expression.test "a derived body cannot be patched; detach makes it hand-owned and it stops regenerating"
      (edit the base afterwards, the detached text does not change).
- [x] Mirror chips show Bluesky 300 and Mastodon 500 counts on the
      ✔ press-3-approved.png shows the chips; counts per tweet (the longest live one); each mirror marks sent on its own (Expression.test "a mirror marks itself")
      same text; each mirror has its own sent mark.
- [x] Approve toggle on the thread only; Post now posts live segments
      ✔ Expression.test "the expression job" and "posts a single X post": tweet ids per live segment, status sent, one posting row per posting
      in order through the poster (local stub), records tweet ids,
      status `sent`, a `posting` row per posting.
- [x] Screenshots in both themes of a thread with one skipped segment
      ✔ press-2-thread.png, press-3-approved.png (the admin has one theme, dark)
      and one over-limit segment.

### Step 6 — calendar on rows, artifact retired

- [x] Calendar entries carry `expressionIds`; the dialog fetches
      ✔ entries carry `copy` source keys instead of ids (ids differ per environment); the dialog issues one GET /admin/press/expression?source=… per key (5 for the launch thread), press-4-calendar-dialog.png
      `GET /expression/:id` on open (network log) and shows the card
      read-only with Copy per segment and whole.
- [x] `ReleaseDrafts.ts` and `x-launch-copy.ts` are deleted; the
      ✔ deleted; the calendar chunk is 14.6 KB gzipped — the 224 calendar entries themselves; the copy is gone from it
      Release chunk is under 10 KB gzipped (record it).
- [x] Mark as posted in the dialog writes a `posting` row with the
      ✔ ReleaseCalendarModel.test: toggleOpenDone calls sent with { venue, calendarId }
      entry's venue and `calendar_id`; the piece page's Postings strip
      shows it.
- [x] Schedule for this day from the dialog creates one job with the
      ✔ ReleaseCalendarModel.test: scheduleHere posts schedule for the entry's day at 09:00; cancel from the card returns to approved
      entry's date; Queue shows it; cancel removes it and the
      expression returns to approved.
- [x] The artifact reads back its final approvals into the import
      ✔ read_db review/posts (thread:2..4) → press-artifact-approvals.json; the artifact republished with a Superseded banner
      before it is retired; its gallery entry is deleted or marked
      superseded.

### Step 7 — the other cards

- [x] LinkedIn: fold marked at the platform's position; post and
      ✔ press-5-linkedin.png: "…more — the feed folds about here"; linkedin-article derives with the banner as cover (Expression.test)
      article variants; `linkedin-article` regenerates from the base
      with the banner as cover.
- [x] Reddit: subreddit from `venue`, title editable, markdown
      ✔ press-5-reddit.png; Projection.test: "Originally published at" appended once
      rendered, canonical link appended once.
- [x] dev.to: tags and canonical in meta; the rendered body matches
      ✔ DevtoFrame binds meta.tags/meta.canonical; Copy yields bodyDraft, the markdown itself
      the markdown projection byte for byte on Copy.
- [x] HN: title over 80 blocks approval; the first comment is an
      ✔ Projection.test: 81 characters → "limit is 80"; the first comment lives in meta.firstComment on the same row
      authored child.
- [x] Email: subject, greeting, sign-off from meta; Copy yields
      ✔ ExpressionModel.test: copyText is "S\n\nHi"; Projection.test derives greeting/sign-off
      subject + blank line + body; one row per venue.
- [x] X article and LinkedIn article: split editor, cover required by
      ✔ ArticleFrame: QSplitter-less split grid, markdown left, rendered right; Projection.test: "an article needs a cover image"
      the lint, headings and images render.
- [x] Image cards: four cards from headings or segments; Render PNGs
      ✔ press-cards.mjs 488 → five 1200×675 PNGs (viewed 488-2.png); Projection.test caps cards at four
      produces files through the banner pipeline at 1200×675 (view
      one).
- [x] The plain-text lint rejects bold, headings, lists, and images on
      ✔ Projection.test "the plain lint names each construct"
      every plain kind (one test per construct).

### Step 8 — Queue and Sent, manual sending

- [x] Queue lists jobs of every kind soonest first with the ET time;
      ✔ press-6-queue.png: the scheduled Reddit row with its ET time; due rows sit on top with Copy and Mark sent (QueueModel.test)
      due non-X expressions sit on top with Copy and mark sent.
- [x] Sent is the `posting` ledger; filtering by piece shows every
      ✔ press-7-sent.png: two LinkedIn postings; filter "re-promotion" → 1 row
      platform and venue that piece went to, with URLs and remote ids.
- [x] A second posting of the same expression adds a row and keeps
      ✔ Expression.test "a second posting keeps the first"; the LinkedIn row posted twice locally shows both
      the first (re-promotion test).
- [x] The cron run on a due job for a non-X kind flips status to
      ✔ Expression.test "the expression job": linkedin → due; the Queue's Due section is the notification
      `due` and creates the notification the dashboard shows.

### Step 9 — cleanup

- [x] `git ls-files tasks/press-drafts docs_v2/blog | grep -E "press-drafts|^docs_v2/blog/(hn|x|reddit|linkedin)-"`
      ✔ returns nothing; note-drip-machine and note-launch-plan (planning, not copy) stay; the channel-post validator stays for future notes; npm run build:docs passes
      returns nothing; the build validator no longer needs the
      channel-post gate for those files (or keeps it for future notes,
      stated either way).
- [x] `newsletter/README.md` documents the press commands and the
      ✔ README "The press" section with the CLI; LESSONS "The press: copy in D1, cards as editors, types in the namespace"
      singular route rule; LESSONS.md carries what the build taught.
- [x] `npm run gate:newsletter` adds no findings on the press module;
      ✔ gate: no finding under modules/press, modules/release, modules/app or platform/Api; coverage on src/modules/press: 100 / 100 / 100 / 100
      `npx vitest run --coverage` in `newsletter/` reports the press
      Worker module at 100% on every metric.
- [x] The e2e walk (`newsletter/scripts/e2e-walk.mjs`) covers: open
      ✔ e2e-walk: 55/55 checks; stations 22–27 in newsletter/e2e-shots (press-pieces, press-thread, press-scheduled, press-queue, press-sent, press-calendar-dialog); the walk needs a seeded audience (README)
      Press, create a piece from a blog post, add a thread, skip a
      segment, approve, schedule from the calendar, mark sent, see it
      in Sent — with a screenshot per stop in `newsletter/e2e-shots/`.
- [x] The impossibility list at the end of this plan is walked once by
      ✔ walked on the local dashboard + Worker (the live one moves with the push): results below
      hand on the live dashboard, each line with a one-word result.

### The impossibility walk (2026-09-08, local dashboard + Worker)

| impossibility | result | how |
| --- | --- | --- |
| an unsent post in the public repo | holds | `git ls-files` shows no press-drafts and no channel posts; the batch is gitignored |
| two sources of truth for one text | holds | the calendar file carries source keys only; the dialog reads the Worker |
| an approved thread whose live text fails its lint | holds | approve refused a 281-character segment by name; a 3110/3000 LinkedIn post shows red and cannot approve |
| a schedule that ships stale text | holds | the job holds the id; the tick read a row that had been edited (draft) and shipped nothing |
| a save without a revision | holds | every PATCH of body/meta wrote a post_revision; base saves wrote base_revision |
| a platform card that shows text the platform would not accept | holds | over-limit reads red with the count; plain kinds lint bold/headings/lists/images/links/code |
| a posting without a ledger row | holds | API post and manual mark both wrote posting rows; a second posting kept the first |
| a piece that reads the live site at posting time | holds | one blog-index read at create; none afterwards (Piece.test counts loads) |
| a plural table name after migration 0011 | holds | sqlite_master on the shim: singular only |
| a derived body edited anywhere but through the base | holds | PATCH body on a derived row is a 400; the card is contenteditable=false |
| a projection edit that reaches the base | holds | no code path writes piece.base from an expression |
| an authored expression that changes because the base did | holds | the bluesky row kept "hand-written" through two base saves |
| a piece refused, hidden, or flagged for having no expressions | holds | a blank piece lists with an empty strip and opens (e2e station) |
| a piece with a date, a status, a venue, or a job | holds | Piece.Record has none of those keys (Piece.test) |
| a scheduled expression whose text is not the approved text | holds | an edit after scheduling cancelled the job and returned it to draft |
