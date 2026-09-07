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
   authored expressions: an X thread, an X article, a LinkedIn post, a
   Reddit post. Expressions are written, not derived. The only real
   derivation is a **mirror**: the same text re-checked under another
   platform's limit (X → Bluesky, Mastodon, Threads).
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
   by expression id and never duplicate each other's data.
7. **A blog post is a starting point, copied, never linked.** A piece
   bootstrapped from an article copies its text into the database as
   the piece's base and then diverges freely; the site is never read
   at posting time.
8. **Every posting is a ledger row.** When and where each projection
   went out is recorded per posting, so one expression can go out
   twice (launch, re-promotion) and the history stays whole.
9. **Table names are singular, always.** A table is named for what one
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
  base        TEXT,                   -- the starting text, copied from the blog post (or written), edited freely
  wave        INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE expression (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  piece_id    INTEGER NOT NULL REFERENCES piece(id),
  kind        TEXT NOT NULL,          -- see kinds below
  parent_id   INTEGER REFERENCES expression(id),  -- segment → its thread / card set
  position    INTEGER NOT NULL DEFAULT 0,          -- order among siblings
  label       TEXT,                   -- "hook", "A · the kilobyte", card title
  body        TEXT NOT NULL,          -- markdown subset (see projections)
  meta        TEXT,                   -- JSON per kind: subreddit, title, canonical, tags, image
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

Kinds: `x-thread` (parent) with `x-segment` children; `x-post`;
`x-long` (long post, plain text, folds at 280); `x-article` (rich);
`x-cards` (parent) with `x-card` children; `linkedin`;
`linkedin-article`; `reddit`; `devto`; `hn`; `bluesky`; `mastodon`;
`threads`; `email`; `note`.

`expression.sent_at` / `sent_url` and a mirror's `sent_at` are the
latest posting, denormalized for the list; `posting` is the truth.

Rules the Worker enforces: a segment's `piece_id` equals its parent's;
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

`Projection.Class.plain(body)` strips markdown to what X accepts and
counts it X-weighted (URL = 23). `Projection.Class.markdown(body)` is
identity. Copy uses the projection; the poster uses the projection;
the preview renders the projection. The lint runs on save and blocks
approval, never typing.

## Worker API (under `/admin/press`)

| method + path | does |
| --- | --- |
| `GET /pieces?status=&kind=&q=` | list pieces with per-kind expression states rolled up |
| `POST /pieces` | create a piece (title, slug?, claim, wave); with `fromSlug` it bootstraps from a blog post: title, description → claim, banner, links, and the post's plain text copied into `base` |
| `GET /blog-posts` | the site's posts (from `blog-index.json`) for the "start from a blog post" select |
| `POST /pieces/:id/draft` | `{ kind }` → scaffold an expression from `base`: a thread split at paragraph boundaries under 280, a LinkedIn post from the opening paragraphs, a Reddit/dev.to body from the whole text with the canonical link; a starting point to rewrite, never a finished post |
| `GET /pieces/:id` | a piece with its expressions, segments nested |
| `PATCH /pieces/:id` | edit piece fields |
| `POST /pieces/:id/expressions` | add an expression (kind, body, meta); threads accept `segments: string[]` |
| `GET /expressions/:id` | one expression with children, revisions count, mirrors |
| `PATCH /expressions/:id` | body, meta, label, mirrors, skipped, calendar_id — writes a revision; `author` from the `X-Press-Author` header (`agent` when the CLI calls) |
| `POST /expressions/:id/approve` / `/unapprove` | status draft ↔ approved (lint must pass) |
| `POST /expressions/:id/segments` | append a segment; `PATCH /expressions/:id/reorder` takes ordered child ids |
| `POST /expressions/:id/schedule` | `{ due_at }` → a `scheduled_job` row of kind `expression`; status → scheduled |
| `POST /expressions/:id/post` | X kinds only: post now through XPoster (thread posts live segments in order); writes a `posting` row with the tweet ids; status → sent |
| `POST /expressions/:id/sent` | `{ url, platform, venue?, calendar_id? }` manual mark for platforms without an API; writes a `posting` row; with a mirror platform it also stamps the mirror |
| `GET /expressions/:id/postings` · `GET /pieces/:id/postings` | the ledger: every time and place this projection, or any of the piece's, went out |
| `POST /expressions/:id/clone` | `{ kind }` → a new expression on the same piece with the body copied (X article → LinkedIn article) |
| `GET /expressions/:id/revisions` · `POST …/revisions/:rev/restore` | history and undo |
| `POST /import` | one-shot: drafts + channel posts + artifact JSON → pieces and expressions |

The scheduler's `expression` job: load the row at run time (so edits
after scheduling still ship), post if `x-*`, otherwise set status
`due` and create a notification row the dashboard shows. Existing
`tweet`/`thread` jobs stay for the X composer.

