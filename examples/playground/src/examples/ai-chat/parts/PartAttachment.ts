import { Reactive } from '../../../ivue';
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';

// An attachment: an image at its natural aspect (the size is known, so a
// late load never remeasures), or a file chip with name, size and type.
class $PartAttachment {
  constructor(public props: Part.Props<SessionLog.PartAttachment>) {}

  get part(): SessionLog.PartAttachment {
    return this.props.part;
  }

  get isImage(): boolean {
    return this.part.mimeType.startsWith('image/');
  }

  get sizeLabel(): string {
    const size = this.part.size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  get typeLabel(): string {
    return this.part.mimeType.split('/').pop() ?? 'file';
  }

  get imageStyle(): Record<string, string> {
    if (!this.part.width || !this.part.height) return {};
    return { aspectRatio: `${this.part.width} / ${this.part.height}` };
  }
}

export namespace PartAttachment {
  export const $Class = $PartAttachment;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
