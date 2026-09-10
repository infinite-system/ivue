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

  it('embeds a media link alone on its line: YouTube as a player, a video file as a video, and leaves prose links alone', () => {
    const html = Markdown.Class.render('Watch:\n\nhttps://youtu.be/dQw4w9WgXcQ?t=5\n\nhttps://cdn.test/press-asset/1-clip.mp4\n\nRead https://ivue.dev here');
    expect(html).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('<video class="press-video" controls preload="metadata" src="https://cdn.test/press-asset/1-clip.mp4">');
    expect(html).toContain('<a href="https://ivue.dev" target="_blank" rel="noreferrer">https://ivue.dev</a>');
    expect(Markdown.Class.youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(Markdown.Class.youtubeId('https://ivue.dev/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(Markdown.Class.isVideoUrl('https://x.test/a.png')).toBe(false);
    expect(Markdown.Class.render('```\nopen fence')).toBe('<pre><code>open fence</code></pre>');
  });
});
