// The press calendar's plan data — SYNTHESIZED 2026-09-01 from
// tasks/press-plan.md (W4/W8) + the five-agent venue research in
// tasks/press-research/ (222 live-verified rows; corrections applied).
// ANCHOR: launch day = Tuesday 2026-09-08. If launch slides, entries
// slide with it — dates are week-anchored judgments, not appointments.
// Checkmark state does NOT live here (localStorage owns it) — this
// file is the plan, not the progress.

export interface PressEntry {
  /** stable id: `${date}--${venue-slug}` — the checkmark key */
  id: string;
  /** YYYY-MM-DD (planned posting day; user may slide) */
  date: string;
  venue: string;
  url: string;
  /** channel group for filtering/coloring */
  channel: PressChannel;
  /** article slug from the blog, or NEW:/MOD: descriptor */
  article: string;
  /** one line: what to post and the angle */
  angle: string;
  /** where the paste-ready copy lives, when prepared */
  draft?: string;
  /** minutes of human work expected */
  effortMin: number;
  /** 1 = Vue launch wave, 2 = agents-story wave */
  wave: 1 | 2;
  /** language of the artifact */
  lang: 'en' | 'ru' | 'zh' | 'ja';
}

export type PressChannel =
  | 'prep'
  | 'hn'
  | 'reddit'
  | 'x'
  | 'newsletter-pitch'
  | 'podcast'
  | 'creator'
  | 'gallery'
  | 'directory'
  | 'community'
  | 'article-platform'
  | 'intl'
  | 'conference';

