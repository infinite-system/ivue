# Venues — vesta

Angle: emerging surfaces, TypeScript-specific venues, design-gallery
submission mechanics, Reddit beyond the plan, HN mechanics.

Every row below is a venue that does **not** appear in
`tasks/press-plan.md` (W4 calendar or any W8 section). The six galleries
the plan already names are handled in a separate **Planned-gallery
mechanics** section — mechanics depth, not new venue rows.

`verified` = HTTP status observed from `curl -sI -L -A "Mozilla/5.0"`
on 2026-09-01, or `unverified` with the reason.

---

## Design galleries (new — beyond the plan's six)

| venue | url | how to submit | cost | cadence rule | best article/angle | fit 1-5 | verified | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| recent.design | https://recent.design | "Submit work" dialog on the site (a `submit-work-dialog-*.js` bundle is served on the homepage) | free (no fee stated) | one submission per site | NEW: submit ivue.dev homepage (typewriter hero, dark-first) | 5 | 200 | **Load-bearing finding: `https://godly.website/submit` now 301-redirects to `http://recent.design/?ref=godly`.** Godly's submission path IS recent.design. The plan's Godly row needs this URL or the submission goes nowhere. |
| Hover States | https://www.hoverstat.es/submit | dedicated `/submit` page | free (no fee stated) | one-shot | NEW: ivue.dev site submission — editorial/typographic angle | 4 | 200 | Editorial-leaning curation; docs-site typography is on-genre. Lower volume than Godly, higher signal-per-feature. |
| Curated.design | https://curated.design/submit | dedicated `/submit` page | free (no fee stated) | one-shot | NEW: ivue.dev site submission | 4 | 200 | Broad curated feed; accepts non-agency work. |
| Dark.design | https://www.dark.design | submission link on site | free (no fee stated) | one-shot | NEW: ivue.dev, dark theme default | 4 | 200 | Second dark-specific gallery beside Dark Mode Design — same asset, second placement, zero extra work. |
| bestwebsite.gallery | https://bestwebsite.gallery | site submission entry on homepage (`/submit` returns 404 — path differs) | free (no fee stated) | one-shot | NEW: ivue.dev site submission | 3 | 200 (`/submit` = 404) | Verify the real submit path in-browser before the batch; do not hard-code `/submit`. |
| sitesee.co | https://sitesee.co | homepage submission entry | free (no fee stated) | one-shot | NEW: ivue.dev site submission | 3 | 200 | Smaller feed; cheap add-on to the gallery batch. |
| Webframe | https://www.webframe.xyz | homepage submission entry (`/submit` 404) | free tier | one-shot | NEW: the virtual-scroller + 20M-cell interactions as UI patterns | 3 | 200 (`/submit` = 404) | Indexes *interactions*, not whole sites — the scroller and grid demos fit better than the homepage. |
| Refero | https://refero.design | product-UI reference submission | free (no fee stated) | one-shot | NEW: docs-site UI patterns | 2 | 200 | Product-app oriented; a docs site is off-centre. Low priority. |
| One Page Love | https://onepagelove.com/submit | `/submit` form | free tier exists; paid fast-track offered | one-shot | NEW: ivue.dev homepage | 2 | 200 | One-page focus; ivue.dev is a multi-page docs site — structural mismatch. Submit only if the batch is cheap. |
| Landingfolio | https://www.landingfolio.com | site submission | free tier | one-shot | NEW: homepage | 2 | 200 | Marketing-landing genre; docs sites rarely land. Lowest of the gallery set. |

## Planned-gallery mechanics (NOT new rows — depth on the six the plan names)

