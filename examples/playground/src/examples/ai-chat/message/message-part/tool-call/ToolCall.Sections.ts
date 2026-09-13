import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { Kit } from '../../../../../kit/Kit';
import { KitContainer } from '../../../../../kit/KitContainer';
import { ToolCallSection } from './ToolCall.Section';
import ToolCallSectionView from './ToolCall.Section.vue';
import type { ToolCall } from './ToolCall';

// The blocks of an expanded card as a list: every section renders through
// the one Section role — a compositor of its own — fed the section as the
// seam's item and the card's cap. The card hands the list its sections and
// whether it is open; the list owns what identifies a section.
class $ToolCallSections extends KitContainer.$Class<ToolCallSections.Roles, ToolCall.Section> {
  static override get $kit(): ToolCallSections.Roles {
    return {
      Section: { view: ToolCallSectionView, namespace: ToolCallSection, bind: this.bindSection }
    };
  }

  /** what a section receives: its data and the card's cap */
  static bindSection({
    model,
    item
  }: Kit.Seam<$ToolCallSections, ToolCall.Section>): ToolCallSection.Props {
    return { section: item, cap: model.cap };
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

  /** a section is identified by its place and its title — titles repeat across cards, never within one place */
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
    Section: Kit.Entry<$ToolCallSections, ToolCall.Section, typeof ToolCallSection>;
  };
}
