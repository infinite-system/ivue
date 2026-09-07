import { Static } from 'ivue/extras';

// The press's markdown subset rendered to HTML for the platform cards
// that show markdown (Reddit, dev.to, the articles). Text is escaped
// first, so a body can never inject markup; only the subset's own
// constructs become tags: headings, paragraphs, line breaks, bold,
// italic, links, images, code spans, fenced code, lists, quotes, rules.
class $Markdown {
  static escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** inline constructs inside one already-escaped line */
  static inline(text: string): string {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
      .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1<em>$2</em>')
      .replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
  }

  static render(markdown: string): string {
    const lines = this.escape(markdown.replace(/\r\n/g, '\n')).split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let fence: string[] | null = null;
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
    for (const line of lines) {
      if (fence) {
        if (/^```/.test(line)) {
          html.push(`<pre><code>${fence.join('\n')}</code></pre>`);
          fence = null;
        } else fence.push(line);
        continue;
      }
      if (/^```/.test(line)) {
        flushParagraph();
        flushList();
        fence = [];
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
      flushList();
      paragraph.push(line);
    }
    if (fence) html.push(`<pre><code>${fence.join('\n')}</code></pre>`);
    flushParagraph();
    flushList();
    return html.join('\n');
  }
}

export namespace Markdown {
  export const $Class = Static($Markdown);
  export let Class = $Class;
}
