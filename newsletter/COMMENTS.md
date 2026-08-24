# Blog comments — design, mechanics, invariants

The complete description of the threaded comments system as shipped on
2026-08-24. Read this before touching `newsletter/src/modules/comments/`,
`newsletter/src/modules/api/PublicApi.ts` (comment routes),
`newsletter/src/modules/api/AdminApi.ts` (moderation routes),
`newsletter/src/modules/delivery/Delivery.ts` (`notifyReply`),
`newsletter/src/modules/platform/Security.ts` (thread/avatar tokens),
`docs_v2/.vitepress/theme/components/BlogComments.vue`,
`CommentAvatar.vue`, or the dashboard's `comments/` module.

The last section lists the invariants explicitly and the known gaps
where the current code does NOT yet enforce one. That section is the
starting point for the invariants work.

---

## 1. Data model (D1)

Migrations `0008_comments.sql` + `0009_comment_threads.sql` + `0010_comment_subscribe_intent.sql`.

```
comments
  id            INTEGER PK AUTOINCREMENT
  slug          TEXT      -- the post; validated /^[a-z0-9][a-z0-9-]*$/
  name          TEXT      -- display name, ≤ 80 chars, trimmed
  email         TEXT      -- lowercased; OPERATOR-ONLY, never served publicly
  body          TEXT      -- plain text, ≤ 2000 chars
  submitted_at  INTEGER   -- unix seconds
  status        TEXT      -- 'pending' | 'approved'   (default 'pending')
  parent_id     INTEGER   -- NULL for a top-level comment; else the
                          -- comment being ANSWERED (root or a reply)
  root_id       INTEGER   -- the thread: = own id for a top-level comment,
                          -- = the root's id for every reply (any depth)
  locked        INTEGER   -- 0/1, meaningful ONLY on the root row
  avatar_seed   TEXT      -- 16 hex chars; HMAC(ADMIN_SECRET, 'avatar:'+email)
                          -- (plain SHA-256 prefix when no secret — local dev)
  subscribe_replies INTEGER -- 0/1 opt-in recorded at submit (default 1);
                          -- the subscription ROW is created at approval

comment_subscriptions
  root_id       INTEGER   -- the thread followed
  email         TEXT      -- lowercased
  created_at    INTEGER
  PRIMARY KEY (root_id, email)

indexes: comments(slug, status), comments(root_id, submitted_at)
```

Shape rules:

- **Depth is exactly two.** A row is either a root (`parent_id NULL`,
  `root_id = id`) or a reply (`parent_id` set, `root_id` = its root).
  A reply to a reply has `parent_id` = the reply it answers but the
  SAME `root_id` — the tree never grows a third level. "Who it
  answers" and "which thread it's in" are separate columns on purpose.
- `locked` is read only from the root row. `setLocked(id)` resolves
  `rootId` first, so locking via a reply's id locks its thread.
- `avatar_seed` is the commenter's public identity handle. Same email →
  same seed everywhere; the email is not derivable from it.

## 2. Lifecycle of a comment

```
submit (POST /comment)          → row INSERTed as 'pending'
                                → root: UPDATE root_id = id
                                → subscribe_replies opt-in RECORDED (row created at approve)
                                → operator notified (NOTIFY_EMAIL)
                                → NOTHING is public yet
approve (POST /admin/comments/approve)
                                → status = 'approved' (the ONLY path to public;
                                  guarded by status='pending' → true exactly once)
                                → author's reply subscription created (if opted in)
                                → if it is a reply: reply notifications go out NOW
delete (POST /admin/comments/delete)
                                → root: whole thread + its subscriptions
                                → reply: its answers re-parent to the root
lock/unlock (POST /admin/comments/lock)
                                → root.locked = 0/1
```

### 2.1 `Comments.submit()` — validation order

1. slug shape, name present, email pattern, body present, body ≤ 2000.
2. If `parentId` given: parent must exist, be **approved** (you cannot
   reply into an invisible comment), be on the **same slug**, and its
   thread must be **unlocked**. Reader-facing errors: "That comment is
   no longer available." / "That comment belongs to another post." /
   "Replies are locked on this thread."
3. `avatar_seed` computed from the email.
4. INSERT as pending; for a root, second statement sets `root_id = id`.
5. `subscribe_replies` is recorded (default TRUE — the checkbox is
   pre-checked; the API treats absence as opt-in). The subscription
   ROW is created later, in `approve()`.

