// The press's own Tiptap commands, declared on the core command set so
// `editor.chain().setVideo(url)` type-checks (the node lives in PressEditor).
import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (src: string) => ReturnType;
    };
  }
}
