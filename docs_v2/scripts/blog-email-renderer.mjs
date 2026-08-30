// The deterministic blog-post → newsletter-email conversion.
//
// Everything the subscriber sees is rendered HERE, at build time, from
// committed inputs: post markdown, blog-dates.json, and the committed
// embed screenshots (public/blog/embeds — see blog-embed-shots.mjs).
// The Worker only substitutes the per-recipient {{UNSUBSCRIBE_URL}}
// placeholder. Same input → byte-identical email.
//
// The email is DARK by design — it matches the site, the banners, and
// the one-dark-pro code blocks, and a designed-dark email is the one
// form email clients' auto-dark modes leave alone (they invert light
// emails, never dark ones). The color-scheme meta tags declare it.
//
// Preview any post's email as a file:
//   node docs_v2/scripts/blog-email-renderer.mjs <slug> > /tmp/email.html
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeToHtml } from 'shiki';
import { isPrivatePost } from './channel-posts.mjs';

const SITE = 'https://ivue.dev';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const embedsDirectory = resolve(scriptDirectory, '../public/blog/embeds');

// ---- the dark palette — the SITE's dark theme (custom.css tokens) ----
// --vp-c-bg #0b1020 / --vp-c-bg-alt #0e1424 / --vp-c-bg-soft #141a2e

const PAGE_BG = '#0b1020'; // page behind the card = --vp-c-bg
const CARD_BG = '#0e1424'; // card surface = --vp-c-bg-alt
const PANEL_BG = '#141a2e'; // quote / inset surface = --vp-c-bg-soft
const EDGE = '#28324e'; // card borders
const EDGE_SOFT = '#1e2740'; // row hairlines
const HEADING = '#e8edf7';
const TEXT = '#b6c0d2';
const MUTED = '#8892a6';
const FAINT = '#7c8698';
const LINK = '#8f9cfa'; // indigo, AA on card bg
const BUTTON_BG = '#5457e0';
const CODE_BG = '#1c2440'; // inline code chip
const CODE_TEXT = '#b4bcf8';

// ---- inline markdown → inline-styled HTML ---------------------------

function inlineHtml(markdown) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images render only as standalone blocks
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/`([^`]+)`/g, `<code style="background:${CODE_BG};color:${CODE_TEXT};padding:1px 5px;border-radius:4px;font:12.5px ui-monospace,Menlo,monospace">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${HEADING}">$1</strong>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, `<a href="${SITE}$2" style="color:${LINK}">$1</a>`)
    .replace(/\[([^\]]+)\]\((https?:[^)]*)\)/g, `<a href="$2" style="color:${LINK}">$1</a>`);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ---- embed placeholder ----------------------------------------------
// Interactive components can't run in email: the committed screenshot
// renders with a "view the live example" caption, linking to the post.

function embedPlaceholder(slug, postUrl, embedIndex) {
  const shotName = `${slug}-embed-${embedIndex}.png`;
  const caption =
    '<div style="padding:9px 16px;background:#151a30;color:#8fd3c7;border-radius:0 0 8px 8px;font-size:12.5px;font-weight:600">&#9654;&nbsp; Click to view the live example</div>';
  if (existsSync(resolve(embedsDirectory, shotName))) {
    return (
      `<a href="${postUrl}" style="text-decoration:none;display:block;margin:0 0 20px">` +
      `<img src="${SITE}/blog/embeds/${shotName}" alt="Interactive example — view it live on the post" width="496" style="display:block;width:100%;height:auto;border:1px solid #1e2440;border-radius:8px 8px 0 0" />` +
      caption +
      '</a>'
    );
  }
  return (
    `<a href="${postUrl}" style="text-decoration:none;display:block;margin:0 0 20px">` +
    `<div style="padding:18px;background:#0d1226;color:#e6edf3;border-radius:8px 8px 0 0;font-size:14px">This post has an interactive example.</div>` +
    caption +
    '</a>'
  );
}

// ---- code highlighting ----------------------------------------------
// Shiki emits spans with INLINE color styles — the one form of syntax
// highlighting email clients render. Same theme as the site's dark code.

