# Wave 2 drafts — terra

| file | venue(s) | purpose | lang | length |
| --- | --- | --- | --- | --- |
| devto-introducing-ivue.md | dev.to | canonical-ready cross-post | en | 433 words |
| reddit-typescript-ban-private.md | r/typescript | text post | en | 303 words |
| reddit-webdev-million-rows.md | r/webdev | text post | en | 258 words |
| lobsters-bulletproof-class-modules.md | lobste.rs | submission title + first comment | en | 160 words |
| x-image-cards-win-by-reduction.md | X | four image-card texts | en | 209 words; cards 50/37/29/46 words |
| x-long-post-introducing-ivue.md | X | long post | en | 1,932 chars |
| awesome-list-pr-oneliners.md | awesome-vue; awesome-reactivity; awesome-signals | PR one-liners | en | 109 words; 3 lines |
| gallery-submission-blurbs.md | Godly; Dark Mode Design; siteInspire | gallery blurbs | en | 146 words; blurbs 41/43/37 words |

## Checkpoint report

| # | checkpoint | observed evidence |
| --- | --- | --- |
| 1 | CP1 count | 8 artifact files: `devto-introducing-ivue.md`, `reddit-typescript-ban-private.md`, `reddit-webdev-million-rows.md`, `lobsters-bulletproof-class-modules.md`, `x-image-cards-win-by-reduction.md`, `x-long-post-introducing-ivue.md`, `awesome-list-pr-oneliners.md`, `gallery-submission-blurbs.md`. |
| 2 | CP2 headers | `rg -l '^status: draft-for-review$' tmp/press-drafts/terra -g '*.md' | rg -v '/INDEX.md$' | wc -l` returned `8`; artifact-file count returned `8`; each artifact returned `5` header-key matches for `venue`, `purpose`, `lang`, `source`, and `status`. |
| 3 | CP3 titles | `Put your Vue state back in objects`: stranger/verb/receipt pass — object ownership, “put back,” and 1.1 kB/live measurements appear. `Let subclasses change code without copying the class`: pass — extension win, “change,” and `protected` plus `override` code deliver it. `Render a million rows without making a million-row DOM`: pass — clear win, “render,” and 12-div/O(window) method appears. `Give every class value one home`: pass — module-placement win, “give,” and nine homes plus 55–253× receipt appear. `Make fewer problems exist`: pass — reduction win, “make,” and four structural boundaries appear. `Your Vue objects can outlive the component that first used them`: pass — lifetime win, “outlive,” and class/ref implementation plus measurements appear. |
| 4 | CP4 voice | `rg -ni '\\b(s[e]amless|r[o]bust|e[l]egant|p[o]werful|b[l]azing|world[-]class)\\b' tmp/press-drafts/terra -g '*.md'` returned no lines. |
| 5 | CP5 self-containment | Identity lines read back: `devto-introducing-ivue.md:13`; `reddit-typescript-ban-private.md:13`; `reddit-webdev-million-rows.md:13`; `lobsters-bulletproof-class-modules.md:15`; `x-image-cards-win-by-reduction.md:11`; `x-long-post-introducing-ivue.md:11`; `awesome-list-pr-oneliners.md:14,22,30`; `gallery-submission-blurbs.md:11,15,19`. Each says ivue is a 1.1 kB class layer over Vue's reactivity. |

DONE
