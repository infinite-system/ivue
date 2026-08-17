// The deterministic blog-post → newsletter-email conversion.
//
// Everything the subscriber sees is rendered HERE, at build time, from
// committed inputs: post markdown, blog-dates.json, and the committed
// embed screenshots (public/blog/embeds — see blog-embed-shots.mjs).
// The Worker only substitutes the per-recipient {{UNSUBSCRIBE_URL}}
// placeholder. Same input → byte-identical email.
//
// Preview any post's email as a file:
//   node docs_v2/scripts/blog-email-renderer.mjs <slug> > /tmp/email.html
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://ivue.dev';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const embedsDirectory = resolve(scriptDirectory, '../public/blog/embeds');

// ---- inline markdown → inline-styled HTML ---------------------------

function inlineHtml(markdown) {
  return markdown
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/`([^`]+)`/g, '<code style="background:#eef1f8;color:#3730a3;padding:1px 5px;border-radius:4px;font:12.5px ui-monospace,Menlo,monospace">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, `<a href="${SITE}$2" style="color:#4f6af0">$1</a>`)
    .replace(/\[([^\]]+)\]\((https?:[^)]*)\)/g, '<a href="$2" style="color:#4f6af0">$1</a>');
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

// ---- block-level markdown → inline-styled HTML ----------------------

export function bodyHtml(source, slug, postUrl) {
  const body = source
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<BlogPostDate \/>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
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
    if (line.startsWith('```')) {
      const label = line.match(/\[([^\]]+)\]/)?.[1] ?? '';
      const codeLines = [];
      index++;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      index++; // closing fence
      const code = codeLines.join('\n')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      blocks.push(
        (label
          ? `<div style="margin:0 0 0;padding:7px 16px;background:#151a30;color:#8fa8cf;border-radius:8px 8px 0 0;font:11.5px ui-monospace,Menlo,monospace">${label}</div>`
          : '') +
        `<pre style="margin:0 0 20px;padding:14px 16px;background:#0d1226;color:#e6edf3;border-radius:${label ? '0 0 8px 8px' : '8px'};font:12.5px/1.6 ui-monospace,Menlo,monospace;overflow-x:auto"><code>${code}</code></pre>`,
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
        .map((cell) => `<th style="padding:8px 12px;border-bottom:2px solid #e3e8f2;text-align:left;font-size:13px;color:#101828">${cell}</th>`)
        .join('');
      const trs = bodyRows
        .map((cells) =>
          `<tr>${cells.map((cell) => `<td style="padding:8px 12px;border-bottom:1px solid #eef1f8;font-size:13.5px;color:#3a4459">${cell}</td>`).join('')}</tr>`)
        .join('');
      blocks.push(`<table style="margin:0 0 20px;border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }
    if (/^#{2,3} /.test(line)) {
      blocks.push(`<h2 style="margin:26px 0 12px;font-size:18px;line-height:1.35;color:#101828">${inlineHtml(line.replace(/^#{2,3} /, ''))}</h2>`);
      index++;
      continue;
    }
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index++;
      }
      blocks.push(`<blockquote style="margin:0 0 20px;padding:10px 18px;border-left:3px solid #4f6af0;background:#f6f7fd;color:#3a4459;font-size:15px;line-height:1.6"><p style="margin:0">${inlineHtml(quoteLines.join(' '))}</p></blockquote>`);
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
      blocks.push(`<ul style="margin:0 0 20px;padding-left:22px;color:#3a4459;font-size:15px;line-height:1.6">${items.join('')}</ul>`);
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
      blocks.push(`<ol style="margin:0 0 20px;padding-left:22px;color:#3a4459;font-size:15px;line-height:1.6">${items.join('')}</ol>`);
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
      blocks.push(`<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#3a4459">${inlineHtml(paragraphLines.join(' '))}</p>`);
  }
  return blocks.join('');
}

// ---- neighbor card (the blog's older/newer nav, in email form) ------

function neighborCard(label, post) {
  if (!post) return '';
  return (
    `<a href="${SITE}/blog/${post.slug}" style="text-decoration:none;display:block;margin:0 0 14px;border:1px solid #e3e8f2;border-radius:10px;overflow:hidden;background:#ffffff">` +
    `<img src="${SITE}/blog/${post.slug}.png" alt="" width="496" style="display:block;width:100%;height:auto;border:0" />` +
    `<div style="padding:12px 16px">` +
    `<div style="font-size:10.5px;letter-spacing:.12em;color:#6b7a99;margin:0 0 4px">${label}</div>` +
    `<div style="font-size:15px;font-weight:600;color:#101828">${escapeHtml(post.title)}</div>` +
    `</div></a>`
  );
}

// ---- the complete email ---------------------------------------------
// posts: full list sorted oldest-first; the neighbors are chronological.

export function renderEmail(post, allPosts) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const bannerUrl = `${SITE}/blog/${post.slug}.png`;
  const dateLine = post.date
    ? new Date(post.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })
    : '';
  const position = allPosts.findIndex((entry) => entry.slug === post.slug);
  const older = position > 0 ? allPosts[position - 1] : null;
  const newer =
    position >= 0 && position < allPosts.length - 1
      ? allPosts[position + 1]
      : null;

  return `<!doctype html>
<html><body style="margin:0;background:#f4f6fb;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <a href="${SITE}" style="text-decoration:none">
      <img src="${SITE}/brand-lockup-light.png" alt="ivue &mdash; Infinite Vue" width="147" height="57" style="display:block;margin:0 0 6px;border:0" />
    </a>
    <p style="margin:0 0 18px;font-size:11.5px;letter-spacing:.14em;color:#6b7a99">NEWSLETTER</p>
    <div style="background:#ffffff;border:1px solid #e3e8f2;border-radius:12px;overflow:hidden">
      <a href="${postUrl}" style="text-decoration:none">
        <img src="${bannerUrl}" alt="${escapeHtml(post.title)}" width="560" style="display:block;width:100%;height:auto;border:0" />
      </a>
      <div style="padding:26px 32px 30px">
        <h1 style="margin:0 0 8px;font-size:23px;line-height:1.3;color:#101828">${escapeHtml(post.title)}</h1>
        ${dateLine ? `<p style="margin:0 0 22px;font-size:12.5px;color:#8a94a8">${dateLine}</p>` : ''}
        ${bodyHtml(post.source, post.slug, postUrl)}
        <a href="${postUrl}" style="display:inline-block;margin:6px 0 0;background:#4f6af0;color:#ffffff;text-decoration:none;font-size:14.5px;font-weight:600;padding:11px 22px;border-radius:8px">Read on ivue.dev &rarr;</a>
      </div>
    </div>
    <div style="margin:22px 0 0;padding:16px 18px;background:#ffffff;border:1px solid #e3e8f2;border-radius:12px">
      <table role="presentation" style="border-collapse:collapse"><tr>
        <td style="vertical-align:middle;padding:0 14px 0 0">
          <img src="${SITE}/avatars/evgeny.png" alt="Evgeny Kalashnikov" width="54" height="54" style="display:block;border-radius:50%;border:0" />
        </td>
        <td style="vertical-align:middle">
          <div style="font-size:10.5px;letter-spacing:.12em;color:#6b7a99;margin:0 0 3px">AUTHOR</div>
          <div style="font-size:15px;font-weight:600;color:#101828;margin:0 0 3px">Evgeny Kalashnikov</div>
          <div style="font-size:12.5px">
            <a href="https://x.com/evgenykalash" style="color:#4f6af0;text-decoration:none">X</a>
            &nbsp;&middot;&nbsp; <a href="https://github.com/infinite-system" style="color:#4f6af0;text-decoration:none">GitHub</a>
            &nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/in/evgeny-kalashnikov/" style="color:#4f6af0;text-decoration:none">LinkedIn</a>
            &nbsp;&middot;&nbsp; <a href="https://forms.gle/Z7L5N8hBYFoLQ8wA9" style="color:#4f6af0;text-decoration:none">Email</a>
          </div>
        </td>
      </tr></table>
    </div>
    ${older || newer ? `<p style="margin:26px 0 10px;font-size:11.5px;letter-spacing:.14em;color:#6b7a99">MORE FROM THE BLOG</p>` : ''}
    ${neighborCard('NEWER POST', newer)}
    ${neighborCard('OLDER POST', older)}
    <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8a94a8">
      You're receiving the ivue newsletter — every post from the archive,
      one at a time. <a href="${SITE}/blog/" style="color:#6b7a99">Browse all posts</a>
      &nbsp;&middot;&nbsp; <a href="{{UNSUBSCRIBE_URL}}" style="color:#6b7a99">Unsubscribe</a>
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
      const record = recordedDates[slug];
      return {
        slug,
        source,
        title: frontmatterField(source, 'title'),
        description: frontmatterField(source, 'description'),
        url: `${SITE}/blog/${slug}`,
        date: record?.date ?? null,
        timestamp: record?.timestamp ?? 0,
      };
    })
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
  process.stdout.write(renderEmail(post, posts));
}