async function highlightedPre(code, lang, hasLabel) {
  const layout = `margin:0 0 20px;padding:14px 16px;border-radius:${hasLabel ? '0 0 8px 8px' : '8px'};font:12.5px/1.6 ui-monospace,Menlo,monospace;overflow-x:auto;`;
  try {
    const html = await codeToHtml(code, { lang, theme: 'one-dark-pro' });
    return html.replace(/<pre[^>]*?style="/, `<pre style="${layout}`);
  } catch {
    const escaped = code
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<pre style="${layout}background:#0d1226;color:#e6edf3"><code>${escaped}</code></pre>`;
  }
}

// ---- block-level markdown → inline-styled HTML ----------------------

export async function bodyHtml(source, slug, postUrl) {
  const body = source
    .replace(/^---[\s\S]*?---/, '')
    // Vue SFC blocks in the markdown (embed component imports) are
    // site-only wiring — without this they leak as body text
    .replace(/<script setup>[\s\S]*?<\/script>/g, '')
    .replace(/<BlogPostDate \/>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^:::.*$/gm, '')
    .replace(/^# .*$/m, '');
  const lines = body.split('\n');
  const blocks = [];
  let index = 0;
  let embedCount = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    // standalone image lines: the banner is skipped (it already heads
    // the email); every other image — article art, inline figures —
    // ships as a full-width block, absolute-URL'd to the site
    const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)/);
    if (imageMatch) {
      const [, altText, imagePath] = imageMatch;
      index++;
      if (imagePath === `/blog/${slug}.png`) continue;
      const imageUrl = imagePath.startsWith('http')
        ? imagePath
        : `${SITE}${imagePath}`;
      blocks.push(
        `<img src="${imageUrl}" alt="${escapeHtml(altText)}" width="496" style="display:block;width:100%;height:auto;border:1px solid ${EDGE_SOFT};border-radius:8px;margin:0 0 20px" />`,
      );
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.match(/^```(\w+)/)?.[1] ?? 'txt';
      const label = line.match(/\[([^\]]+)\]/)?.[1] ?? '';
      const codeLines = [];
      index++;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      index++; // closing fence
      blocks.push(
        (label
          ? `<div style="margin:0 0 0;padding:7px 16px;background:#151a30;color:#8fa8cf;border-radius:8px 8px 0 0;font:11.5px ui-monospace,Menlo,monospace">${label}</div>`
          : '') +
        (await highlightedPre(codeLines.join('\n'), lang, Boolean(label))),
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (index < lines.length && lines[index].startsWith('|')) {
        rows.push(lines[index]);
        index++;
      }
      const parseRow = (row) =>
        row.replace(/^\||\|$/g, '').split('|').map((cell) => inlineHtml(cell.trim()));
      const header = parseRow(rows[0]);
      const bodyRows = rows.slice(2).map(parseRow); // rows[1] is the ---|--- divider
      const th = header
        .map((cell) => `<th style="padding:8px 12px;border-bottom:2px solid ${EDGE};text-align:left;font-size:13px;color:${HEADING}">${cell}</th>`)
        .join('');
      const trs = bodyRows
        .map((cells) =>
          `<tr>${cells.map((cell) => `<td style="padding:8px 12px;border-bottom:1px solid ${EDGE_SOFT};font-size:13.5px;color:${TEXT}">${cell}</td>`).join('')}</tr>`)
        .join('');
      blocks.push(`<table style="margin:0 0 20px;border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }
    if (/^#{2,3} /.test(line)) {
      blocks.push(`<h2 style="margin:26px 0 12px;font-size:18px;line-height:1.35;color:${HEADING}">${inlineHtml(line.replace(/^#{2,3} /, ''))}</h2>`);
      index++;
      continue;
    }
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index++;
      }
      blocks.push(`<blockquote style="margin:0 0 20px;padding:10px 18px;border-left:3px solid ${LINK};background:${PANEL_BG};color:#c6cfdf;font-size:15px;line-height:1.6"><p style="margin:0">${inlineHtml(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*] /.test(lines[index])) {
        let item = lines[index].replace(/^[-*] /, '');
        index++;
        while (index < lines.length && /^  \S/.test(lines[index])) {
          item += ' ' + lines[index].trim();
          index++;
        }
        items.push(`<li style="margin:0 0 7px">${inlineHtml(item)}</li>`);
      }
      blocks.push(`<ul style="margin:0 0 20px;padding-left:22px;color:${TEXT};font-size:15px;line-height:1.6">${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) {
        let item = lines[index].replace(/^\d+\. /, '');
        index++;
        while (index < lines.length && /^  \S/.test(lines[index])) {
          item += ' ' + lines[index].trim();
          index++;
        }
        items.push(`<li style="margin:0 0 7px">${inlineHtml(item)}</li>`);
      }
      blocks.push(`<ol style="margin:0 0 20px;padding-left:22px;color:${TEXT};font-size:15px;line-height:1.6">${items.join('')}</ol>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) { index++; continue; }
    // component embeds become screenshot placeholders; ClientOnly wraps one
    if (/^<ClientOnly>/.test(line.trimStart())) {
      while (index < lines.length && !/<\/ClientOnly>/.test(lines[index])) index++;
      index++;
      embedCount++;
      blocks.push(embedPlaceholder(slug, postUrl, embedCount));
      continue;
    }
    if (/^<[A-Z]/.test(line.trimStart())) {
      index++;
      embedCount++;
      blocks.push(embedPlaceholder(slug, postUrl, embedCount));
      continue;
    }
    if (line.trimStart().startsWith('<')) { index++; continue; }
    // paragraph: gather continuation lines
    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3} |```|>|\||[-*] |\d+\. |:::|<)/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index++;
    }
    if (paragraphLines.length)
      blocks.push(`<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${TEXT}">${inlineHtml(paragraphLines.join(' '))}</p>`);
  }
  return blocks.join('');
}

