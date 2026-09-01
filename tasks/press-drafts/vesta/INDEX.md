# Press drafts — vesta (wave 2: X ammunition)

All six artifacts are finished text. The human's remaining job is copy,
paste, send. Nothing here depends on another file having been read.

| file | venue(s) | purpose | lang | length |
| --- | --- | --- | --- | --- |
| `xhooks.md` | X composer hook picker; ports unchanged to Bluesky + Mastodon | card-text (34 hooks, 12 articles) | en | 10,951 bytes; longest hook 259 chars |
| `launch-thread-alt.md` | X (alternative launch thread), mirrored | thread (8 segments) | en | 3,500 bytes; segments 161–249 chars |
| `long-post-launch.md` | X long post (25,000-char format) | post | en | body 2,963 chars; preview paragraph 236 |
| `long-post-20m-cells.md` | X long post (25,000-char format) | post | en | body 2,738 chars; preview paragraph 268 |
| `bluesky-mastodon-notes.md` | Bluesky, Mastodon (front-end.social / Fosstodon / Hachyderm) | post (porting rules + 2 first-post rewrites) | en | 4,639 bytes |
| `x-article-cards.md` | X format B (4-image typographic cards), reusable on Bluesky + Mastodon | card-text (3 sets, 10 cards) | en | 3,747 bytes |

## Platform facts these drafts are built on (verified 2026-09-01)

- X free accounts: **280 characters** per post, replies and quotes
  included. Premium long posts: **25,000 characters**, but **only the
  first 280 render in the timeline** — the rest sits behind "Show more".
  Both long posts therefore open with a paragraph that stands alone.
- **A URL counts as a fixed 23 characters** on X regardless of its real
  length (t.co shortening).
- Bluesky: 300 characters. Mastodon: 500 characters (standard instance
  default). Links are not algorithmically punished on either, which is
  why the porting notes move the link to post 1 there and keep it last
  on X.

## Withhold check

The press plan holds the AI-agents story for a separate second wave.
`launch-thread-alt.md` therefore contains no agents announcement; the
94,000-line codebase appears once, in segment 6, as a receipt for the
engine — the framing the plan permits. Same discipline in the hooks:
`reactivity-is-an-allocator` and `ban-private` cite the codebase as
evidence, never as a product.

## Checkpoint report

| # | checkpoint | status | observed evidence |
| --- | --- | --- | --- |
| 1 | CP1 count | DONE | Brief requires **at least 6** artifacts; **6** produced (`ls *.md \| wc -l` = 6, INDEX.md excluded from that count by being written after): `xhooks.md`, `launch-thread-alt.md`, `long-post-launch.md`, `long-post-20m-cells.md`, `bluesky-mastodon-notes.md`, `x-article-cards.md`. Sub-counts required by the brief: xHooks for **12** articles with 2–3 each = **34 hooks**, all ≤270 chars (script-measured, `over-limit: 0`, `max len: 259`); alternative thread = **8** segments (brief asked 7–9); **2** long posts, both ≤3,000 chars (2,963 and 2,738 measured); porting notes present. |
| 2 | CP2 headers | DONE | `grep -c 'status: draft-for-review' *.md` returned **1 for each of the 6 artifact files** (6/6): launch-thread-alt.md:1, bluesky-mastodon-notes.md:1, long-post-launch.md:1, x-article-cards.md:1, long-post-20m-cells.md:1, xhooks.md:1. Re-running it now also prints `INDEX.md:1` — that is this checkpoint row quoting the string, not a seventh artifact. Every header block also carries `venue:`, `purpose:`, `lang:`, `source:` — verified by reading the first eight lines of each file. |
| 3 | CP3 titles | DONE | Per-artifact verdicts against the three tests (stranger / verb / receipt): **`launch-thread-alt` segment 1** ("The whole engine is 1,120 bytes gzipped… That number is not a compression trophy. It is a diagnosis.") — stranger: knows the win is a library small enough to audit; verb: they get an engine they can read end to end; receipt: segments 3–7 deliver with the 1.01× heap table and the 22 ms creation figure. **`long-post-launch` preview** ("Plain TypeScript classes, fully reactive, 1.1 kB gzipped… 1,000,000 created in 22 ms") — stranger: yes, classes plus reactivity at a stated size; verb: they get reactive plain classes; receipt: the 3.08 MB vs 3.04 MB measurement and the 5.3× heap comparison follow in-body. **`long-post-20m-cells` preview** ("Google Sheets caps a spreadsheet at ten million cells. This document holds twenty million… 4.7 bytes per cell") — stranger: yes, a document bigger than Sheets allows; verb: they build it themselves; receipt: the 8.5×-below-a-plain-object comparison and the observation invariant deliver it. **`x-article-cards` card-1 lines** ("Every `private` member is a fork waiting to happen"; "Google Sheets caps a spreadsheet at ten million cells"; "Do not solve a removable problem more efficiently. Remove the condition that creates it") — each names a changed fact rather than a mechanism, and each card set's remaining cards carry the evidence. **`xhooks`** — all 34 written under the doctrine: no hook names a mechanism as its promise, and the distinctness rule was applied per article (e.g. `one-kilobyte-feature`'s three hooks pull an auditability reader, a memory-measurement reader, and a supply-chain reader — three different people). **`bluesky-mastodon-notes`** is an operations document, not article-shaped; the three tests do not apply and were not forced onto it. |
| 4 | CP4 voice | DONE | Command run: `grep -rniE 'seamless\|robust\|elegan\|powerful\|blazing\|world-class' .` — **output empty, exit status 1** (no matches) across all files in the directory. |
| 5 | CP5 self-containment | DONE | ivue-identity line located per artifact: **`xhooks.md`** — preamble line "ivue identity line, used verbatim…: ivue, a 1.1 kB class layer over Vue's reactivity", plus the phrase inside the `introducing-ivue` hook 3 and the `the-options-api-everyone-wanted` hook 2, so any single hook posted alone still names the product. **`launch-thread-alt.md`** — segment 2, first sentence: "ivue is a 1.1 kB class layer over Vue's reactivity." **`long-post-launch.md`** — preview paragraph, sentence 3: "This is ivue", carrying "1.1 kB gzipped" from sentence 1, both inside the 280-character preview. **`long-post-20m-cells.md`** — paragraph beginning "All of it runs on ivue, a 1.1 kB class layer over Vue's reactivity". **`bluesky-mastodon-notes.md`** — first body line: "ivue, a 1.1 kB class layer over Vue's reactivity, posts the same threads in three places." **`x-article-cards.md`** — Set 2 post text: "ivue, a 1.1 kB class layer over Vue's reactivity". No artifact refers to another article without restating its claim in one line first. |

DONE