| gallery | current submission mechanic (observed) | cost | status |
| --- | --- | --- | --- |
| Godly | `https://godly.website/submit` → **301 → `http://recent.design/?ref=godly`**. Account creation then review, per Godly's own description. | free | live — but submit via recent.design, not a Godly form |
| Dark Mode Design | **email**: `hello@darkmodedesign.com` with subject `Site Submission` (stated on `/about`). No form. Curated solo by Cai Cardenas. | free (donations invited) | live; `darkmodedesign.com/submit` = 404 — do not link it |
| httpster | `/about` states verbatim: **"Submissions are currently closed."** `httpster.net/submit/` = 404. | n/a | **CLOSED** — drop from the week-1 batch; re-check at week 4 |
| minimal.gallery | form at `https://minimal.gallery/submit`; fields: submission type (Website/Template/Tool), category, credits. States **"We don't accept paid website submissions"**, **"It can take 1-2 weeks until the submission is reviewed"**, and "most submissions are not accepted"; resubmission invited. Acceptance publishes to gallery + socials + weekly newsletter. | free | live — best-documented of the six |
| siteInspire | `https://www.siteinspire.com/submissions` — could not read: rate-limited | unread | 429 on three attempts (curl + WebFetch). Mechanics **NOT VERIFIED** — check manually before the batch |
| Land-book | account signup then add-website; `land-book.com/submission-guidelines` exists | **paid element reported** for review/listing | 403 to bots; guidelines page unreadable. Treat as **paid until confirmed free** — the plan's "free, ~10-minute form" assumption is unverified for this one |

## TypeScript-specific venues

| venue | url | how to submit | cost | cadence rule | best article/angle | fit 1-5 | verified | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TypeScript Weekly | https://typescript-weekly.com | no public form observed on the homepage; curator **Marius Schulz** — contact via his socials/email | free | one link per issue, don't resubmit | ban-private | 5 | 200 (`/submit` = 404) | The single most on-target TS newsletter for the `private`-ban/`noImplicitOverride` doctrine. One personal email, not a blast. |
| TypeScript Community Discord | https://discord.gg/typescript | join, then post in the appropriate showcase/projects channel; read channel rules first | free | one post; stay for questions | ban-private, or the-test-is-a-subclass | 4 | 200 | Language-level room: the `protected`+`override` argument is discussable here on its merits, not as a library pitch. |
| typescriptlang.org community page | https://www.typescriptlang.org/community/ | listing surface (community links) — check current criteria | free | one-shot | NEW: one-line ivue entry | 2 | 200 | Durable but criteria-gated; check whether third-party libs are listed at all before spending time. |
| awesome-typescript (GitHub list) | https://github.com/dzharii/awesome-typescript | PR adding one line under the right section | free | one PR | introducing-ivue | 3 | 200 | Same asset class as the plan's awesome-vue PR: permanent, passive, zero maintenance. |
| This Week in React | https://thisweekinreact.com | link suggestion via the curator's contact/socials (a sponsor page exists; no content-submission form observed) | free to suggest | one link | what-native-signals-should-steal | 3 | 200 | Covers signals/TS across frameworks, not React-only. Non-Vue rooms reachable through the signals angle. |
| Frontend at Scale | https://frontendatscale.com | pitch the author (architecture-essay newsletter, biweekly) | free | one pitch | bulletproof-class-modules or uniformity-is-a-measuring-device | 3 | 200 | Architecture-essay audience; the module/seam posts are exactly its genre. |
| Effective TypeScript (Dan Vanderkam) | https://effectivetypescript.com | author contact / blog comment; no submission form | free | one pitch | ban-private | 2 | 200 | Long-shot but a high-credibility TS voice; the `private` argument is the only hook worth using. |

## Vue-official and Vue-adjacent surfaces the plan misses