// ---- related posts (the site's aside rows, in email form) -----------
// A compact row per curated slug: small banner thumb + grey title —
// the same recognition-over-spectacle form the site's sidebar uses.
// The 76×40 thumb is the banner's own 1200:630 ratio, so no cropping.

function relatedRow(post) {
  return (
    `<a href="${SITE}/blog/${post.slug}" style="text-decoration:none;display:block;margin:0 0 10px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%"><tr>` +
    `<td style="width:88px;vertical-align:middle"><img src="${SITE}/blog/${post.slug}.png" alt="" width="76" height="40" style="display:block;width:76px;height:40px;border-radius:6px;border:1px solid ${EDGE_SOFT}" /></td>` +
    `<td style="vertical-align:middle;font-size:13px;line-height:1.4;color:${TEXT}">${escapeHtml(post.title)}</td>` +
    `</tr></table></a>`
  );
}

function relatedSection(post, allPosts) {
  const related = (post.relatedPosts ?? [])
    .map((slug) => allPosts.find((candidate) => candidate.slug === slug))
    .filter(Boolean);
  if (!related.length) return '';
  return (
    `<p style="margin:26px 0 10px;font-size:11.5px;letter-spacing:.14em;color:${MUTED}">RELATED POSTS</p>` +
    related.map((relatedPost) => relatedRow(relatedPost)).join('')
  );
}

// ---- neighbor cards (the blog's older/newer nav, in email form) -----
// Newer and older ride ONE row, two half-width cards side by side.

function neighborCell(label, post) {
  if (!post) return '<td style="width:50%"></td>';
  return (
    `<td style="width:50%;vertical-align:top;padding:0 0 0 0">` +
    `<a href="${SITE}/blog/${post.slug}" style="text-decoration:none;display:block;border:1px solid ${EDGE};border-radius:10px;overflow:hidden;background:${CARD_BG}">` +
    `<img src="${SITE}/blog/${post.slug}.png" alt="" width="240" style="display:block;width:100%;height:auto;border:0" />` +
    `<div style="padding:9px 12px">` +
    `<div style="font-size:10px;letter-spacing:.12em;color:${MUTED};margin:0 0 3px">${label}</div>` +
    `<div style="font-size:12.5px;font-weight:600;line-height:1.35;color:${HEADING}">${escapeHtml(post.title)}</div>` +
    `</div></a></td>`
  );
}

