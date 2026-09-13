import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { Kit } from '../../../../../kit/Kit';
import { KitContainer } from '../../../../../kit/KitContainer';
import { ToolCallCodeBlock } from './ToolCall.CodeBlock';
import ToolCallCodeBlockView from './ToolCall.CodeBlock.vue';
import type { ToolCall } from './ToolCall';

// The blocks of an expanded card as a list: every section renders through
// the one code-block role, fed the section as the seam's item and the
// card's cap. The card hands the list its sections and whether it is open;
// the list owns what identifies a block.
class $ToolCallSections extends KitContainer.$Class<ToolCallSections.Roles, ToolCall.Section> {
  static override get $kit(): ToolCallSections.Roles {
    return {
      CodeBlock: { view: ToolCallCodeBlockView, namespace: ToolCallCodeBlock, bind: this.bindBlock }
    };
  }

  /** what a block receives: the section's code and its face, and the card's cap */
  static bindBlock({
    model,
    item
  }: Kit.Seam<
    $ToolCallSections,
    ToolCall.Section,
    typeof ToolCallCodeBlock
  >): ToolCallCodeBlock.Props {
    return {
      code: item.code,
      lang: item.lang,
      cap: model.cap,
      tone: item.tone,
      startLine: item.startLine,
      wrap: item.wrap ?? true
    };
  }

  constructor(public props: ToolCallSections.Props) {
    super();
  }

  protected override get self() {
    return this.constructor as typeof $ToolCallSections;
  }

  get sections(): ToolCall.Section[] {
    return this.props.sections;
  }

  get cap(): number | null {
    return this.props.cap;
  }

  get isExpanded(): boolean {
    return this.props.expanded;
  }

  /** a block is identified by its place and its title — titles repeat across cards, never within one place */
  override keyOf(section: ToolCall.Section, at: number): string {
    return `${at}:${section.title}`;
  }
}

export namespace ToolCallSections {
  export const $Class = Static($ToolCallSections);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    sections: ToolCall.Section[];
    cap: number | null;
    expanded: boolean;
    kit?: Kit.Entry;
  }

  export type Roles = {
    CodeBlock: Kit.Entry<$ToolCallSections, ToolCall.Section, typeof ToolCallCodeBlock>;
  };
}