const D = (
  date: string,
  venue: string,
  url: string,
  channel: PressChannel,
  article: string,
  angle: string,
  effortMin: number,
  wave: 1 | 2 = 1,
  lang: PressEntry['lang'] = 'en',
  draft?: string,
): PressEntry => ({
  id: `${date}--${venue.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  date,
  venue,
  url,
  channel,
  article,
  angle,
  draft,
  effortMin,
  wave,
  lang,
});

export const PRESS_ENTRIES: PressEntry[] = [
  /* ---------- WEEK 0 — pre-flight (Mon 9/7) ---------- */
  D('2026-09-07', 'Repo + npm pre-flight (W12)', 'https://github.com/infinite-system/ivue', 'prep', 'NEW: README first screen', 'README as pitch, social preview OG image, topics set, Discussions off, npm page verified', 120),
  D('2026-09-07', 'Register Bluesky + Mastodon handles', 'https://bsky.app', 'prep', 'n/a', 'hold the names before launch (front-end.social first choice, Fosstodon fallback)', 20),
  D('2026-09-07', 'W11 instrumentation on', 'https://dash.cloudflare.com', 'prep', 'n/a', 'CF Web Analytics or Worker referrer logging live BEFORE the first placement', 60),
  D('2026-09-07', 'CFP hub first check', 'https://events.vuejs.org/call-for-proposals/', 'conference', 'n/a', 'record every open Vue CFP + deadline; deadlines are the only irreversible dates', 20),
  D('2026-09-07', 'Objection bank + runbook final read', 'https://ivue.dev', 'prep', 'NEW: W13 artifacts', 'read tasks/press-drafts/juno/ objection-bank + launch-runbook once, tonight-fresh', 30, 1, 'en', 'tasks/press-drafts/juno/'),

  /* ---------- WEEK 0 — launch day (Tue 9/8) ---------- */
  D('2026-09-08', 'Hacker News — Show HN', 'https://news.ycombinator.com/submit', 'hn', 'introducing-ivue', 'Show HN 9:00 ET per runbook; first comment (self-criticism) posted immediately; monitor 2h continuous', 180, 1, 'en', 'docs_v2/blog/hn-show-hn-launch.md'),
  D('2026-09-08', 'X — launch thread', 'https://x.com', 'x', 'introducing-ivue', 'the 9-segment launch thread via composer; banner on segment 1; same-day Bluesky+Mastodon mirror', 45, 1, 'en', 'docs_v2/blog/x-launch-thread.md'),
  D('2026-09-08', 'r/vuejs — launch post', 'https://reddit.com/r/vuejs', 'reddit', 'introducing-ivue', 'the written launch post; answer every technical comment with numbers', 60, 1, 'en', 'docs_v2/blog/reddit-r-vuejs-launch.md'),
  D('2026-09-08', 'LinkedIn — launch', 'https://linkedin.com', 'community', 'introducing-ivue', 'discovery-arc voice launch post', 20, 1, 'en', 'docs_v2/blog/linkedin-launch.md'),
  D('2026-09-08', 'news.vuejs.org', 'https://news.vuejs.org/submit', 'newsletter-pitch', 'introducing-ivue', 'official Vue news desk — open form, weekly review; the cheapest high-fit placement (week-0 action)', 10),
  D('2026-09-08', 'Vue.js Feed — library entry', 'https://vuejsfeed.com/submit', 'newsletter-pitch', 'introducing-ivue', 'submit ivue as a LIBRARY (plugins category); articles come later as separate bites', 10),
  D('2026-09-08', 'JSer.info Ping', 'https://jser.info/support/', 'intl', 'introducing-ivue', 'URL ping with a short Japanese summary — no account needed, discovery surface', 15, 1, 'ja'),
  D('2026-09-08', 'Hatena Bookmark', 'https://b.hatena.ne.jp', 'intl', 'introducing-ivue', 'bookmark the launch article with Japanese title/comment; one URL, organic from there', 10, 1, 'ja'),

  /* ---------- WEEK 0 — Wed 9/9 to Sun 9/13 ---------- */
  D('2026-09-09', 'Changelog News', 'https://changelog.com/news/submit', 'newsletter-pitch', 'introducing-ivue', 'link queue: URL + why it matters in two sentences', 10),
  D('2026-09-09', 'VueDigest', 'https://vuedigest.com/news/suggest', 'newsletter-pitch', 'introducing-ivue', 'suggest-a-link form; the Vue-specific successor to Weekly Vue News', 10),
  D('2026-09-09', 'Web Tools Weekly', 'https://webtoolsweekly.com/submit', 'newsletter-pitch', 'introducing-ivue', 'DM @LouisLazaris: the TOOL (ivue.dev / repo), not an article — they reject articles', 10),
  D('2026-09-09', 'Web Dev Weekly', 'https://webdevweekly.com/submit', 'newsletter-pitch', 'one-kilobyte-feature', 'public form, no account; one distinct article', 5),
  D('2026-09-09', 'Cooperpress — JS Weekly', 'mailto:editor@cooperpress.com', 'newsletter-pitch', 'introducing-ivue', 'THE ONE Cooperpress pitch (shared budget with Frontend Focus/Node Weekly — next family pitch ~6 weeks out)', 15, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-09', 'Syntax — potluck question', 'https://syntax.fm/potluck', 'podcast', 'NEW: potluck question', '"are classes back in 2026? 1.1 kB reactive class layer, here are the numbers" — a question, never a pitch', 15),
  D('2026-09-10', 'Vue Land Discord (showcase)', 'https://chat.vuejs.org', 'community', 'introducing-ivue', 'one-paragraph story + playground link + 1M-rows clip; stay in-thread same day', 45),
  D('2026-09-10', 'Vue.js Forum — show and tell', 'https://forum.vuejs.org', 'community', 'introducing-ivue', 'permanent Google-indexed thread; ten-minute drop', 10),
  D('2026-09-10', 'Echo JS', 'https://echojs.com', 'directory', 'introducing-ivue', 'plain link drop, title = article title, no pitch text', 5),
  D('2026-09-10', 'daily.dev', 'https://daily.dev', 'directory', 'introducing-ivue', 'squad/submission flow; algorithm resurfaces good posts', 10),
  D('2026-09-10', 'awesome-vue — PR', 'https://github.com/vuejs/awesome-vue', 'directory', 'introducing-ivue', 'one line + link under the right section', 15, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2026-09-10', 'Best of JS — PR', 'https://bestofjs.org/projects/project-guidelines', 'directory', 'introducing-ivue', 'add-project issue/PR per their guidelines; feeds trending surfaces other curators read', 20),
  D('2026-09-11', 'Gallery QA pre-flight', 'https://ivue.dev', 'gallery', 'n/a', 'ONE pass: homepage at gallery-thumbnail widths, both themes — then the whole batch below', 30),
  D('2026-09-11', 'Godly (via recent.design)', 'https://recent.design', 'gallery', 'NEW: site submission', 'godly.website/submit 301s HERE — use the submit-work dialog', 10),
  D('2026-09-11', 'Dark Mode Design', 'mailto:hello@darkmodedesign.com', 'gallery', 'NEW: site submission', 'EMAIL with subject "Site Submission" (no form exists)', 10, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2026-09-11', 'minimal.gallery', 'https://minimal.gallery/submit', 'gallery', 'NEW: site submission', '1–2 week review clock — this is why the batch is week 1', 10),
  D('2026-09-11', 'siteInspire', 'https://www.siteinspire.com/submissions', 'gallery', 'NEW: site submission', 'form rate-limits bots — verify manually in-browser', 10),
  D('2026-09-11', 'Hover States', 'https://www.hoverstat.es/submit', 'gallery', 'NEW: site submission', 'editorial/typographic angle — docs typography is on-genre', 10),
  D('2026-09-11', 'Curated.design', 'https://curated.design/submit', 'gallery', 'NEW: site submission', 'broad curated feed, accepts non-agency work', 5),
  D('2026-09-11', 'Dark.design', 'https://www.dark.design', 'gallery', 'NEW: site submission', 'second dark-specific gallery — same asset, second placement', 5),
  D('2026-09-11', 'Land-book (re-price first)', 'https://land-book.com', 'gallery', 'NEW: site submission', 'reported paid review element — confirm free before submitting, else skip', 10),
  D('2026-09-12', 'r/webdev — Showoff Saturday', 'https://reddit.com/r/webdev', 'reddit', 'a-million-rows-twelve-divs', 'SATURDAY-ONLY hard gate; engineering framing + clip, never product', 60, 1, 'en', 'tasks/press-drafts/terra/'),

  /* ---------- WEEK 1 (9/14–9/20) ---------- */
  D('2026-09-14', 'dev.to — cross-post', 'https://dev.to', 'article-platform', 'the-options-api-everyone-wanted', 'full cross-post with canonical link to ivue.dev', 20, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2026-09-14', 'Hashnode — mirror', 'https://hashnode.com', 'article-platform', 'the-options-api-everyone-wanted', 'same move, second address; set Original URL canonical', 15),
  D('2026-09-14', 'Telegram — vuejs_ru (warm)', 'https://t.me/vuejs_ru', 'intl', 'introducing-ivue', 'the personal message to the leader who gave us the npm name — thank, story, ask where to share', 20, 1, 'ru', 'tasks/press-drafts/luna/'),
  D('2026-09-15', 'lobste.rs', 'https://lobste.rs', 'community', 'bulletproof-class-modules', 'article-first submission, no pitch', 15, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2026-09-15', 'X — re-angle thread #1', 'https://x.com', 'x', 'one-kilobyte-feature', 'fresh xHook angle (never the launch hook again); mirror same day', 20, 1, 'en', 'tasks/press-drafts/vesta/xhooks.md'),
  D('2026-09-16', 'madewithvuejs.com', 'https://madewithvuejs.com', 'directory', 'introducing-ivue', 'directory drop batch 1 of 2 — one sitting', 10),
  D('2026-09-16', 'vuejsexamples.com', 'https://vuejsexamples.com', 'directory', 'introducing-ivue', 'same sitting', 10),
  D('2026-09-16', 'vue.libhunt.com', 'https://vue.libhunt.com', 'directory', 'introducing-ivue', 'verify listing picked up description+topics (W12 feeds this)', 5),
  D('2026-09-16', 'AlternativeTo', 'https://alternativeto.net', 'directory', 'introducing-ivue', 'list under Pinia/Vuex/MobX alternatives', 15),
  D('2026-09-16', 'OpenAlternative', 'https://openalternative.co/submit', 'directory', 'introducing-ivue', 'open-source-specific directory', 10),
  D('2026-09-16', 'SaaSHub', 'https://www.saashub.com', 'directory', 'introducing-ivue', 'alternative-search SEO, same class', 10),
  D('2026-09-16', 'Vue Telescope', 'https://vuetelescope.com', 'directory', 'n/a', 'passive index: verify ivue.dev detected as Vue-built', 5),
  D('2026-09-16', 'Libraries.io QA', 'https://libraries.io', 'directory', 'n/a', 'passive: check the npm listing renders description + repo', 5),
  D('2026-09-17', 'Vue.js Developers Newsletter', 'https://vuejsdevelopers.com/newsletter/', 'newsletter-pitch', 'bulletproof-class-modules', 'curator pitch: link + one measured sentence', 10),
  D('2026-09-17', '"New in Vue" monthly roundup', 'https://dev.to/aloisseckar', 'newsletter-pitch', 'introducing-ivue', 'comment on the current month roundup with the link (feeds other curators)', 10),
  D('2026-09-17', 'Frontend Weekly', 'https://docs.google.com/forms/d/e/1FAIpQLSf2mJpquxOICZBp6o8qjiVOuh7ktSsF3V1Ge3YBZf8_x2z2gA/viewform', 'newsletter-pitch', 'a-million-rows-twelve-divs', 'Google form; ~30k readers', 10),
  D('2026-09-17', 'console.dev', 'mailto:hello@console.dev', 'newsletter-pitch', 'introducing-ivue', 'email the tool with repo, docs, install command, measurement links', 15, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-18', 'StackBlitz tag-team (X)', 'https://x.com', 'x', 'a-million-rows-twelve-divs', 'tweet the 1M-rows clip tagging @stackblitz with the one-click link', 15),
  D('2026-09-18', 'DevURLs — feed source', 'https://devurls.com', 'directory', 'n/a', 'submit the blog RSS as a source: one-shot, permanent recurring surface', 10),
  D('2026-09-19', 'r/coolgithubprojects', 'https://reddit.com/r/coolgithubprojects', 'reddit', 'introducing-ivue', 'repo link post — gated on W12 README being the landing page', 10),

  /* ---------- WEEK 2 (9/21–9/27) ---------- */
  D('2026-09-21', 'r/typescript — ban private', 'https://reddit.com/r/typescript', 'reddit', 'ban-private', 'TS-techniques essay (protected/override doctrine), never a library pitch', 45, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2026-09-21', 'TypeScript Weekly', 'https://typescript-weekly.com', 'newsletter-pitch', 'ban-private', 'personal email to Marius Schulz (no form exists) — the most on-target TS newsletter', 15, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-21', 'TypeScript Discord', 'https://discord.gg/typescript', 'community', 'ban-private', 'ask moderators which channel permits an authored-library post FIRST, then post', 30),
  D('2026-09-22', 'HackerNoon — cross-post', 'https://hackernoon.com', 'article-platform', 'one-kilobyte-feature', 'writer account; set First-seen-at canonical to ivue.dev', 30),
  D('2026-09-22', 'Michael Thiessen — one email', 'https://michaelnthiessen.com', 'creator', 'the-options-api-everyone-wanted', 'ONE email covering newsletter submission + creator relationship; numbers up front', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-23', 'LearnVue (Matt Maribojoc)', 'https://learnvue.co', 'creator', 'the-options-api-everyone-wanted', 'video practically scripts itself from post + clips', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-23', 'Vue Mastery — one email', 'https://www.vuemastery.com', 'creator', 'NEW: teaching story', 'one email, two asks (courses + their YouTube) — never two emails to one desk', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-23', 'Vue School — one email', 'https://vueschool.io', 'creator', 'NEW: teaching story', 'separate personalized email (competitor of Vue Mastery — never CC); covers courses + newsroom', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-24', 'TypeScript.fm', 'https://typescript.fm', 'podcast', 'ban-private', 'first podcast pitch out — TS-first, weekly, founder email gets read', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-24', 'DejaVue (Alexander Lichter)', 'https://deja-vue.dev', 'podcast', 'the-options-api-everyone-wanted', 'one email, two asks (podcast + his channel); discovery arc + invariants method', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-24', 'PodRocket (LogRocket)', 'https://podrocket.logrocket.com/contact-us', 'podcast', 'twenty-million-cells', 'one guest, one topic: 20M cells at 4.7 bytes each is a whole episode', 20, 1, 'en', 'tasks/press-drafts/sol/'),
  D('2026-09-25', 'DevHunt', 'https://devhunt.org/submit', 'directory', 'introducing-ivue', 'launch-board batch (all four in one sitting)', 15),
  D('2026-09-25', 'Uneed', 'https://uneed.best', 'directory', 'introducing-ivue', 'same sitting', 10),
  D('2026-09-25', 'Microlaunch', 'https://microlaunch.net', 'directory', 'introducing-ivue', 'same sitting', 10),
  D('2026-09-25', 'Fazier', 'https://fazier.com', 'directory', 'introducing-ivue', 'same sitting', 10),
  D('2026-09-26', 'r/opensource', 'https://reddit.com/r/opensource', 'reddit', 'three-years-to-reduce', 'project-story framing; license/stewardship answers ready in first comment', 30),

  /* ---------- WEEK 3 (9/28–10/4) ---------- */
  D('2026-09-28', 'Vue.js Talks (Epicmax) — CFP', 'https://epicmax.co/vuejstalks', 'conference', 'a-million-rows-twelve-divs', 'open intake, online, first-timers welcome — 20–30 min remote talk with demo', 30),
  D('2026-09-28', 'Vue.js London — speaker ask', 'https://www.meetup.com/vuejs-london/', 'conference', 'introducing-ivue', 'they recruit speakers; low-risk rehearsal producing a recording', 20),
  D('2026-09-29', 'HN — second shot', 'https://news.ycombinator.com/submit', 'hn', 'what-native-signals-should-steal', 'TC39 angle as a regular submission (not Show HN)', 60),
  D('2026-09-29', 'tc39/proposal-signals discussion', 'https://github.com/tc39/proposal-signals', 'community', 'note-tc39-signals-discussion', 'the data-first draft as written', 30, 1, 'en', 'docs_v2/blog/note-tc39-signals-discussion.md'),
  D('2026-09-30', 'This Week in React', 'https://thisweekinreact.com', 'newsletter-pitch', 'what-native-signals-should-steal', 'signals angle travels across frameworks — suggest via curator socials', 10),
  D('2026-09-30', 'juejin.cn — ZH piece', 'https://juejin.cn', 'intl', 'MOD: introducing-ivue (ZH)', 'the tightened Chinese piece, code verbatim, link to ivue.dev', 45, 1, 'zh', 'tasks/press-drafts/luna/'),
  D('2026-09-30', 'README zh section', 'https://github.com/infinite-system/ivue', 'intl', 'MOD: README (ZH)', 'commit the zh section — cheap, standard practice', 15, 1, 'zh', 'tasks/press-drafts/luna/'),
  D('2026-10-01', 'devtools.fm — guest form', 'https://www.devtools.fm/guests', 'podcast', 'bulletproof-class-modules', 'the guest application: live benchmark + prototype-transform walkthrough offer', 20),
  D('2026-10-01', 'Frontend First', 'https://frontendfirst.fm/contact/', 'podcast', 'a-million-rows-twelve-divs', 'frontend architecture case, not a library ad', 15),
  D('2026-10-01', 'Web Rush', 'https://webrush.io', 'podcast', 'the-options-api-everyone-wanted', 'guest-driven panel, Vue-friendly', 15),
  D('2026-10-02', 'r/vuejs mods — AMA ask', 'https://reddit.com/r/vuejs', 'reddit', 'n/a', 'coordinate the week-5 AMA with mods; receipts line as the pitch', 20),
  D('2026-10-02', 'Vue.js Paris — talk issue', 'https://github.com/Vue-js-Paris/talks', 'conference', 'measured-not-promised', 'GitHub talk-idea issue; non-francophone welcome', 15),
  D('2026-10-02', 'Hamburg Vue.js — talk issue', 'https://github.com/Vue-js-Hamburg/talks', 'conference', 'computed-is-a-cache', 'talk-repo issue; bilingual group', 15),

  /* ---------- WEEK 4 (10/5–10/11) ---------- */
  D('2026-10-05', 'r/vuejs — perf receipts', 'https://reddit.com/r/vuejs', 'reddit', 'a-million-rows-twelve-divs', 'second r/vuejs entry, 4 weeks after launch post', 30),
  D('2026-10-05', 'Habr — RU flagship', 'https://habr.com', 'intl', 'MOD: the-options-api-everyone-wanted (RU)', 'the natively-reviewed Habr adaptation (pick confirmed by launch data)', 60, 1, 'ru', 'tasks/press-drafts/luna/'),
  D('2026-10-06', 'X — re-promotion pass', 'https://x.com', 'x', 'week 0–2 articles', 'UNUSED xHooks angles only; composer greys used hooks', 30, 1, 'en', 'tasks/press-drafts/vesta/xhooks.md'),
  D('2026-10-07', 'Zenn — JA piece', 'https://zenn.dev', 'intl', 'MOD: introducing-ivue (JA)', 'the ~800-word Japanese adaptation, code verbatim', 45, 1, 'ja', 'tasks/press-drafts/luna/'),
  D('2026-10-07', 'note.com — JA note', 'https://note.com', 'intl', 'MOD: the-options-api-everyone-wanted (JA)', 'anatomy comparison, no sales language', 30, 1, 'ja'),
  D('2026-10-08', 'Reactiflux (i-built-this)', 'https://www.reactiflux.com/promotion', 'community', 'reactivity-is-an-allocator', 'reactivity engineering framing for a React room — never a Vue pitch', 30),
  D('2026-10-08', 'Front-end Developers Discord', 'https://frontenddevelopers.org', 'community', 'a-million-rows-twelve-divs', 'share-work channel: frame the scroller as a review request', 20),
  D('2026-10-09', 'Indie Hackers — build story', 'https://www.indiehackers.com', 'community', 'three-years-to-reduce', 'lessons-first text post; product link after the useful account', 30),
  D('2026-10-09', 'W11 snapshot — month 1', 'https://ivue.dev', 'prep', 'n/a', 'stars/downloads/signups per placement; decide which stories WON rooms (thresholds in plan)', 30),

  /* ---------- WEEK 5 (10/12–10/18) ---------- */
  D('2026-10-12', 'r/javascript', 'https://reddit.com/r/javascript', 'reddit', 'reactivity-is-an-allocator', 'language angle, as planned', 30),
  D('2026-10-13', 'r/typescript — second entry', 'https://reddit.com/r/typescript', 'reddit', 'the-test-is-a-subclass', 'TS techniques #2, ~3 weeks after ban-private', 30),
  D('2026-10-13', 'Bluesky starter packs — asks', 'https://blueskystarterpack.com/front-end', 'community', 'n/a', 'account has 5 weeks of posts now — ask pack owners for inclusion', 30),
  D('2026-10-14', 'SegmentFault — ZH', 'https://segmentfault.com', 'intl', 'MOD: measured-not-promised (ZH)', 'original Chinese, non-advertorial; benchmark method + source links', 45, 1, 'zh'),
  D('2026-10-14', 'VC.ru — RU', 'https://vc.ru', 'intl', 'MOD: the-options-api-everyone-wanted (RU)', 'personal-experience framing, self-publish', 30, 1, 'ru', 'tasks/press-drafts/luna/'),
  D('2026-10-15', 'Frontend Weekend (RU podcast)', 'https://russiancast.club/frontendweekend/', 'podcast', 'agents-built-an-editor', 'RU guest pitch: career/origin story show — lead with the discovery arc', 20, 1, 'ru'),
  D('2026-10-15', 'RU Telegram channels (3)', 'https://t.me/frontend_1', 'intl', 'MOD: introducing-ivue (RU)', 'frontend_1, frontendnoteschannel_ru, senior_front — DM named contacts with the RU piece', 30, 1, 'ru', 'tasks/press-drafts/luna/'),
  D('2026-10-16', 'Codrops — Collective', 'https://tympanus.net/codrops/submit/', 'newsletter-pitch', 'a-million-rows-twelve-divs', 'the in-page 1M-row demo + polished dark site is the asset', 15),
  D('2026-10-17', 'r/SideProject', 'https://reddit.com/r/SideProject', 'reddit', 'the-whole-story-in-small-words', 'self-promo allowed; show the actual product (in-browser benchmarks clear it)', 20),

  /* ---------- WEEK 6 (10/19–10/25) ---------- */
  D('2026-10-19', 'r/programming', 'https://reddit.com/r/programming', 'reddit', 'win-by-reduction', 'essay-first, zero launch smell', 30),
  D('2026-10-20', 'Tproger — RU case', 'https://tproger.ru', 'intl', 'MOD: agents-built-an-editor (RU)', '94k-line Invar case, editors can promote selected work', 45, 1, 'ru', 'tasks/press-drafts/luna/'),
  D('2026-10-21', 'OSCHINA — ZH email', 'mailto:oscbianji@oschina.cn', 'intl', 'MOD: agents-built-an-editor (ZH)', 'deep case with background/evolution/measured result', 45, 1, 'zh'),
  D('2026-10-22', 'r/vuejs — AMA', 'https://reddit.com/r/vuejs', 'reddit', 'n/a', 'the coordinated AMA; objection bank is the prep; cross-post archive copy to r/ivue', 180, 1, 'en', 'tasks/press-drafts/juno/objection-bank.md'),
  D('2026-10-23', 'Velog (KR) — EN post', 'https://velog.io', 'intl', 'MOD: a-million-rows-twelve-divs + KR abstract', 'English post, Korean title/summary; translate only on demand', 30),
  D('2026-10-23', 'Product Hunt — go/no-go', 'https://www.producthunt.com', 'directory', 'introducing-ivue', 'decision point per plan: go only if momentum earns a second wave (week 5+)', 15),

  /* ---------- NOVEMBER (weeks 7–10) ---------- */
  D('2026-11-02', 'CFP hub — monthly check', 'https://events.vuejs.org/call-for-proposals/', 'conference', 'n/a', 'VueConf US CFP historically opened late Oct — watch for it this check', 15),
  D('2026-11-03', 'Cooperpress — Frontend Focus', 'mailto:editor@cooperpress.com', 'newsletter-pitch', 'a-million-rows-twelve-divs', 'second family pitch, ~6 weeks after the first (one-editor budget)', 15),
  D('2026-11-04', 'r/typescript — third entry', 'https://reddit.com/r/typescript', 'reddit', 'NEW: definePropTypes literal trick', 'generic inference vs bare-const widening — techniques post #3', 45),
  D('2026-11-05', 'InfoQ China — ZH pitch', 'mailto:editors@cn.infoq.com', 'intl', 'MOD: what-native-signals-should-steal (ZH)', '投稿-marked deep piece, 3000–4000 chars', 45, 1, 'zh'),
  D('2026-11-05', 'DOU (UA)', 'https://dou.ua/add-post/', 'intl', 'MOD: agents-built-an-editor + UA summary', 'direct form, free, articles never deleted', 30),
  D('2026-11-06', 'TabNews (BR)', 'https://tabnews.com.br', 'intl', 'MOD: a-million-rows-twelve-divs + PT summary', 'short PT summary + EN link, value-first', 20),
  D('2026-11-06', 'Viblo (VN)', 'https://viblo.asia', 'intl', 'MOD: introducing-ivue + VN abstract', 'EN post with Vietnamese abstract, JS/Vue tags', 20),
  D('2026-11-09', 'Software Engineering Radio', 'https://se-radio.net/about/content-guidelines/', 'podcast', 'agents-built-an-editor', 'topic proposal: 200-word abstract, construction-vs-discipline case', 30),
  D('2026-11-10', 'Whiskey Web and Whatnot', 'https://whiskey.fm/contact', 'podcast', 'three-years-to-reduce', 'personality show: the discovery-arc story, not benchmarks', 15),
  D('2026-11-11', 'Frontend at Scale', 'https://frontendatscale.com', 'newsletter-pitch', 'bulletproof-class-modules', 'architecture-essay newsletter — module/seam posts are its genre', 15),
  D('2026-11-12', 'InfoQ (EN) — pitch', 'https://www.infoq.com/write-for-infoq/', 'article-platform', 'MOD: agents-built-an-editor', 'production architecture case study with the 94k-line census; long lead', 45),
  D('2026-11-13', 'X — milestone thread (data-gated)', 'https://x.com', 'x', 'NEW: "N stars — what worked"', 'fire only when a real milestone lands; W11 snapshots make it a 20-min post', 30),
  D('2026-11-16', 'Vue newsletters — round 2', 'https://vuejsfeed.com/submit', 'newsletter-pitch', 'derivations-are-free', 'second bites: Vue.js Feed article entry + VueDigest with a NEW article', 15),
  D('2026-11-17', 'Hatena Blog — JA adaptation', 'https://blog.hatena.ne.jp', 'intl', 'MOD: introducing-ivue (JA)', '800–1200 word localized post linking the EN receipt', 45, 1, 'ja'),
  D('2026-11-18', 'r/frontend', 'https://reddit.com/r/frontend', 'reddit', 'a-million-rows-twelve-divs', 'same article as r/webdev, different room, 9 weeks later', 20),
  D('2026-11-19', 'freeCodeCamp — application', 'https://www.freecodecamp.org/news/how-to-write-for-freecodecamp/', 'article-platform', 'MOD: a-million-rows-twelve-divs tutorial', 'author application + standalone build tutorial (long lead)', 60),
  D('2026-11-20', 'W11 snapshot — month 2', 'https://ivue.dev', 'prep', 'n/a', 'second per-placement snapshot; re-rank winning stories; adjust December', 30),

  /* ---------- DECEMBER — WAVE 2: the agents story ---------- */
  D('2026-12-01', 'Wave-2 gate check', 'https://ivue.dev', 'prep', 'n/a', 'Vue wave established? (thresholds met + malleable doc ready) — then fire the agents story below', 30, 2),
  D('2026-12-02', 'X — agents-story thread', 'https://x.com', 'x', 'agents-built-an-editor', 'the withheld story, now with 3 months of receipts; Invar-driving-Invar clip', 45, 2, 'en', 'tasks/press-drafts/vesta/'),
  D('2026-12-03', 'r/ChatGPTCoding — self-promo thread', 'https://reddit.com/r/ChatGPTCoding', 'reddit', 'the-zeros-didnt-move', 'reply to the CURRENT pinned thread; one project, once', 20, 2),
  D('2026-12-03', 'r/AI_Agents — weekly display', 'https://reddit.com/r/AI_Agents', 'reddit', 'patterns-the-author-never-wrote', 'current week thread, public proof + what is reusable', 20, 2),
  D('2026-12-04', 'MLOps Slack (be-shameless)', 'https://mlops.notion.site/MLOps-Community-Rules-0c69be943d0f4efa9e7863414fefc250', 'community', 'the-zeros-didnt-move', 'promotion explicitly allowed there; disclose affiliation; gates+measurement framing', 20, 2),
  D('2026-12-04', 'DataTalks.Club (shameless-promotion)', 'https://datatalks.club/docs/general/slack/', 'community', 'MOD: agents-built-an-editor', 'their template, one post; agent workflow leads', 20, 2),
  D('2026-12-07', 'HN — agents story', 'https://news.ycombinator.com/submit', 'hn', 'agents-built-an-editor', 'the strongest wave-2 artifact as a regular submission; runbook discipline again', 90, 2),
  D('2026-12-08', 'OpenAI Developer Showcase', 'https://openai.com/form/showcase-submission/', 'community', 'NEW: Invar demo + build ledger', 'submit ONLY if the build truthfully used qualifying OpenAI surfaces (the form asks)', 45, 2),
  D('2026-12-09', 'AI Tinkerers Toronto — demo', 'https://toronto.aitinkerers.org/events', 'conference', 'NEW: 6-min live Invar demo', 'working code, one failed gate, the green rerun; local + timezone-friendly', 60, 2),
  D('2026-12-10', 'TokenMade — guest apply', 'https://tokenmade.ai/demo', 'podcast', 'NEW: screen-share the agent workflow', 'concrete workflow show; Invar is the demo, ivue the substrate', 30, 2),
  D('2026-12-10', 'Inside The Stack', 'https://insidethestack.dev/guests/', 'podcast', 'MOD: agents-built-an-editor', '94k-line update + one gate failure story', 20, 2),
  D('2026-12-11', 'The New Stack — contributed post', 'https://thenewstack.io/contributions/', 'article-platform', 'reactive-framework-for-the-ai-era', 'the agents-era architecture argument as a contributed post', 60, 2),
  D('2026-12-14', 'devtools.fm — Invar angle', 'https://www.devtools.fm/guests', 'podcast', 'introducing-invar', 'second application, now the tool story (if first pitch unanswered)', 20, 2),
  D('2026-12-15', 'Zhihu column — ZH', 'https://zhuanlan.zhihu.com/write', 'intl', 'MOD: what-native-signals-should-steal (ZH)', 'lazy existence/derivation/release explainer; product subordinate', 45, 2, 'zh'),
  D('2026-12-16', 'Bilibili — ZH clip', 'https://member.bilibili.com/platform/upload/video/frame', 'intl', 'MOD: benchmark clip + ZH subtitles', '60–120s silent benchmark run with Chinese captions', 60, 2, 'zh'),
  D('2026-12-17', 'Modern Web podcast', 'https://modernweb.podbean.com', 'podcast', 'reactive-framework-for-the-ai-era', 'framework-ecumenical, Vue history — second-wave material', 15, 2),
  D('2026-12-18', 'W11 snapshot — month 3', 'https://ivue.dev', 'prep', 'n/a', 'wave-2 first-week readout; year-end totals for the January posts', 30, 2),

  /* ---------- JANUARY 2027 ---------- */
  D('2027-01-04', 'CFP hub — monthly check', 'https://events.vuejs.org/call-for-proposals/', 'conference', 'n/a', 'JSNation reopens ~this window (2026 deadline was Mar 2); lightning talk = 1.1 kB + live benchmark', 15),
  D('2027-01-05', 'X — year-in-review thread', 'https://x.com', 'x', 'NEW: launch-quarter receipts', 'the W11 numbers as a story: placements, stars, subscribers — counts, never adjectives', 30),
  D('2027-01-06', 'Habr — RU second article', 'https://habr.com', 'intl', 'MOD: winning story (RU)', 'second RU piece = whatever story won rooms in Q4 (W11 decides)', 60, 1, 'ru'),
  D('2027-01-07', 'Qiita — JA cross-post', 'https://qiita.com', 'intl', 'MOD: Zenn piece (JA)', 'cross-post the Zenn piece if it landed (bigger legacy reach)', 20, 1, 'ja'),
  D('2027-01-12', 'juejin — ZH #2', 'https://juejin.cn', 'intl', 'MOD: winning story (ZH)', 'second ZH piece, winning story', 45, 1, 'zh'),
  D('2027-01-13', 'lobste.rs — second entry', 'https://lobste.rs', 'community', 'derivations-are-free', '4 months after the first; article-first as always', 15),
  D('2027-01-14', 'Smashing Magazine — pitch', 'https://www.smashingmagazine.com/write-for-us/', 'article-platform', 'MOD: virtual-scrolling tutorial', 'commissioned-article outline pitch (multi-month lead — start now)', 45),
  D('2027-01-19', 'X — re-promotion pass #3', 'https://x.com', 'x', 'Q4 articles', 'unused hooks from the tank; new posts have their own hooks by now', 30),
  D('2027-01-20', 'Vue.js Nation — speaker ask', 'https://vuejsnation.com', 'conference', 'measured-not-promised', 'online conf, recording = press-kit asset; ask for the next speaker call', 20),
  D('2027-01-26', 'Hacker Newsletter — check', 'https://hackernewsletter.com', 'newsletter-pitch', 'n/a', 'no submission exists — verify whether any HN run got harvested; if not, nothing to do', 5),

  /* ---------- FEBRUARY 2027 ---------- */
  D('2027-02-01', 'CFP hub — monthly check', 'https://events.vuejs.org/call-for-proposals/', 'conference', 'n/a', 'Vue Amsterdam 2027 CFP window expected; the 20M-cell live demo is the talk', 15),
  D('2027-02-02', 'Cooperpress — Node Weekly', 'mailto:editor@cooperpress.com', 'newsletter-pitch', 'the-thinnest-possible-layer', 'third family pitch: the backend angle (newsletter Worker runs the same classes)', 15),
  D('2027-02-03', 'r/vuejs — third entry', 'https://reddit.com/r/vuejs', 'reddit', 'NEW: 6-month receipts post', 'what shipped since launch: counts + links', 30),
  D('2027-02-09', 'PragVue / MadVue — CFP season', 'https://pragvue.com', 'conference', 'ban-private', 'smaller stages, higher acceptance; email hola@madvue.es too', 30),
  D('2027-02-10', 'Portugal.Vue + Vue Spain — asks', 'https://www.meetup.com/portugal-vue/', 'conference', 'introducing-ivue', 'remote-talk offers, EN artifact + local abstract', 20),
  D('2027-02-16', 'Tildes ~comp', 'https://tildes.net', 'community', 'win-by-reduction', 'essay-first, invite-gated; only if an invite materialized', 15),
  D('2027-02-17', 'X — image-card essay', 'https://x.com', 'x', 'discovered-not-invented', 'the 4-card invariant-thinking distillation (format B)', 20, 1, 'en', 'tasks/press-drafts/terra/'),
  D('2027-02-24', 'W11 snapshot — month 5 + replan', 'https://ivue.dev', 'prep', 'n/a', 'full-quarter readout; draft the NEXT 6-month calendar from what won', 60),
];
