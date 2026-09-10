import { Static } from '../../Static';

// The markdown subset a chat message carries, rendered to HTML. Text is
// escaped first, so a message can never inject markup; only the subset's
// own constructs become tags: headings, paragraphs, line breaks, bold,
// italic, links, images, code spans, fenced code (with its language kept
// on the block for the highlighter), lists, quotes, rules, and a media
// link alone on its line (YouTube, a video file) as an embed.
class $Markdown {
  static readonly YOUTUBE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#][^\s]*)?$/;
  static readonly VIDEO_FILE = /^https?:\/\/[^\s<>"']+\.(?:mp4|webm|mov)(?:\?[^\s<>"']*)?$/i;

  static youtubeId(text: string): string | null {
    const match = this.YOUTUBE.exec(text.trim());
    return match ? match[1] : null;
  }

  static isVideoUrl(text: string): boolean {
    return this.VIDEO_FILE.test(text.trim());
  }

  static embed(text: string): string | null {
    const id = this.youtubeId(text);
    if (id)
      return `<div class="chat-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    if (this.isVideoUrl(text)) return `<video class="chat-video" controls preload="metadata" src="${this.escape(text.trim())}"></video>`;
    return null;
  }

  static escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** inline constructs inside one already-escaped line */
  static inline(text: string): string {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
      .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1<em>$2</em>')
      .replace(/(^|[^"'>=])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
  }

  /** a pipe table: the first row heads it, every other row is a body row; cells render inline */
  static table(rows: string[]): string {
    const cells = (row: string) =>
      row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split(/(?<!\\)\|/)
        .map((cell) => this.inline(cell.replace(/\\\|/g, '|').trim()));
    const [head, ...body] = rows.map(cells);
    const thead = `<thead><tr>${head.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead>`;
    const tbody = body.length ? `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>` : '';
    // the wrapper scrolls a wide table sideways and carries the rounded frame; a table cannot clip its own corners
    return `<div class="chat-table"><table>${thead}${tbody}</table></div>`;
  }

  static isTableRow(line: string): boolean {
    return /^\s*\|.*\|\s*$/.test(line);
  }

  static isTableRule(line: string): boolean {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');
  }

  /** a fenced block: escaped code with its language on the element for the highlighter */
  static fence(code: string, language: string): string {
    const lang = language.replace(/[^a-z0-9+#-]/gi, '').toLowerCase();
    return `<pre class="chat-code" data-lang="${lang}"><code>${code}</code></pre>`;
  }

  static render(markdown: string): string {
    const lines = this.escape(markdown.replace(/\r\n/g, '\n')).split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let fence: { language: string; lines: string[] } | null = null;
    const flushParagraph = () => {
      if (paragraph.length) html.push(`<p>${paragraph.map((line) => this.inline(line)).join('<br>')}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (list) {
        const tag = list.ordered ? 'ol' : 'ul';
        html.push(`<${tag}>${list.items.map((item) => `<li>${this.inline(item)}</li>`).join('')}</${tag}>`);
      }
      list = null;
    };
    for (let at = 0; at < lines.length; at++) {
      const line = lines[at];
      // a table: a header row, an alignment row, then rows — every line starts with a pipe
      if (!fence && this.isTableRow(line) && this.isTableRule(lines[at + 1] ?? '')) {
        flushParagraph();
        flushList();
        const rows: string[] = [line];
        at += 2;
        while (at < lines.length && this.isTableRow(lines[at])) rows.push(lines[at++]);
        at--;
        html.push(this.table(rows));
        continue;
      }
      if (fence) {
        if (/^```/.test(line)) {
          html.push(this.fence(fence.lines.join('\n'), fence.language));
          fence = null;
        } else fence.lines.push(line);
        continue;
      }
      const opening = /^```\s*([\w+#-]*)/.exec(line);
      if (opening) {
        flushParagraph();
        flushList();
        fence = { language: opening[1] ?? '', lines: [] };
        continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (heading) {
        flushParagraph();
        flushList();
        html.push(`<h${heading[1].length}>${this.inline(heading[2])}</h${heading[1].length}>`);
        continue;
      }
      if (/^\s*---\s*$/.test(line)) {
        flushParagraph();
        flushList();
        html.push('<hr>');
        continue;
      }
      const item = /^\s*([-*]|\d+\.)\s+(.+)$/.exec(line);
      if (item) {
        flushParagraph();
        const ordered = /\d/.test(item[1]);
        if (!list || list.ordered !== ordered) {
          flushList();
          list = { ordered, items: [] };
        }
        list.items.push(item[2]);
        continue;
      }
      const quote = /^&gt;\s?(.*)$/.exec(line);
      if (quote) {
        flushParagraph();
        flushList();
        html.push(`<blockquote>${this.inline(quote[1])}</blockquote>`);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }
      const embed = this.embed(line.replace(/&amp;/g, '&'));
      if (embed) {
        flushParagraph();
        flushList();
        html.push(embed);
        continue;
      }
      flushList();
      paragraph.push(line);
    }
    if (fence) html.push(this.fence(fence.lines.join('\n'), fence.language));
    flushParagraph();
    flushList();
    return html.join('\n');
  }

  /**
   * The plain text the rendered HTML shows, block boundaries as newlines —
   * the projection copy and the index read. It must equal the rendered
   * row's innerText, so it walks the same subset the same way.
   */
  static plain(markdown: string): string {
    return markdown
      .replace(/\r\n/g, '\n')
      .replace(/^```[^\n]*\n?/gm, '')
      .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^&gt;\s?|^>\s?/gm, '')
      .replace(/^\s*---\s*$/gm, '')
      .trim();
  }
}

export namespace Markdown {
  export const $Class = Static($Markdown);
  export let Class = $Class;
}