| venue | url | how to submit | cost | cadence rule | best article/angle | fit 1-5 | verified | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Official Vue.js News — submit form** | https://news.vuejs.org/submit | public form: "submit your story/library/news", reviewed weekly | free | one submission per story | introducing-ivue | 5 | 200 | **Highest-value row in this file.** The official Vue news channel takes open submissions and reviews weekly. The plan names "vuejs.org ecosystem surfaces" vaguely; this is the concrete, working front door. Fire in week 0–1. |
| Vue.js Feed | https://vuejsfeed.com/submit | `/submit` form | free | one per story | the-options-api-everyone-wanted | 4 | 200 | Listed on `vuejs.org/ecosystem/newsletters` as a community newsletter — an editorial surface with an open form. |
| Vue.js Developers Newsletter | https://vuejsdevelopers.com/newsletter/ | pitch via the site's contact | free | one pitch | the-options-api-everyone-wanted | 3 | 200 | Weekly since 2017; listed on the official newsletters page. Separate email from the Thiessen one already in the plan. |
| Vue.js Forum | https://forum.vuejs.org | post in the Show-and-tell / Libraries category | free | one thread, answer replies | introducing-ivue | 3 | 200 | Slower than Discord, but Google-indexed permanently — the same permanence argument the plan makes for r/ivue. |
| Vue Telescope | https://vuetelescope.com | site detection/index; submit or let it detect ivue.dev | free | one-shot | NEW: ivue.dev listed as a Vue-built site | 2 | 200 | Passive index; near-zero cost, near-zero traffic. Batch it with W8h. |
| Weekly Vue News | https://weekly-vue.news | — | — | — | — | 1 | 200 (site up; `/submit` = **404**) | **Discontinued March 2026** per its own final issue. Do not pitch. Recorded so nobody re-adds it from a stale list. |

## Emerging / post-migration surfaces

| venue | url | how to submit | cost | cadence rule | best article/angle | fit 1-5 | verified | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bluesky front-end starter packs | https://blueskystarterpack.com/front-end | ask each pack's owner to add the ivue account (packs are owner-curated) | free | one ask per pack | NEW: the account itself, after 5–10 posts of substance | 4 | 200 | Additive mechanic on the planned Bluesky handle, not a duplicate channel: 28+ front-end packs listed. Being in a pack front-loads followers that the plan's mirror rule otherwise waits years for. Ask AFTER the account has posts. |
| TheBlue.social — software-dev packs | https://theblue.social/starter-packs/category/software-development | same: request inclusion from pack owners | free | one ask per pack | same as above | 3 | 200 | Second index of the same mechanic; different pack owners. |
| Bluesky Directory | https://blueskydirectory.com/starter-packs | directory of packs + official dev accounts | free | one-shot | same | 3 | 200 | Use as the discovery index, then contact owners. |
| Hachyderm.io (Mastodon) | https://hachyderm.io | account + posts; instance-local timeline reaches senior infra/dev crowd | free | standing (mirror rule) | every X thread | 3 | 200 | The plan names front-end.social and Fosstodon. Hachyderm is the third instance where senior engineers concentrated post-migration; boosting from a Hachyderm account reaches a different local timeline. |
| Reactiflux Discord | https://discord.gg/reactiflux | join; post in the jobs/showcase-appropriate channel per rules | free | one post; read rules | reactivity-is-an-allocator or what-native-signals-should-steal | 3 | 200 | 200k+ members, React-centric but signals-literate. Frame as reactivity engineering, never as a Vue pitch. |
| The Coding Den Discord | https://discord.gg/code | join; showcase channel | free | one post | introducing-ivue | 2 | 200 | 148k members but skews beginner — low conversion for a 1.1 kB engine argument. |
| DevURLs | https://devurls.com | aggregator that pulls from sources; submit the blog feed as a source | free | one-shot | blog RSS | 3 | 200 | Feed-level, not post-level: one submission, permanent recurring surface. |
| Console.dev | https://console.dev | tool-review newsletter; submission entry on site (`/submit` and `/about/` both 404 — path differs) | free | one submission | introducing-ivue | 3 | 200 (`/submit` 404, `/about/` 404) | Curated dev-tool newsletter with real editorial standards. **Find the live submission path in-browser** — the two obvious paths are dead. |
| Hashnode | https://hashnode.com | cross-post with `canonical_url` pointing at ivue.dev | free | one post per article, spaced | the-options-api-everyone-wanted | 3 | 200 | Same move the plan makes for dev.to, second platform, zero extra writing. Canonical tag protects SEO. |
| HackerNoon | https://hackernoon.com | submit via their editor; editorial review | free | one per story | three-years-to-reduce or agents-built-an-editor | 2 | 200 | Editorial queue is slow and the audience is broad rather than deep. Only worth it for the agents/story posts. |
| JavaScript in Plain English | https://javascript.plainenglish.io | guest-post/syndication via the In Plain English network | free | one per story | the-options-api-everyone-wanted | 2 | 403 to bots (Medium-hosted; browser-reachable) | Network claims ~3.5M monthly views; conversion for a niche engine is thin. Syndicate only what already won a room. |
| Tildes | https://tildes.net | invite-only community; post in ~comp | free | one post; strongly anti-promo | win-by-reduction | 2 | 200 | Small, high-quality, lobsters-adjacent. Needs an invite and an essay-first framing — same discipline as r/programming. |
| SaaSHub | https://www.saashub.com | product listing submission | free tier | one-shot | NEW: listing | 2 | 200 | Alternative-search SEO, same class as the plan's AlternativeTo row. |
| OpenAlternative | https://openalternative.co/submit | `/submit` form for open-source tools | free (paid fast-track offered) | one-shot | introducing-ivue | 3 | 200 | Open-source-specific directory; "open-source alternative to X" is a durable search surface. |
| DevHunt | https://devhunt.org/submit | weekly dev-tool launch board, `/submit` form | free | one launch | introducing-ivue | 3 | 200 | Dev-tool-only launch board — far better audience fit per submission than Product Hunt, and free. Week 2–3, not week 0. |
| Uneed | https://uneed.best | launch submission (path differs — `/submit` 404) | free tier + paid boost | one launch | introducing-ivue | 2 | 200 (`/submit` = 404) | Product-Hunt-alternative traffic; small but free. Batch with DevHunt. |
| Microlaunch | https://microlaunch.net | daily launch board submission | free | one launch | introducing-ivue | 2 | 200 | Same class as Uneed; low ceiling, ~10 minutes. |
| Fazier | https://fazier.com | launch board submission | free | one launch | introducing-ivue | 2 | 200 | Same class. Submit all three launch boards in one sitting or none. |

