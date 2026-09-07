/*
=== GENERATOR ===
Goal: Prove the press markdown subset renders to the tags the platform cards show, and that a body can never inject markup.
// domain-invariant: $Markdown — If a body contains HTML, then it renders as text
Impossible if true: a body's angle bracket becomes an element
*/
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders headings, paragraphs with breaks, bold, italic, links, bare URLs, code, lists, quotes, rules, fences', () => {
    const html = Markdown.Class.render(
      '# Title\n\nOne **bold** _it_ `code` [l](https://u) https://bare.dev\nsecond line\n\n- a\n- b\n\n1. x\n\n> q\n\n---\n\n```\nraw <tag>\n```',
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<p>One <strong>bold</strong> <em>it</em> <code>code</code> <a href="https://u" target="_blank" rel="noreferrer">l</a> <a href="https://bare.dev" target="_blank" rel="noreferrer">https://bare.dev</a><br>second line</p>');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<ol><li>x</li></ol>');
    expect(html).toContain('<blockquote>q</blockquote>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<pre><code>raw &lt;tag&gt;</code></pre>');
  });

  // domain-invariant: $Markdown — If a body contains HTML, then it renders as text
  it('escapes markup: a script tag is text, an image keeps only alt and src', () => {
    expect(Markdown.Class.render('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(Markdown.Class.render('![alt](https://x/i.png)')).toBe('<p><img alt="alt" src="https://x/i.png"></p>');
  });
});
