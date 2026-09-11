import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import { Static } from '../../../../../../lib/Static';
import { Shiki } from './Shiki';

// A second colour engine: highlight.js, which classes tokens instead of
// inlining colours, so a theme is a stylesheet. The same `highlight`
// signature as Shiki, which is all a Code subclass needs to swap it in.
class $Hljs {
  static readonly label = 'highlight.js';
  static readonly LANGUAGES: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    view: 'xml',
    css: 'css'
  };

  /** the registered engine, once */
  protected static get $engine(): typeof hljs {
    hljs.registerLanguage('typescript', typescript);
    hljs.registerLanguage('javascript', javascript);
    hljs.registerLanguage('xml', xml);
    hljs.registerLanguage('css', css);
    return hljs;
  }

  static async highlight(code: string, lang: string, theme: string): Promise<string> {
    const language = this.LANGUAGES[lang];
    if (!language) return Shiki.Class.plain(code);
    try {
      const { value } = this.$engine.highlight(code, { language, ignoreIllegals: true });
      return `<pre class="code-pre hljs" data-theme="${theme}"><code>${value}</code></pre>`;
    } catch {
      return Shiki.Class.plain(code);
    }
  }
}

export namespace Hljs {
  export const $Class = Static($Hljs);
  export let Class = $Class;
}