## Reddit beyond the plan (rules quoted; see verification caveat)

**Verification caveat, stated plainly:** reddit.com returned **403 to
every automated request** — `curl` on 11 subreddit URLs and WebFetch on
both `www.reddit.com` and `old.reddit.com` (WebFetch: "Claude Code is
unable to fetch from www.reddit.com"). The rule text below is therefore
sourced from **third-party rule-tracking summaries read via web search**,
not from the subreddits' own rule pages. **Every rule quote must be
re-read on the live subreddit before posting.**

| venue | url | how to submit | cost | cadence rule | best article/angle | fit 1-5 | verified | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r/SideProject | https://www.reddit.com/r/SideProject/ | text post: what you built, why, what tech, what feedback you want | free | one post; reciprocity expected (comment on others) | introducing-ivue + the live benchmark link | 4 | 403 (bot-blocked) | Reported rule: self-promotion **explicitly allowed**, but "posts must show the actual product. Do not link to a waiting list or email gate. Show something real." ivue clears that trivially — the benchmarks run in-browser. Removals hit "low-effort 'check this out' posts". |
| r/opensource | https://www.reddit.com/r/opensource/ | text post; project-with-context framing | free | one post, spaced weeks | one-kilobyte-feature or the-test-is-a-subclass | 3 | 403 (bot-blocked) | Reported: self-promo tolerated but the room expects contribution, not link-drops. License + stewardship answers from the W13 objection bank belong in the first comment. |
| r/coolgithubprojects | https://www.reddit.com/r/coolgithubprojects/ | link post to the GitHub repo | free | one post | repo link; W12 README is the landing page | 3 | 403 (bot-blocked) | Reported: "blatant self-promotion" gets downvoted, not banned — the repo must carry the pitch. **Gate this row on W12 (README first screen + social preview) being done.** |
| r/frontend | https://www.reddit.com/r/frontend/ | text post, engineering framing | free | one post, spaced | a-million-rows-twelve-divs | 3 | 403 (bot-blocked) | Smaller and less hostile than r/webdev; same "project not product" discipline. |
| r/InternetIsBeautiful | https://www.reddit.com/r/InternetIsBeautiful/ | link post to ivue.dev | free | one post | NEW: the live 20M-cell / 1M-row demo page as the destination | 2 | 403 (bot-blocked) | Reported rules: **90/10 rule** (90% of your recent Reddit activity unrelated to your own site), no sign-up-gated products, "genuinely novel" only. A docs site is a stretch; a bare interactive-demo URL is the only version with a chance. Low priority, real removal risk. |

## Strategy notes

- **Fix the Godly row before week 1.** `godly.website/submit` 301s to
  `recent.design`. Anyone following the plan's Godly line lands on a
  redirect; the actual submission is the recent.design work dialog.
- **Drop httpster from the week-1 gallery batch.** Its `/about` says
  verbatim "Submissions are currently closed" and `/submit/` is a 404.
  Re-check at week 4; spend the slot on Hover States or Dark.design.
- **Re-price Land-book before submitting.** Reported to require payment
  for review/listing, contradicting the plan's "curated, free" grouping.
  Confirm in-browser; if paid, it belongs with Awwwards/CSSDA in the
  not-paying bucket.
- **minimal.gallery sets the gallery clock: 1–2 weeks to review.** So
  the gallery batch must fire in week 1, not week 2, for placements to
  land inside the launch window.
- **Gallery pre-flight is one pass, not six.** All ten new galleries
  judge the same first screen at thumbnail width. Do the plan's W8h2 QA
  pass once, then submit all of them in a single sitting.
- **`news.vuejs.org/submit` is a week-0 action, not week 1.** It is the
  official Vue news channel, reviewed weekly, open form, free — the
  cheapest high-fit placement found in this sweep, and it needs a full
  review cycle to land while launch attention is live.
- **Bluesky starter packs come after the account has substance.** Pack
  owners add accounts that already post; asking on day one converts
  worse than asking in week 3 with ten receipts posts behind you.
- **Launch boards (DevHunt, Uneed, Microlaunch, Fazier) are one sitting
  in week 2–3.** They are the same submission four times. Do not scatter
  them across the calendar — the marginal cost is batching, and none of
  them merits its own slot.
- **Show HN mechanics, encoded:** Show HN is for "things people can
  try" — the live in-browser benchmarks and the StackBlitz playground
  are what makes ivue a legitimate Show HN rather than a blog-post
  submission (blog posts must go as regular submissions). A story may be
  re-submitted if it hasn't had significant attention in ~a year;
  delete-and-repost is explicitly not okay. The **second-chance pool**
  cannot be applied for — moderators and reviewers comb `/newest` and
  re-up overlooked stories at a random front-page slot, so the only
  lever is making the submission worth rescuing (title + first comment
  ready at submit time). Email moderators only for moderation mistakes,
  never as a promotion channel.
- **r/webdev's Showoff Saturday is a hard gate on the plan's W8c row.**
  Non-commercial project showoffs are limited to Saturday and must lead
  with technical detail — so the plan's week-2 r/webdev firing has to be
  calendared on a Saturday, or it gets removed.

## Checkpoint report

| # | checkpoint | status | observed evidence |
| --- | --- | --- | --- |
| 1 | CP1 preload comprehension | DONE | **IBR's two proof modes:** proof by reduction (eliminate by contradiction and deletion until what remains is irreducible) and proof by generation (the survivor must generate every valid instance of its domain and predict the impossibility boundary); reduction establishes irreducibility, generation establishes completeness. **ivue's ref-getter rule:** mutable state is written `get x() { return ref(v) }` — the engine turns a ref-returning getter into a cached Ref on first touch, and inside the class you read and write it through `.value`; a plain field would not trigger anything, and a plain getter is the *derived* form (zero bytes per instance, reactive by leaf tracking). **One article slug + tag set:** `ban-private` → tags `[patterns, architecture, agents, invar]`. **The press plan's rotation math:** ~12 rooms × one post per room every 2–3 weeks = 4–6 placements a week indefinitely, with no room seeing the project twice in a month. |
| 2 | CP2 voice absorption | DONE | 6 articles read in full: `ban-private`, `the-options-api-everyone-wanted`, `a-million-rows-twelve-divs`, `introducing-ivue`, `twenty-million-cells`, `the-test-is-a-subclass` (1,253 lines across the first six files, per `wc -l`). Venue fit for three: **`ban-private`** → TypeScript Weekly / TS Community Discord — it is a pure TS-technique argument (`private` vs `protected` + `noImplicitOverride`) that needs no Vue knowledge to be interesting. **`a-million-rows-twelve-divs`** → Webframe / r/frontend — it is an *interaction* with a live demo and a rows-in-DOM counter, which is what interaction galleries and engineering-framed rooms reward. **`introducing-ivue`** → news.vuejs.org/submit — it is the canonical launch story with measured numbers, and the official Vue news channel takes exactly this shape of submission. |
| 3 | CP3 venue table | DONE | **46 venue rows total** (counted programmatically over the markdown tables), in 5 categories: Design galleries (new) = 10; TypeScript-specific = 7; Vue-official/adjacent = 6; Emerging/post-migration = 18; Reddit beyond the plan = 5. Plus a 6-row **Planned-gallery mechanics** table, which is explicitly NOT counted as venue rows. |
| 4 | CP4 verification | DONE (with named exceptions) | **Curl-checked: 46/46 rows.** Status distribution (counted programmatically over the `verified` column): **200 = 40**; **403 (bot-blocked, venue confirmed live via browser-class search results) = 6** (5 Reddit rows + JavaScript in Plain English). One of the 40 is live-but-dead-as-a-venue: weekly-vue.news returns 200, its `/submit` is 404, and the newsletter ended March 2026. Three status lines observed verbatim: `200 https://news.vuejs.org/submit`, `403 https://www.reddit.com/r/SideProject/`, `200 https://recent.design`. Additional observed sub-path facts recorded in the notes column: `typescript-weekly.com/submit` = 404, `console.dev/submit` = 404, `uneed.best/submit` = 404, `bestwebsite.gallery/submit` = 404, `webframe.xyz/submit` = 404. **NOT verified:** siteInspire submission mechanics — `https://www.siteinspire.com/submissions` returned **429** on three attempts (curl ×2, WebFetch ×1); Land-book guidelines — **403** to curl and WebFetch. Both are flagged unread in the mechanics table rather than guessed. |
| 5 | CP5 no-duplicates | DONE | Cross-checked against W4 + all W8 sections. **Press-plan venues deliberately excluded from my table (48 named):** Hacker News, lobste.rs, dev.to, r/vuejs, r/javascript, r/typescript, r/webdev, r/programming, r/ivue, X, LinkedIn, Bluesky (as the mirror channel), Mastodon front-end.social, Fosstodon, JavaScript Weekly, Bytes (ui.dev), Frontend Focus, TLDR Web Dev, Michael Thiessen's newsletter, Vue Land Discord #showcase, awesome-vue PR, Echo JS, daily.dev, vuejs.org ecosystem listing surfaces, madewithvuejs.com, vuejsexamples.com, vue.libhunt.com, alternativeto.net, Product Hunt, StackBlitz, Habr, t.me/vuejs_ru, juejin.cn, Zhihu, Zenn, Qiita, tc39/proposal-signals, LearnVue, Alexander Lichter / DejaVue, Vue Mastery, Vue School, Views on Vue, JS Party, Godly, Dark Mode Design, siteInspire, httpster, Land-book, minimal.gallery, VitePress showcase, "beautiful docs" awesome-lists, Awwwards, CSSDA, FWA. The six planned galleries appear ONLY in the mechanics table, labelled as not-new rows. Two rows sit adjacent to planned channels and say so in their notes: Bluesky starter packs (additive mechanic on the planned Bluesky handle, not a second channel) and Hachyderm.io (a third Mastodon instance, distinct from the two the plan names). |
| 6 | CP6 strategy notes | DONE | **10 bullets** in `## Strategy notes`, each naming a calendar action: fix the Godly URL, drop httpster, re-price Land-book, gallery clock 1–2 weeks → week 1, one pre-flight pass for all ten galleries, news.vuejs.org in week 0, starter packs after the account has posts, launch boards batched in week 2–3, Show HN mechanics (try-able artifact, ~1-year repost rule, second-chance pool is not applied for), r/webdev must be a Saturday. |

DONE
