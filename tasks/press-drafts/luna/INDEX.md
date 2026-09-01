# Wave 2 drafts — luna

| file | venue(s) | purpose | lang | length |
| --- | --- | --- | --- | --- |
| `01-ru-options-api-habr.md` | Habr | full article adaptation | ru | 806 body words, 5,810 characters |
| `02-ru-telegram-warm.md` | t.me/vuejs_ru leader | warm personal message | ru | 102 body words |
| `03-ru-tproger-vcru.md` | Tproger; VC.ru | short announcement | ru | 419 body words, 3,203 characters |
| `04-zh-juejin.md` | juejin.cn | tightened article adaptation | zh | 922 non-code body characters, 1,356 total characters |
| `05-zh-readme-section.md` | ivue README | one-screen project section | zh | 132 body whitespace-delimited tokens, 1,015 characters |
| `06-ja-zenn.md` | Zenn | technical article adaptation | ja | 1,674 non-code body characters, 2,186 total characters |
| `07-en-telegram-mirror.md` | t.me/vuejs_ru leader; comparison mirror | message mirror | en | 115 body words |

## Checkpoint report

| # | checkpoint | observed evidence |
| --- | --- | --- |
| 1 | CP1 count | `find tmp/press-drafts/luna -maxdepth 1 -type f -name '[0-9][0-9]-*.md'` returned 7 files: `01-ru-options-api-habr.md`, `02-ru-telegram-warm.md`, `03-ru-tproger-vcru.md`, `04-zh-juejin.md`, `05-zh-readme-section.md`, `06-ja-zenn.md`, `07-en-telegram-mirror.md`. |
| 2 | CP2 headers | `rg -l '^status: draft-for-review$' tmp/press-drafts/luna/[0-9][0-9]-*.md | wc -l` returned `7`; each of the 7 artifact files returned exactly one status line. |
| 3 | CP3 titles | `Анатомия вернулась: компонент снова можно прочитать` passes stranger, verb and receipt tests: it promises readable component structure and the article explains the measured class shape. `Обычный класс снова держит реактивное состояние — в 1,1 kB` passes all three: the reader gets reactive state in a plain class and the body supplies the 1.1 kB and allocation receipts. `1.1 kB，让响应式类真正可用` passes all three: the reader gets usable reactive classes and the body supplies code and measurements. `クラスのまま、Vueのリアクティブ状態を持てる` passes all three: the reader keeps class form while gaining Vue state and the body shows the exact mechanism and limits. The README and two messages are not article-shaped. |
| 4 | CP4 voice | Command run: `rg -in '\b(seamless|robust|elegant|powerful|blazing|world-class)\b' tmp/press-drafts/luna/[0-9][0-9]-*.md`; observed stdout: empty. |
| 5 | CP5 self-containment | Identity lines are present at `01-ru-options-api-habr.md:13`, `02-ru-telegram-warm.md:11`, `03-ru-tproger-vcru.md:11`, `04-zh-juejin.md:13`, `05-zh-readme-section.md:11`, `06-ja-zenn.md:13`, and `07-en-telegram-mirror.md:11`. Each artifact names ivue as a 1.1 kB class layer over Vue reactivity before relying on any article-specific detail; the only outbound article links are optional source or depth links. |

DONE