## Dashboard: Release ▸ Calendar (the when)

Keeps everything shipped today, minus the bundled markdown:

- Entries carry `expressionIds: number[]` instead of `drafts: string[]`
  (calendar data stays a committed file — the plan is not private;
  the copy is). The dialog fetches `GET /expressions/:id` on open and
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
(`QSelect` over `GET /blog-posts`, searchable) or a blank title. From a
post it copies title, description, banner, links, and the plain text
into `base`. The base is a copy: edit it, cut it down, change the
claim — the site is not touched and not re-read.

### The piece page

`/press/pieces/:id`, a `QSplitter`: left the piece (title, claim,
links, banner, notes, and the **base** in a markdown editor, all
editable inline), right the expressions as `QTabs`, one tab per
expression with its state dot. Add-expression menu offers every kind,
each with two entries: **blank** and **draft from base** (the scaffold
above, marked as a draft to rewrite); "clone as" offers the compatible
kinds. A **Postings** strip under the tabs lists every time and place
the piece went out, from the ledger.

Each tab renders the platform card as the editing surface:

- **XThreadCard**: stacked tweet cards on the thread line; avatar,
  name, handle from settings; each segment contenteditable (paste
  flattened to text), weighted count, red past 280, the fold marked;
  link cards for bare URLs; a skip toggle per segment (struck-through
  and dimmed when skipped, live segments renumbered); drag to reorder;
  add segment; the approve toggle and mirror chips (Bluesky 300,
  Mastodon 500, Threads 500 with their own counts) at the top; Copy
  live thread / Copy segment; Post now; Schedule.
- **XPostCard**: one card, same anatomy. **XLongCard**: one card with
  the fold at 280 marked "Show more" — the preview paragraph must
  stand alone.
- **XArticleCard**: split editor (`QSplitter`), markdown left, the
  article right in X's article typography with cover, title, body.
- **XCardsCard**: four typographic cards rendered at 1200×675 scaled
  down, each editable; "Render PNGs" calls the site's banner pipeline
  (`docs_v2/scripts/brand-image-generator.mjs`) through a Worker
  endpoint that queues a render job, or, first cut, prints the card
  HTML for the local render script.
- **LinkedInCard**: the post card with avatar, name, headline, the
  fold at LinkedIn's ~210 characters marked "…more"; contenteditable.
  **LinkedInArticleCard**: split editor like the X article.
- **RedditCard**: subreddit header (from meta), editable title, split
  markdown editor, rendered body, vote column; flair field in meta.
- **DevtoCard**: title, tags, canonical URL fields; split editor.
- **HnCard**: title with the 80 limit, the first comment beneath.
- **EmailCard**: To, Subject, plain body; Copy copies subject + body.

Every card shares one footer: status pill, approve toggle, Copy,
Schedule (`QDate` + `QTime` in the user's zone, shown in ET beside),
Post now where an API exists, Mark sent with a URL elsewhere, and a
revisions drawer (`QTimeline`, restore per entry). Autosave: 800 ms
after the last edit, one PATCH, a toast only on failure. `⌘S` saves
now.

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
  their `source:` frontmatter (pitch emails as `email`, articles as
  `devto`/`reddit`/etc. per `venue:`);
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
- A platform card that shows text the platform would not accept.