### 2.2 `Comments.approvedFor(slug)` — the public projection

`SELECT id, name, body, submitted_at, parent_id, root_id, locked,
avatar_seed FROM comments WHERE slug=? AND status='approved' ORDER BY
submitted_at, id`. **The email column is structurally absent** — this
query is the privacy guarantee, tested by asserting the exact key set
of the public row.

The client assembles the tree from `parentId`/`rootId`; the server
serves a flat, chronologically ordered list.

## 3. Reply notifications

### 3.1 When
Only from `AdminApi.approveComment`, only if the approved row has a
`parentId`. Never at submission: unmoderated text must not reach a
reader's inbox. Uses `Delivery.notifyReply` (Postmark, notification
stream, best-effort: failures log `reply_notify_failed`, never fail the
approval).

### 3.2 Who — `Comments.replyRecipients(reply)`
Participants = approved rows in the same `root_id`, excluding the reply
itself. Addressed set:

- the author of `reply.parent_id` (the comment being answered), and
- for each `@mention` in the body (`mentionsIn`: up to three words after
  `@`, with shorter prefixes also tried so "@Ada Lovelace here" resolves
  "ada lovelace" AND "ada"), the EARLIEST participant (lowest id) whose
  trimmed, lowercased `name` matches — the original holder of the name,
  never a later impostor.

Then for each addressed email:
- drop it if it equals the reply author's email (never mail yourself),
- drop it unless `comment_subscriptions` has `(root_id, email)`
  (consent),
- one email per surviving recipient, deduped by address.