function neighborRow(newer, older) {
  if (!newer && !older) return '';
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:7px 0;margin:0 -7px 14px"><tr>` +
    neighborCell('NEWER POST', newer) +
    neighborCell('OLDER POST', older) +
    `</tr></table>`
  );
}

function neighborCard(label, post) {
  if (!post) return '';
  return (
    `<a href="${SITE}/blog/${post.slug}" style="text-decoration:none;display:block;margin:0 0 14px;border:1px solid ${EDGE};border-radius:10px;overflow:hidden;background:${CARD_BG}">` +
    `<img src="${SITE}/blog/${post.slug}.png" alt="" width="496" style="display:block;width:100%;height:auto;border:0" />` +
    `<div style="padding:12px 16px">` +
    `<div style="font-size:10.5px;letter-spacing:.12em;color:${MUTED};margin:0 0 4px">${label}</div>` +
    `<div style="font-size:15px;font-weight:600;color:${HEADING}">${escapeHtml(post.title)}</div>` +
    `</div></a>`
  );
}

// ---- the author card (shared by post emails and the welcome email) --

function authorCard() {
  return (
    `<div style="margin:22px 0 0;padding:16px 18px;background:${CARD_BG};border:1px solid ${EDGE};border-radius:12px">` +
    `<table role="presentation" style="border-collapse:collapse"><tr>` +
    `<td style="vertical-align:top;padding:2px 14px 0 0">` +
    // the site's avatar ring, email-safe: static gradient (no
    // animation survives email clients), solid-teal fallback where
    // gradients are stripped
    `<div style="width:54px;height:54px;padding:4px;border-radius:50%;background-color:#2dd4bf;background-image:linear-gradient(120deg,#6366f1,#2dd4bf 55%,#34d399)">` +
    `<img src="${SITE}/avatars/evgeny-avatar.jpg" alt="Evgeny Kalashnikov" width="54" height="54" style="display:block;border-radius:50%;border:0" />` +
    `</div>` +
    `</td>` +
    `<td style="vertical-align:top">` +
    `<div style="font-size:10.5px;letter-spacing:.12em;color:${MUTED};margin:0 0 3px">AUTHOR</div>` +
    `<div style="font-size:15px;font-weight:600;color:${HEADING};margin:0 0 2px">Evgeny Kalashnikov</div>` +
    `<div style="font-size:12.5px;color:${MUTED};margin:0 0 4px">Lead Software Engineer @ Blackline, Adhoc Studio</div>` +
    `<div style="font-size:12.5px;line-height:1.55;color:${TEXT};margin:0 0 6px">Three years reducing Vue reactivity into <a href="${SITE}" style="color:${LINK};text-decoration:none">ivue</a>'s one kilobyte &mdash; then watching AI agents build <a href="${SITE}/examples/invar" style="color:${LINK};text-decoration:none">Invar</a>, a 94,000-line terminal IDE, on top of it.</div>` +
    `<div style="font-size:12.5px">` +
    `<a href="https://x.com/evgenykalash" style="color:${LINK};text-decoration:none">X</a>` +
    `&nbsp;&middot;&nbsp; <a href="https://github.com/infinite-system" style="color:${LINK};text-decoration:none">GitHub</a>` +
    `&nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/in/evgeny-kalashnikov/" style="color:${LINK};text-decoration:none">LinkedIn</a>` +
    `&nbsp;&middot;&nbsp; <a href="https://forms.gle/Z7L5N8hBYFoLQ8wA9" style="color:${LINK};text-decoration:none">Email</a>` +
    `</div></td></tr></table></div>`
  );
}

