// lazy-source — a Vite plugin that turns a source file into its OWN chunk
// of highlighted HTML, imported on demand.
//
// VitePress renders every `<<<` snippet into the page's chunk at build
// time: nine source tabs plus seven specs and a contract put 256 KB of
// gzipped HTML on the scroller example page, all of it downloaded and
// parsed before the reader saw a row. Here a page imports one map of
// loaders, `virtual:lazy-source-map`, and the LazyCodeGroup component
// imports a file's chunk only when its tab opens — the page carries the
// demo and the prose, the source costs nothing until it is read.
//
// Two virtual ids:
//   - `virtual:lazy-source-map` — `{ '<repo-relative path>': () => import(…) }`
//     for every file under the roots below, enumerated at build time.
//   - `lazy-source:<repo-relative path>` — the file, highlighted by shiki
//     into the exact markup VitePress's own code blocks use (dual theme,
//     line numbers, the copy button the theme's delegated handler serves),
//     exported as `{ html, lines, lang }`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeToHtml } from 'shiki';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ROOTS = ['examples/playground/src', 'docs_v2/.vitepress/theme/components/examples'];
const EXTENSIONS = new Set(['.ts', '.vue', '.md', '.mjs', '.cjs', '.js', '.css', '.json']);
const THEMES = { light: 'github-light', dark: 'one-dark-pro' };
const MAP_ID = 'virtual:lazy-source-map';
const SOURCE_PREFIX = 'lazy-source:';
// The virtual id keeps the file's path for the chunk name but must not END
// in the file's extension: Vite's CSS, Vue and markdown plugins claim ids
// by extension, and would parse highlighted HTML as a stylesheet.
const SOURCE_SUFFIX = '.highlight';

const languageOf = (file) => {
  const extension = path.extname(file);
  if (extension === '.mjs' || extension === '.cjs') return 'js';
  if (extension === '.md') return 'md';
  return extension.slice(1);
};

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.relative(REPO_ROOT, full).split(path.sep).join('/'));
    }
  }
  return files;
}

/** The block markup VitePress emits for a fenced code block, line numbers on. */
async function highlight(relativePath) {
  const code = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  const lang = languageOf(relativePath);
  const raw = await codeToHtml(code, { lang, themes: THEMES, defaultColor: false });
  // shiki's <pre> carries the theme backgrounds inline; VitePress strips
  // the style and classes the pre `vp-code` so its CSS paints it.
  const pre = raw.replace(/<pre class="shiki[^"]*"[^>]*>/, `<pre class="shiki shiki-themes ${THEMES.light} ${THEMES.dark} vp-code" tabindex="0">`);
  const lines = code.split('\n').length - (code.endsWith('\n') ? 1 : 0);
  const numbers = Array.from({ length: lines }, (_, index) => `<span class="line-number">${index + 1}</span><br>`).join('');
  const html =
    `<div class="language-${lang} vp-adaptive-theme line-numbers-mode active">` +
    `<button title="Copy Code" class="copy"></button><span class="lang">${lang}</span>` +
    pre +
    `<div class="line-numbers-wrapper" aria-hidden="true">${numbers}</div></div>`;
  return { html, lines, lang };
}

export function lazySourcePlugin() {
  let files = null;
  return {
    name: 'ivue-lazy-source',
    resolveId(id) {
      if (id === MAP_ID) return '\0' + MAP_ID;
      if (id.startsWith(SOURCE_PREFIX)) return '\0' + id;
      return null;
    },
    async load(id) {
      if (id === '\0' + MAP_ID) {
        files ??= ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root)));
        const entries = files.map((file) => `  ${JSON.stringify(file)}: () => import(${JSON.stringify(SOURCE_PREFIX + file + SOURCE_SUFFIX)})`);
        return `export const loaders = {\n${entries.join(',\n')}\n};\n`;
      }
      if (id.startsWith('\0' + SOURCE_PREFIX)) {
        const relativePath = id.slice(1 + SOURCE_PREFIX.length, -SOURCE_SUFFIX.length);
        const source = await highlight(relativePath);
        this.addWatchFile(path.join(REPO_ROOT, relativePath));
        return `export default ${JSON.stringify(source)};\n`;
      }
      return null;
    }
  };
}
