import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { Kit } from '../../../../../kit/Kit';
import { KitContainer } from '../../../../../kit/KitContainer';
import { ToolCallCodeBlock } from './ToolCall.CodeBlock';
import ToolCallCodeBlockView from './ToolCall.CodeBlock.vue';
import ToolCallSectionTitleView from './ToolCall.Section.Title.vue';
import ToolCallSectionImageView from './ToolCall.Section.Image.vue';
import ToolCallSectionNoteView from './ToolCall.Section.Note.vue';
import type { ToolCall } from './ToolCall';

// One block of an expanded card: its title line, the code block, the image
// a result carried, and the note that stands in for an empty block — four
// roles in an order, each
// deciding its own presence. The list hands a section its data and the
// card's cap; the section owns what its leaves read.
class $ToolCallSection extends KitContainer.$Class<ToolCallSection.Roles> {
  static override get $kit(): ToolCallSection.Roles {
    return {
      Title: { view: ToolCallSectionTitleView },
      Block: { view: ToolCallCodeBlockView, namespace: ToolCallCodeBlock, bind: this.bindBlock },
      Image: { view: ToolCallSectionImageView },
      Note: { view: ToolCallSectionNoteView },
      order: ['Title', 'Block', 'Image', 'Note']
    };
  }

  /** what the block receives: the section's code and its face, and the card's cap */
  static bindBlock({ model }: Kit.Seam<$ToolCallSection>): ToolCallCodeBlock.Props {
    return {
      code: model.code,
      lang: model.lang,
      cap: model.cap,
      tone: model.tone,
      startLine: model.startLine,
      wrap: model.wrap
    };
  }

  constructor(public props: ToolCallSection.Props) {
    super();
  }

  protected override get self() {
    return this.constructor as typeof $ToolCallSection;
  }

  get section(): ToolCall.Section {
    return this.props.section;
  }

  get cap(): number | null {
    return this.props.cap;
  }

  get title(): string {
    return this.section.title;
  }

  /** a file path sets in its own face, never uppercased */
  get isPath(): boolean {
    return this.section.pathTitle === true;
  }

  get tags(): ToolCall.Tag[] {
    return this.section.tags ?? [];
  }

  get code(): string {
    return this.section.code;
  }

  get lang(): string {
    return this.section.lang;
  }

  get tone(): ToolCall.Section['tone'] {
    return this.section.tone;
  }

  get startLine(): number | undefined {
    return this.section.startLine;
  }

  /** long lines wrap unless the section says not to — code and diffs */
  get wrap(): boolean {
    return this.section.wrap ?? true;
  }

  get image(): string {
    return this.section.image ?? '';
  }

  get hasImage(): boolean {
    return this.image !== '';
  }

  get hasNote(): boolean {
    return this.code === '' && !this.hasImage && Boolean(this.section.note);
  }

  get note(): string {
    return this.section.note ?? '';
  }
}

export namespace ToolCallSection {
  export const $Class = Static($ToolCallSection);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    section: ToolCall.Section;
    cap: number | null;
    kit?: Kit.Entry;
  }

  /** what every leaf of a section receives: its entry and the section model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }

  export type Role = 'Title' | 'Block' | 'Image' | 'Note';
  export type Roles = Kit.Roles<'Title' | 'Image' | 'Note', $ToolCallSection> & {
    Block: Kit.Entry<$ToolCallSection, undefined, typeof ToolCallCodeBlock>;
    order: readonly Role[];
  };
}