// ---- the light variant ----------------------------------------------
// Gmail's mobile apps ignore color-scheme declarations and recolor the
// body by luminance — a designed-dark email comes out as a mangled
// light one. So recipients on a Gmail UI (@gmail.com, or a domain whose
// MX is Google-hosted — the Worker decides) get a LIGHT-sourced email
// instead, which Gmail leaves alone in light mode and darkens cleanly
// in dark mode. The variant is derived from the rendered dark HTML by
// mapping the chrome tokens only: shiki code blocks and the banner
// imagery deliberately stay dark, exactly like the site's light theme.
// The map keys are the token constants above — change one there and
// its entry here must follow.

const LIGHT_TOKEN_MAP = [
  [PAGE_BG, '#f3f5fa'],
  [CARD_BG, '#ffffff'],
  [PANEL_BG, '#f0f3f9'],
  [EDGE, '#dbe1ee'],
  [EDGE_SOFT, '#e8ecf5'],
  [HEADING, '#1c2438'],
  [TEXT, '#3f4a5f'],
  [MUTED, '#67718a'],
  [FAINT, '#8a93a8'],
  [LINK, '#4649d0'],
  // BUTTON_BG stays — the indigo button works on both grounds
  [CODE_BG, '#eceffc'],
  [CODE_TEXT, '#4548c9'],
  ['color-scheme:dark', 'color-scheme:light'],
  ['<meta name="color-scheme" content="dark" />', '<meta name="color-scheme" content="light" />'],
  ['<meta name="supported-color-schemes" content="dark" />', '<meta name="supported-color-schemes" content="light" />'],
];

export function toLightVariant(html) {
  let light = html;
  for (const [dark, replacement] of LIGHT_TOKEN_MAP)
    light = light.replaceAll(dark, replacement);
  return light;
}

// ---- the welcome email ----------------------------------------------
// Sent once, the moment someone subscribes — rendered at build time
// like every other email (the Worker fetches /welcome-email.html and
// fills {{UNSUBSCRIBE_URL}}). It sets the contract: every post from
// the archive, one at a time, oldest first.

