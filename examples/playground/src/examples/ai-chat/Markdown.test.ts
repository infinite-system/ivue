/*
=== GENERATOR ===
Goal: Prove the markdown subset renders only its own constructs as tags, keeps a fence's language for the highlighter, embeds a media link alone on its line, and that the plain projection is the rendered text with block boundaries as newlines.
[The projection is the rendered text](./ai-chat.invariants.md#the-projection-is-the-rendered-text)
// domain-invariant: $Markdown — If a message carries markup, then it renders as escaped text, never as tags
// domain-invariant: $Markdown — If a fenced block names a language, then the rendered block carries it for the highlighter
// domain-invariant: $Markdown — If a block is pipe rows under a header and a rule row, then it renders as a table with inline cells, and a lone pipe line stays a paragraph
Impossible if true: a message injects a tag into the page

=== GENERATOR-DESCRIBED ===
$Markdown renders the chat's markdown subset to escaped HTML and projects it to the plain text the row shows.
*/
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  // domain-invariant: $Markdown — If a message carries markup, then it renders as escaped text, never as tags
  // impossible-if-true: $Markdown — a message injects a tag into the page
  it('escapes markup and renders the subset', () => {
    const html = Markdown.Class.render(
      '# Title\n\nHello <b>x</b> **bold** _it_ `code` [link](https://ivue.dev) https://ivue.dev\n\n- one\n- two\n\n1. first\n\n> quoted\n\n---\n\n![alt](https://x.test/a.png)'
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>it</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://ivue.dev" target="_blank" rel="noreferrer">link</a>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<ol><li>first</li></ol>');
    expect(html).toContain('<blockquote>quoted</blockquote>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<img alt="alt" src="https://x.test/a.png" loading="lazy">');
  });

  // domain-invariant: $Markdown — If a fenced block names a language, then the rendered block carries it for the highlighter
  it('keeps a fence language on the block, closes an open fence, and embeds media lines', () => {
    expect(Markdown.Class.render('```ts\nconst a = 1;\n```')).toBe(
      '<pre class="chat-code" data-lang="ts"><code>const a = 1;</code></pre>'
    );
    expect(Markdown.Class.render('```\nopen')).toBe(
      '<pre class="chat-code" data-lang=""><code>open</code></pre>'
    );
    const media = Markdown.Class.render(
      'Watch:\n\nhttps://youtu.be/dQw4w9WgXcQ\n\nhttps://cdn.test/clip.mp4'
    );
    expect(media).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(media).toContain(
      '<video class="chat-video" controls preload="metadata" src="https://cdn.test/clip.mp4">'
    );
    expect(Markdown.Class.youtubeId('https://ivue.dev/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(Markdown.Class.isVideoUrl('https://x.test/a.png')).toBe(false);
  });

  // invariant: The projection is the rendered text (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  // domain-invariant: $Markdown — If a block is pipe rows under a header and a rule row, then it renders as a table with inline cells, and a lone pipe line stays a paragraph
  it('a pipe table renders as a table: header, rule, rows, cells inline; a lone pipe line is a paragraph', () => {
    const html = Markdown.Class.render(
      '| tool | calls |\n|---|---:|\n| `Bash` | **4** |\n| Read \\| Write | 2 |\n\njust | a line'
    );
    expect(html).toContain(
      '<div class="chat-table"><table><thead><tr><th>tool</th><th>calls</th></tr></thead><tbody><tr><td><code>Bash</code></td><td><strong>4</strong></td></tr><tr><td>Read | Write</td><td>2</td></tr></tbody></table></div>'
    );
    expect(html).toContain('<p>just | a line</p>');
    expect(Markdown.Class.render('| only | a header |')).toBe('<p>| only | a header |</p>');
  });

  it('the plain projection is the rendered text with block boundaries kept', () => {
    const plain = Markdown.Class.plain(
      '# Title\n\n**bold** and `code` [link](https://ivue.dev)\n\n```ts\nconst a = 1;\n```\n\n> quoted\n\n---'
    );
    expect(plain).toBe('Title\n\nbold and code link\n\nconst a = 1;\n\nquoted');
  });
});
