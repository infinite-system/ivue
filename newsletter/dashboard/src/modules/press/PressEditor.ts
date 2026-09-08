import { Static } from 'ivue/extras';
import { Node, mergeAttributes, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { Markdown as TiptapMarkdown } from 'tiptap-markdown';
import { Markdown } from './Markdown';

// The press's Tiptap configuration — the extension set every markdown
// editor loads, and the two translations the editor makes at its
// edges: markdown in (a media link alone on its line becomes a
// YouTube player or a <video>) and markdown out (the serializer's
// escapes and backslash line breaks are undone, so the text that lands
// in the database is the text a tweet can carry verbatim).
class $PressEditor {
  /** a video file we host — a block node that serializes as its bare URL */
  static readonly Video = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
      return { src: { default: null } };
    },
    parseHTML() {
      return [{ tag: 'video[src]' }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['video', mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata', class: 'press-video' })];
    },
    addCommands() {
      return {
        setVideo:
          (src: string) =>
          ({ commands }) =>
            commands.insertContent({ type: this.name, attrs: { src } }),
      };
    },
    addStorage() {
      return { markdown: $PressEditor.bareUrlSpec() };
    },
  });

  /** the YouTube node, serialized as the watch URL it was given */
  static readonly PressYoutube = Youtube.extend({
    addStorage() {
      return {
        markdown: {
          ...$PressEditor.bareUrlSpec(),
          parse: { setup: (markdownit: PressEditor.MarkdownIt) => $PressEditor.installEmbeds(markdownit) },
        },
      };
    },
  });

  /** images are blocks here: closing the block keeps the next paragraph off the image line */
  static readonly PressImage = Image.extend({
    addStorage() {
      return {
        markdown: {
          serialize(state: PressEditor.SerializerState, node: PressEditor.NodeLike) {
            const alt = String(node.attrs.alt ?? '').replace(/[\[\]]/g, '');
            state.write(`![${alt}](${String(node.attrs.src ?? '')})`);
            state.closeBlock(node);
          },
          parse: {},
        },
      };
    },
  });

  static bareUrlSpec() {
    return {
      serialize(state: PressEditor.SerializerState, node: PressEditor.NodeLike) {
        state.write(String(node.attrs.src ?? ''));
        state.closeBlock(node);
      },
      parse: {},
    };
  }

  /**
   * markdown-it rule: a paragraph that is one media link becomes the
   * HTML the YouTube and Video nodes parse, so an existing body loads
   * with its players in place.
   */
  static installEmbeds(markdownit: PressEditor.MarkdownIt) {
    markdownit.core.ruler.push('press_embed', (state) => {
      const tokens = state.tokens;
      for (let index = 0; index + 2 < tokens.length; index++) {
        if (
          tokens[index].type !== 'paragraph_open' ||
          tokens[index + 1].type !== 'inline' ||
          tokens[index + 2].type !== 'paragraph_close'
        )
          continue;
        const text = tokens[index + 1].content.trim();
        const kind = Markdown.Class.youtubeId(text) ? 'press_youtube' : Markdown.Class.isVideoUrl(text) ? 'press_video' : null;
        if (!kind) continue;
        const token = new state.Token(kind, '', 0);
        token.block = true;
        token.content = text;
        tokens.splice(index, 3, token);
      }
    });
    markdownit.renderer.rules.press_youtube = (tokens, index) =>
      `<div data-youtube-video><iframe src="${markdownit.utils.escapeHtml(tokens[index].content)}"></iframe></div>`;
    markdownit.renderer.rules.press_video = (tokens, index) =>
      `<video src="${markdownit.utils.escapeHtml(tokens[index].content)}"></video>`;
  }

  static extensions(placeholder: string): AnyExtension[] {
    return [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      this.PressImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: 'noreferrer' } }),
      this.PressYoutube.configure({ nocookie: true, width: 640, height: 360, HTMLAttributes: { class: 'press-embed-frame' } }),
      this.Video,
      Placeholder.configure({ placeholder }),
      TiptapMarkdown.configure({ html: false, breaks: true, tightLists: true, bulletListMarker: '-', linkify: false }),
    ];
  }

  /**
   * The serializer writes `\` before every markdown-significant
   * character and ends a soft line with `\`; the press stores what a
   * platform will show, so both come off. A body's own backslashes are
   * rare enough that losing one before punctuation is the price.
   */
  static normalize(markdown: string): string {
    return markdown
      .replace(/\\\n/g, '\n')
      .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
      .replace(/[ \t]+$/gm, '')
      .replace(/^\n+/, '')
      .trimEnd();
  }
}

export namespace PressEditor {
  export const $Class = Static($PressEditor);
  export let Class = $Class;

  export interface NodeLike {
    attrs: Record<string, unknown>;
  }

  export interface SerializerState {
    write(text: string): void;
    closeBlock(node: NodeLike): void;
  }

  export interface Token {
    type: string;
    content: string;
    block: boolean;
  }

  export interface MarkdownIt {
    core: { ruler: { push(name: string, rule: (state: { tokens: Token[]; Token: new (type: string, tag: string, nesting: number) => Token }) => void): void } };
    renderer: { rules: Record<string, (tokens: Token[], index: number) => string> };
    utils: { escapeHtml(text: string): string };
  }
}