Consequence (the user's explicit requirement): **the thread starter is
NOT notified of a reply-to-a-reply** unless they are the answered
author or are @mentioned. A busy sub-thread cannot spam the person who
opened the conversation.

### 3.3 What the email contains
Subject `"<Name> replied to you on ivue.dev"`. Body: name, ≤600-char
excerpt, then two links:

- `SITE_ORIGIN/blog/<slug>?thread=<root>&sub=<email>&t=<token>#comment-<id>`
  — the site reads these params, confirms the subscription via
  `GET /comment-subscription`, shows "You follow replies on this thread
  as …" with a **Stop following** button (POST), expands the thread,
  scrolls to and highlights the reply.
- `WORKER_ORIGIN/comment-unsubscribe?thread=&email=&token=` — works
  with no JS.

### 3.4 Tokens
`Security.threadToken(rootId, email)` =
HMAC-SHA256(ADMIN_SECRET, `comment-thread:<rootId>:<email lowercased>`),
hex. Compared with `timingSafeEqualStrings`. No accounts, no sessions,
no expiry (gap G6). Scoped to one (thread, address) pair — a token from
one thread cannot act on another.

## 4. Public routes (Worker, all CORS-wrapped, all in `run_worker_first`)

| route | purpose |
| --- | --- |
| `POST /comment` | submit (Turnstile-gated when `TURNSTILE_SECRET` set; fails closed). Body: `{slug, name, email, body, parentId?, subscribeReplies?, subscribe?, timezone?, turnstileToken?}`. `subscribe: true` ALSO enrolls in the newsletter (separate opt-IN). |
| `GET /comments?slug=` | approved rows, public projection |
| `GET /comment-subscription?thread=&email=&token=` | `{thread, following}` — 403 on bad token |
| `GET /comment-unsubscribe?thread=&email=&token=` | REPORTS state (HTML page with a confirm button). Does NOT unsubscribe — mail scanners prefetch links. |
| `GET …&confirm=1` / `POST /comment-unsubscribe {thread,email,token}` | performs the unsubscribe |

**Every new public path must be listed in `run_worker_first` in
`newsletter/wrangler.jsonc`** or the assets layer answers it with the
dashboard SPA shell (cost me an hour).

## 5. Admin routes (Bearer `ADMIN_SECRET`)

`GET /admin/comments` (page: pending first, then newest; status filter;
search over slug/name/email/body), `POST /admin/comments/approve {id}`
(→ notifications), `POST /admin/comments/delete {id}`,
`POST /admin/comments/lock {id, locked}`.

Dashboard (`newsletter/dashboard/src/modules/comments/`): queue table
with Approve / Lock|Unlock / Delete; reply rows show "↳ reply in thread
#N"; locked rows show "🔒 thread locked".

## 6. The site component (`BlogComments.vue`)

- Loads `/comments?slug=`; builds `roots` and `repliesOf(rootId)`.
- **Folding**: per root, shows only the LATEST reply (badge "latest
  reply") plus "Show N earlier replies"; expanded shows all + "Fold
  replies". Deep links `#comment-<id>` expand the containing thread,
  highlight the row, scroll to it.
- **Reply form** is inline inside the thread it answers ("Replying to
  Name · cancel"). Answering a REPLY prefills `@Name ` in the body.
  Mention chips list other thread participants; a chip appends
  `@Name `. Two checkboxes: "Email me replies to this thread"
  (pre-checked) then "Also send me the blog as a newsletter"
  (unchecked). Turnstile widget per form.
- **Top-level form** below the list when no reply is open.
- **Locked thread**: root shows "🔒 locked", reply buttons hidden, note
  "Replies are locked on this thread." (server refuses too).
- **Follow banner** on arrival with `?thread&sub&t`: "You follow
  replies on this thread as <email>. [Stop following]" → POST
  unsubscribe → "You no longer follow replies on this thread."
- Name/email persist in `localStorage['ivue-comment-identity']`.
- **Turnstile**: element-ref watch renders the widget; when the form
  element SWAPS (top-level ↔ reply) the old widget is removed and a new
  one rendered; `submit()` awaits the token (poll, 45s ceiling — the
  interactive checkbox needs human time); widget reset after each
  attempt (tokens are single-use).
- Bodies render via interpolation only — never `v-html`.

`CommentAvatar.vue`: FNV-1a over the seed → hue pair + xorshift bit
field; 5×5 mirrored cells on a two-stop gradient. Deterministic.

## 7. Tests (all green at handoff)

- `Comments.test.ts` (11): projection key set + seed shape; validation;
  thread rooting; depth stays two; parent validation (unknown /
  pending / other post); lock refuses + unlock via reply id;
  subscriptions default/opt-out/scoped; recipients (parent author,
  never starter by default, @mention includes starter); consent +
  never-self; `mentionsIn`.
- `PublicApi.test.ts` (+3): reply carries thread + lands pending;
  locked refusal message; subscription endpoint token gate;
  unsubscribe GET reports / POST removes / forged 403.
- `AdminApi.test.ts` (+2): approving a reply mails the answered author
  with both links, exactly one mail; lock/unlock/404.
- Dashboard `CommentsModel.test.ts` fixture carries the new columns.
- Conventions gate PASS; e2e walk 46/46; browser-driven flows verified
  against a local Worker (thread build, fold/expand, reply prefill +
  chips, follow banner + stop, lock UI + server refusal).

---

## 8. INVARIANTS (as the code stands) — the working list

Stated as if–then. ✅ = enforced by code AND covered by a test.
⚠️ = intended but only partially enforced, or enforced without a test.
❌ = NOT enforced today (a gap; see §9).

**Visibility & privacy**
- I1 ✅ A comment is publicly visible iff `status = 'approved'`. The
  only path to `approved` is the operator's approve action.
- I2 ✅ No public response ever contains an email address (the public
  SELECT has no email column; test asserts the exact key set).
- I3 ✅ `avatar_seed` is stable per email and non-reversible (HMAC).
- I4 ⚠️ Bodies are plain text end-to-end (server stores raw text;
  client interpolates). Enforced by construction, not by test.

**Thread shape**
- I5 ✅ Every row has `root_id`; a root's `root_id` is its own id.
- I6 ✅ `parent_id`, when set, points to an APPROVED row on the same
  slug (checked at submit).
- I7 ✅ Depth ≤ 2: a reply's `root_id` equals its parent's `root_id`
  (never the parent's id when the parent is itself a reply).
- I8 ✅ Referential integrity over time: deleting a ROOT deletes the
  whole thread and its subscriptions; deleting a REPLY re-parents its
  answers onto the root. No dangling `parent_id`/`root_id` ever
  (closed 2026-08-24; was G1).

**Locking**
- I9 ✅ If the root is locked, no new reply is accepted anywhere in
  the thread (server) and the UI offers no reply affordance.
- I10 ✅ `locked` is only ever read/written on the root row.

**Notifications & consent**
- I11 ✅ Notifications are sent only on approval, never on submit.
- I12 ✅ Recipients ⊆ {parent author} ∪ {@mentioned participants}.
- I13 ✅ A recipient must hold a `(root_id, email)` subscription.
- I14 ✅ The reply's own author is never a recipient.
- I15 ✅ The thread starter receives a deep reply only via I12 (parent
  or mention) — never by virtue of starting the thread.
- I16 ✅ At most one email per recipient per approved reply — tested
  with the parent author also @mentioned twice.
- I17 ✅ Approve returns true exactly ONCE per comment
  (`WHERE id = ? AND status = 'pending'`); a second approve is a 404 and
  mails nobody. Tested at both the module and the admin-route level
  (closed 2026-08-24; was G8 — SQLite's `changes` counts MATCHED rows,
  so the unguarded UPDATE used to report success on re-approve).

**Subscriptions**
- I18 ✅ Subscription key is `(root_id, email)`; unsubscribe removes
  exactly one pair; other threads unaffected.
- I19 ✅ A bare `GET /comment-unsubscribe` never mutates (prefetch
  safety); only `confirm=1` or POST does.
- I20 ✅ Thread tokens are scoped to one (thread, email); a forged or
  cross-thread token is rejected (403).
- I21 ✅ The opt-in is recorded on the row (`subscribe_replies`,
  migration 0010) but the subscription is CREATED at approval. A
  comment deleted or never approved leaves no subscription (closed
  2026-08-24; was G2).

**Bot gate**
- I22 ✅ With `TURNSTILE_SECRET` set, a missing/invalid token fails
  closed; hostname must be in `TURNSTILE_HOSTNAMES` (so localhost →
  prod always fails, by design).

## 9. Known gaps / open questions (input to the invariants work)

- ~~G1~~ CLOSED — root delete cascades (thread + subscriptions); reply
  delete re-parents its answers onto the root. Decision recorded: no
  tombstones — a removed root removes the conversation it started.
- ~~G2~~ CLOSED — `subscribe_replies` column records intent at
  submit; `approve()` creates the subscription.
- ~~G3~~ CLOSED (narrowly) — an @mention resolves to the EARLIEST
  participant who used that name in the thread (participants ordered
  by id), so a later impostor cannot capture a mention. Still open as
  a UX question: two "Ada"s render with different identicons but the
  same text; disallowing duplicate names per thread or showing the
  identicon in the mention chip would make the distinction visible.
- **G4 — No rate limiting** beyond Turnstile. Pending-by-default means
  spam has no payoff, but D1 rows accumulate.
- **G5 — Body length only; no link/markdown policy.** Plain text is
  interpolated; URLs are not linkified. Fine, but implicit.
- **G6 — Thread tokens never expire.** Acceptable for unsubscribe
  links (like the newsletter's), but worth stating as a decision.
- **G7 — `locked` on a non-root row is ignored but possible** if
  someone writes it directly; only `setLocked` normalizes to root.
- ~~G8~~ CLOSED — status-guarded UPDATE; tests at module and route
  level.
- **G9 — Mention chips list up to 8 participants**; larger threads
  silently truncate the chip row (the textarea still accepts any
  `@Name`).
- **G10 — Client fold state is per page-load**; no memory of which
  threads a reader expanded. Fine; noted.

## 10. Where things are

```
newsletter/migrations/0008_comments.sql, 0009_comment_threads.sql
newsletter/src/modules/comments/Comments.ts (+ .test.ts)
newsletter/src/modules/api/PublicApi.ts      comment, comments,
                                             commentSubscription, commentUnsubscribe
newsletter/src/modules/api/AdminApi.ts       comments, approveComment (→ notify),
                                             deleteComment, lockComment
newsletter/src/modules/delivery/Delivery.ts  notifyReply, notifyComment
newsletter/src/modules/platform/Security.ts  signature, threadToken, avatarSeed, sha256Hex
newsletter/src/index.ts                      route table (+ doc comment)
newsletter/wrangler.jsonc                    run_worker_first (public paths)
newsletter/dashboard/src/modules/comments/   CommentsModel.ts, CommentsView.vue
newsletter/dashboard/src/modules/platform/Api.ts  CommentRow type, lockComment
docs_v2/.vitepress/theme/components/BlogComments.vue, CommentAvatar.vue
newsletter/README.md                         "Blog comments" section (ops view)
```

Local reproduction: `cd newsletter && npx wrangler@4.120.1 dev --port 8787 --local`
(needs `.dev.vars` with ADMIN_SECRET; apply migrations with
`npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --local`), then
point the built site at it in Playwright by routing
`https://ivue-newsletter.ekalashnikov.workers.dev/**` → `http://localhost:8787`.
Kill the dev server when done.
