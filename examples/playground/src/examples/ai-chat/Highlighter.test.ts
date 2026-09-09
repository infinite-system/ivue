/*
=== GENERATOR ===
Goal: Prove colour is never on the critical path: a block has a plain escaped form at once, an unknown or oversized language stays plain, a language is chosen from a fence tag or a file extension, and a missing shiki leaves every block plain rather than failing.
// domain-invariant: $Highlighter — If shiki cannot load, then every block renders plain and escaped
// domain-invariant: $Highlighter — If a file path names an extension, then its language is the one shiki knows for it, or text
Impossible if true: a code block waits on the highlighter to paint

=== GENERATOR-DESCRIBED ===
$Highlighter colours code through shiki when it loads and leaves it plain and escaped when it does not.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Highlighter } from './Highlighter';

describe('Highlighter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // domain-invariant: $Highlighter — If a file path names an extension, then its language is the one shiki knows for it, or text
  it('maps tags and extensions to languages', () => {
    expect(Highlighter.Class.language('ts')).toBe('typescript');
    expect(Highlighter.Class.language('sh')).toBe('bash');
    expect(Highlighter.Class.language('JSON')).toBe('json');
    expect(Highlighter.Class.language('')).toBe('text');
    expect(Highlighter.Class.language('brainfuck')).toBe('text');
    expect(Highlighter.Class.languageForPath('src/App.vue')).toBe('vue');
    expect(Highlighter.Class.languageForPath('README.md')).toBe('markdown');
    expect(Highlighter.Class.languageForPath('Makefile')).toBe('text');
  });

  // domain-invariant: $Highlighter — If shiki cannot load, then every block renders plain and escaped
  // impossible-if-true: $Highlighter — a code block waits on the highlighter to paint
  it('renders plain escaped code at once, and stays plain when shiki is unavailable or the code is huge', async () => {
    expect(Highlighter.Class.plain('a < b')).toBe('<pre class="chat-code"><code>a &lt; b</code></pre>');
    vi.spyOn(Highlighter.Class, 'load').mockResolvedValue(null);
    expect(await Highlighter.Class.highlight('const a = 1;', 'ts')).toBe('<pre class="chat-code"><code>const a = 1;</code></pre>');
    expect(await Highlighter.Class.highlight('x', 'text')).toBe('<pre class="chat-code"><code>x</code></pre>');
    expect(await Highlighter.Class.highlight('x'.repeat(Highlighter.Class.MAXIMUM_CHARS + 1), 'ts')).toContain('<pre class="chat-code">');
  });

  it('uses the engine when it loads, caches by code and language, and falls back when it throws', async () => {
    const codeToHtml = vi.fn((code: string, options: { lang: string }) => `<pre class="shiki" style="x"><code><span class="line">${code} ${options.lang}</span></code></pre>`);
    const engine = { highlighter: { codeToHtml }, loaded: new Set<string>() };
    const Fresh = class extends Highlighter.$Class {};
    vi.spyOn(Fresh, 'load').mockResolvedValue(engine as never);
    const first = await Fresh.highlight('let x', 'ts');
    expect(first).toBe('<pre class="chat-code shiki" style="x"><code><span class="line">let x typescript</span></code></pre>');
    const second = await Fresh.highlight('let x', 'ts');
    expect(second).toBe(first);
    expect(codeToHtml).toHaveBeenCalledTimes(1);
    codeToHtml.mockImplementationOnce(() => {
      throw new Error('bad grammar');
    });
    expect(await Fresh.highlight('other', 'json')).toBe('<pre class="chat-code"><code>other</code></pre>');
  });
});