export function renderWelcomeEmail(allPosts) {
  const newest = allPosts[allPosts.length - 1] ?? null;
  const first = allPosts[0] ?? null;
  return `<!doctype html>
<html style="color-scheme:dark"><head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
</head><body style="margin:0;background:${PAGE_BG};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px;background:${PAGE_BG}">
    <div style="background:${CARD_BG};border:1px solid ${EDGE};border-radius:12px;overflow:hidden">
      <div style="padding:30px 32px 30px">
        <div style="font-size:11px;letter-spacing:.16em;color:${MUTED};margin:0 0 10px">IVUE NEWSLETTER</div>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:${HEADING}">Welcome aboard.</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${TEXT}">You're on the list. Here's the deal: the ivue blog is a running record of reducing Vue reactivity to its invariant core &mdash; measured numbers, real patterns, no fluff. You'll receive <strong style="color:${HEADING}">every post from the archive, one at a time</strong>, from the beginning &mdash; the story in the order it happened.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${TEXT}">Your first post lands with the next delivery pass. Can't wait? The whole archive is open:</p>
        <a href="${SITE}/blog/" style="display:inline-block;margin:2px 0 6px;background:${BUTTON_BG};color:#ffffff;text-decoration:none;font-size:14.5px;font-weight:600;padding:11px 22px;border-radius:8px">Browse all posts &rarr;</a>
      </div>
    </div>
    ${authorCard()}
    ${first ? `<p style="margin:26px 0 10px;font-size:11.5px;letter-spacing:.14em;color:${MUTED}">UP FIRST FOR YOU</p>${neighborCard('WHERE THE STORY STARTS', first)}` : ''}
    ${newest && newest !== first ? neighborCard('LATEST POST', newest) : ''}
    <p style="margin:20px 0 8px;font-size:12px;line-height:1.6;color:${FAINT}">
      You're receiving the ivue newsletter — every post from the archive,
      one at a time. <a href="${SITE}/blog/" style="color:${MUTED}">Browse all posts</a>
      &nbsp;&middot;&nbsp; <a href="{{UNSUBSCRIBE_URL}}" style="color:${MUTED}">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}

// ---- the complete email ---------------------------------------------
// posts: full list sorted oldest-first; the neighbors are chronological.

export async function renderEmail(post, allPosts) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const bannerUrl = `${SITE}/blog/${post.slug}.png`;
  const position = allPosts.findIndex((entry) => entry.slug === post.slug);
  const older = position > 0 ? allPosts[position - 1] : null;
  const newer =
    position >= 0 && position < allPosts.length - 1
      ? allPosts[position + 1]
      : null;

  return `<!doctype html>
<html style="color-scheme:dark"><head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
</head><body style="margin:0;background:${PAGE_BG};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px;background:${PAGE_BG}">
    <div style="background:${CARD_BG};border:1px solid ${EDGE};border-radius:12px;overflow:hidden">
      <a href="${postUrl}" style="text-decoration:none">
        <img src="${bannerUrl}" alt="${escapeHtml(post.title)}" width="560" style="display:block;width:100%;height:auto;border:0" />
      </a>
      <div style="padding:26px 32px 30px">
        <h1 style="margin:0 0 22px;font-size:23px;line-height:1.3;color:${HEADING}">${escapeHtml(post.title)}</h1>
        ${await bodyHtml(post.source, post.slug, postUrl)}
        <a href="${postUrl}" style="display:inline-block;margin:6px 0 0;background:${BUTTON_BG};color:#ffffff;text-decoration:none;font-size:14.5px;font-weight:600;padding:11px 22px;border-radius:8px">Read on ivue.dev &rarr;</a>
      </div>
    </div>
    ${authorCard()}
    ${relatedSection(post, allPosts)}
    ${older || newer ? `<p style="margin:26px 0 10px;font-size:11.5px;letter-spacing:.14em;color:${MUTED}">MORE FROM THE BLOG</p>` : ''}
    ${neighborRow(newer, older)}
    <p style="margin:20px 0 8px;font-size:12px;line-height:1.6;color:${FAINT}">
      You're receiving the ivue newsletter — every post from the archive,
      one at a time. <a href="${SITE}/blog/" style="color:${MUTED}">Browse all posts</a>
      &nbsp;&middot;&nbsp; <a href="{{UNSUBSCRIBE_URL}}" style="color:${MUTED}">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}

// ---- inputs ----------------------------------------------------------

export function loadPostsWithSource() {
  const recordedDates = JSON.parse(
    readFileSync(resolve(blogDirectory, 'blog-dates.json'), 'utf8'),
  );
  const frontmatterField = (source, field) => {
    const match = source.match(
      new RegExp(`^${field}:\\s*(?:'([^']*)'|"([^"]*)"|(.+))$`, 'm'),
    );
    return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : '';
  };
  return readdirSync(blogDirectory)
    .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
    .map((entry) => {
      const slug = entry.slice(0, -'.md'.length);
      const source = readFileSync(resolve(blogDirectory, entry), 'utf8');
      // private posts never enter the newsletter catalog
      if (isPrivatePost(source)) return null;
      const record = recordedDates[slug];
      // curated related slugs, strongest first (inline-array frontmatter)
      const relatedMatch = source.match(/^relatedPosts:\s*\[([^\]]*)\]/m);
      return {
        slug,
        source,
        relatedPosts: relatedMatch
          ? relatedMatch[1].split(',').map((entry) => entry.trim()).filter(Boolean)
          : [],
        title: frontmatterField(source, 'title'),
        description: frontmatterField(source, 'description'),
        url: `${SITE}/blog/${slug}`,
        date: record?.date ?? null,
        timestamp: record?.timestamp ?? 0,
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.timestamp - second.timestamp);
}

// ---- CLI preview -----------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const posts = loadPostsWithSource();
  const post = posts.find((entry) => entry.slug === slug);
  if (!post) {
    console.error(`unknown slug: ${slug}\nknown: ${posts.map((p) => p.slug).join(', ')}`);
    process.exit(1);
  }
  process.stdout.write(await renderEmail(post, posts));
}
