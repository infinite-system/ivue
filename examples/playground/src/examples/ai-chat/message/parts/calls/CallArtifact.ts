import { Reactive } from '../../../../../ivue';
import { CallToolModel } from './CallToolModel';

// An artifact action: what was published or read, and the link that
// came back.
class $CallArtifact extends CallToolModel.$Class {
  get action(): string {
    return String(this.input.action ?? 'publish');
  }

  get title(): string {
    return String(this.input.title ?? this.structured.title ?? this.input.file_path ?? '');
  }

  get resultUrl(): string {
    return typeof this.structured.url === 'string' ? this.structured.url : '';
  }

  get versionLabel(): string {
    const version = this.structured.version;
    return typeof version === 'string' ? `v${version}` : '';
  }

  override get sections(): CallToolModel.Section[] {
    const sections: CallToolModel.Section[] = [
      { title: 'input', code: this.inputJson, lang: 'json' }
    ];
    if (this.resultText)
      sections.push({
        title: 'result',
        code: this.resultText,
        lang: 'text',
        tone: this.isFailed ? 'error' : 'plain'
      });
    return sections;
  }
}

export namespace CallArtifact {
  export const $Class = $CallArtifact;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
