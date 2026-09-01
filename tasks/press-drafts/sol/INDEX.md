# Outreach email pack — sol

| file | venue(s) | purpose | lang | length |
| --- | --- | --- | --- | ---: |
| [01-javascript-weekly.md](./01-javascript-weekly.md) | JavaScript Weekly | pitch-email | en | 132 words |
| [02-bytes.md](./02-bytes.md) | Bytes | pitch-email | en | 122 words |
| [03-frontend-focus.md](./03-frontend-focus.md) | Frontend Focus | pitch-email | en | 119 words |
| [04-tldr-web-dev.md](./04-tldr-web-dev.md) | TLDR Dev, formerly TLDR Web Dev | pitch-email | en | 95 words |
| [05-learnvue.md](./05-learnvue.md) | LearnVue | pitch-email | en | 134 words |
| [06-dejavue-alexander-lichter.md](./06-dejavue-alexander-lichter.md) | Alexander Lichter, DejaVue | pitch-email | en | 129 words |
| [07-vue-mastery.md](./07-vue-mastery.md) | Vue Mastery | pitch-email | en | 131 words |
| [08-vue-school.md](./08-vue-school.md) | Vue School | pitch-email | en | 124 words |
| [09-michael-thiessen.md](./09-michael-thiessen.md) | Michael Thiessen newsletter | pitch-email | en | 126 words |
| [10-views-on-vue.md](./10-views-on-vue.md) | Views on Vue | pitch-email | en | 134 words |
| [11-js-party.md](./11-js-party.md) | JS Party, Changelog episode request | pitch-email | en | 128 words |
| [12-vuedigest.md](./12-vuedigest.md) | VueDigest | pitch-email | en | 110 words |
| [13-devtools-fm.md](./13-devtools-fm.md) | devtools.fm | pitch-email | en | 126 words |
| [14-tokenmade.md](./14-tokenmade.md) | TokenMade YouTube podcast | pitch-email | en | 136 words |

## Checkpoint report

| checkpoint | status | observed evidence |
| --- | --- | --- |
| 1. CP1 count | PASS | `find tmp/press-drafts/sol -maxdepth 1 -type f -name '*.md' ! -name 'INDEX.md' \| wc -l` returned `14`. Files read back: `01-javascript-weekly.md`, `02-bytes.md`, `03-frontend-focus.md`, `04-tldr-web-dev.md`, `05-learnvue.md`, `06-dejavue-alexander-lichter.md`, `07-vue-mastery.md`, `08-vue-school.md`, `09-michael-thiessen.md`, `10-views-on-vue.md`, `11-js-party.md`, `12-vuedigest.md`, `13-devtools-fm.md`, `14-tokenmade.md`. |
| 2. CP2 headers | PASS | Artifact count was `14`; `rg -l '^status: draft-for-review$' tmp/press-drafts/sol --glob '*.md' --glob '!INDEX.md' \| wc -l` returned `14`. Per-key file counts read back were `venue=14`, `purpose=14`, `lang=14`, `source=14`, `status=14`; every file also contained exactly `2` frontmatter delimiter lines. |
| 3. CP3 titles | PASS | `rg -l '^purpose: pitch-email$' tmp/press-drafts/sol --glob '*.md' --glob '!INDEX.md' \| wc -l` returned `14`; article-shaped artifact count is `0`. Therefore there are no article titles requiring stranger/verb/receipt verdicts. The two form labels are routing copy inside pitch emails, not article artifacts. |
| 4. CP4 voice | PASS | Command: `rg -ni '\b(seamless\|robust\|elegant\|powerful\|blazing\|world-class)\b' tmp/press-drafts/sol --glob '*.md' --glob '!INDEX.md'`. Output between the observed markers `banned_output_begin` and `banned_output_end` was empty. |
| 5. CP5 self-containment | PASS | Exact ivue identity line locations read back by `rg -n`: `01-javascript-weekly.md:15`; `02-bytes.md:15`; `03-frontend-focus.md:15`; `04-tldr-web-dev.md:15`; `05-learnvue.md:15`; `06-dejavue-alexander-lichter.md:15`; `07-vue-mastery.md:15`; `08-vue-school.md:15`; `09-michael-thiessen.md:15`; `10-views-on-vue.md:13`; `11-js-party.md:13`; `12-vuedigest.md:15`; `13-devtools-fm.md:13`; `14-tokenmade.md:13`. Each line begins `ivue is a 1.1 kB class layer over Vue's reactivity.` |

DONE
